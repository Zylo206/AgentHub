# Deployment Publish Spec

## 目标

定义 AgentHub 当前部署发布能力的稳定规则：用户可以从聊天消息触发本地静态预览部署，经过 Approval Gate 后生成 Deploy Status Message、Preview URL，并可下载 Artifact Bundle。

## 范围

- 聊天中识别“部署 / 发布 / 生成预览 / preview url / open preview”意图。
- MessageStream 展示 Deploy 确认卡。
- Deploy 必须复用后端 ApprovalRequest。
- Deploy 成功后生成 DeploymentRecord、DEPLOY_STATUS 消息、ActionAuditLog、ArtifactSnapshot。
- 支持 Artifact Bundle zip 下载。
- `/preview/:artifactId` 继续作为本地静态预览页面。

## 非目标

- 不做真实 Vercel / Netlify / Docker / Kubernetes 部署。
- 不做公网发布、域名绑定、CI/CD、容器镜像构建。
- 不打包真实工作区源码目录、依赖目录或构建产物。
- 不绕过 Approval Gate。

## Current behavior

- ArtifactPanel 已有手动 Deploy Preview 入口。
- Backend `POST /api/artifacts/{artifactId}/demo-deploy` 已强制校验 `approvalId`。
- Deploy 成功后会追加 `DEPLOY_STATUS` 消息。
- Deploy 成功后会生成本地 `/preview/:artifactId` URL。
- Deploy 操作会写入 ActionAuditLog，并在部署前创建 ArtifactSnapshot。
- 新增聊天部署入口后，用户可发送部署类消息，并在消息卡中确认生成 Preview URL。
- 新增 Artifact Bundle 下载后，用户可下载一个 zip，内容来自 AgentHub Artifact，而不是本机源码目录。

## 核心模型

### DeployIntentDraft

- `messageId`
- `status`: `PENDING | APPROVAL_REQUIRED | DEPLOYING | COMPLETED | CANCELLED | FAILED`
- `artifactId`
- `approvalId`
- `errorMessage`

### DeploymentRecord

- `deploymentId`
- `artifactId`
- `conversationId`
- `taskRunId`
- `artifactTitle`
- `deployTarget = STATIC_PREVIEW`
- `status`
- `previewUrl`
- `message`
- `createdAt`

### Artifact Bundle

- 输入：`conversationId`、可选 `artifactIds`、`includeRelated`。
- 输出：`application/zip`。
- 文件名：`agenthub-artifacts-{conversationId}.zip`。
- 内容：选中 Artifact，以及同 TaskRun / revision lineage 的相关 Artifact。

## 关键流程

1. 用户发送“部署当前产物并生成预览 URL”。
2. Workspace 识别 deploy intent。
3. MessageStream 展示 Deploy 确认卡。
4. 默认目标 Artifact 使用当前选中 Artifact；否则选择最新非 rejected Artifact。
5. 用户点击确认后，前端创建 `DEMO_DEPLOY / ARTIFACT` ApprovalRequest。
6. 用户在消息卡中审批并生成预览。
7. 前端调用 `POST /api/artifacts/{artifactId}/demo-deploy` 并传入 `approvalId`。
8. 后端校验 approval，生成 DeploymentRecord、Snapshot、Audit 和 DEPLOY_STATUS 消息。
9. 用户可打开 `/preview/:artifactId`。
10. 用户可通过 ArtifactPanel 或 Deploy Status 卡下载 Artifact Bundle。

## Public API

- `POST /api/artifacts/{artifactId}/demo-deploy`
- `GET /api/conversations/{conversationId}/deployments`
- `GET /api/artifacts/{artifactId}/deployments`
- `GET /api/deployments/{deploymentId}`
- `GET /api/conversations/{conversationId}/artifact-bundle/download?artifactIds=&includeRelated=`

## 验收标准

- 缺少 approvalId 调用 demo deploy 必须被后端拒绝。
- 聊天部署消息必须出现 Deploy 确认卡。
- Deploy 确认卡必须说明本地静态预览边界。
- 成功部署后 MessageStream 必须出现 DEPLOY_STATUS 消息。
- Preview URL 必须能打开 `/preview/:artifactId`。
- Artifact Bundle 下载必须返回非空 zip，且 `Content-Type` 为 `application/zip`。
- Browser E2E 优先验证聊天触发部署路径，而不是只点 ArtifactPanel 调试按钮。

## Fallback / Boundary

- 当前 Deploy 是本地静态 Preview，不是真实云部署。
- Artifact Bundle 是 Artifact 内容包，不是完整源码仓库包。
- 如果没有可部署 Artifact，Deploy 确认卡必须显示失败原因。
- 如果 Approval 被取消，Deploy 不执行。
- 外部部署平台、容器化部署、源码工程级打包下载后置。
