# Productionization Plan

本计划记录 AgentHub 向半生产 / 生产化骨架推进的工程事项。

## 当前状态

- `Done` 文件附件真实上传 / 下载基础。
- `Done` AttachmentRecord 生产化字段：
  - checksumSha256
  - visibility
  - ownerUserId
  - storageKey
  - scanStatus
  - deletedAt
- `Done` AttachmentAccessGuard。
- `Done` AttachmentScanService no-op 默认实现。
- `Done` AttachmentCleanupService 接口。
- `Done` ApprovalRequest 和后端强制审批。
- `Done` ActionAuditLog。
- `Done` Adapter Quality Metrics 本地文件聚合。
- `Done` smoke / sse smoke / real-adapter smoke / jdbc smoke / browser e2e 脚本入口。
- `Done` `.gitignore` 覆盖常见 build cache。
- `Done` `AGENTS.md` 项目级 Agent 操作说明。

## 活跃计划

### P0：仓库卫生

- 不提交 API key。
- 不提交构建缓存。
- 不提交临时 smoke 输出。
- 所有真实 provider 验证只通过环境变量配置。
- 文档与代码能力同步，避免 dev-log 与 roadmap 脱节。

### P0：验证矩阵

每轮功能开发后按影响范围选择：

- Backend build：`cd backend && mvn -q -DskipTests package`
- Frontend build：`cd frontend && npm run build`
- API smoke：`node scripts/smoke-test.mjs`
- SSE smoke：`node scripts/sse-smoke-test.mjs`
- Real adapter smoke：`node scripts/real-adapter-smoke-test.mjs`
- JDBC smoke：`node scripts/jdbc-smoke-test.mjs`
- Browser E2E：`node scripts/e2e-browser.mjs`

### P1：生产化增强

- Attachment cleanup 调度。
- 真正 scan adapter。
- Adapter metrics 迁移到 JDBC。
- E2E 覆盖更多 approval / restore / rejection / attachment 场景。
- Context retrieval backend 可插拔实现。

## 暂缓

- 企业级 RBAC。
- 多租户。
- 真实杀毒引擎。
- 分布式 trace / APM。
- CI/CD 全量 pipeline。

## 边界

当前目标是生产化骨架和可验证工程边界，不是完整企业级平台。默认本地环境必须保持 memory + mock/static fallback 可运行。
