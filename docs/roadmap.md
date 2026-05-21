# AgentHub Roadmap

## 1. 已完成

### 文档与协作资产

- Spec / Skill / Rules / Collaboration 文档体系
- `development-workflow.md`
- `prompt-template.md`
- `dev-log.md`
- `demo-checklist.md`
- `decision-log.md`

### 前后端基础工程

- React + Vite 前端工程
- Spring Boot 后端工程
- 核心领域模型
- 内存 Repository
- 基础 REST API

### 产品主链路

- 三栏 IM Workspace
- Conversation List
- Agent List
- Message Stream
- ChatInput
- TaskRunPanel
- ContextPanel
- ArtifactPanel

### 协作与执行链路

- 静态 demo-task
- TaskSpec / TaskRun / TaskStep
- ContextSnapshot / HandoffSummary
- Artifact Preview
- Artifact Revision
- Version History
- Diff Summary
- Agent Adapter Layer placeholder / Mock fallback
- Agent Builder 最小闭环
- selectedAgent
- `Message.targetAgentId`
- 最小 `@Agent` 文本解析
- `targetAgentId -> selectedAgent` 推断链路

## 2. 当前阶段

当前已进入**收敛式开发阶段**。

当前阶段目标：

- 课题要求对齐
- README / 产品设计 / 技术设计 / Demo 场景文档同步
- 演示主线收敛
- 补齐最关键硬缺口

当前阶段原则：

- 不再大范围扩功能
- 只补对评分和演示最关键的能力
- 先保证 Demo 稳定，再继续增强真实性

## 3. 下一阶段优先级

### 1. Agent Adapter 半真实接入 / 最小真实模型调用

原因：

- 这是课题硬要求缺口
- 当前 placeholder 不能算真实接入

预期产出：

- 至少两个主流平台中的一个或两个具备最小真实/半真实接入

### 2. OrchestratorService 规则化增强

原因：

- 当前 Orchestrator 仍偏静态 Demo
- 需要更可解释的规则化 planning

预期产出：

- 更清晰的 step planning / routing 逻辑

### 3. 静态 Deploy Status Card

原因：

- 展示力高
- 成本可控

预期产出：

- Deploy Status Card 静态版
- preview URL / build / publish 状态展示

### 4. Demo 视频脚本和录制

原因：

- 当前主线已经足够开始准备录屏

预期产出：

- 3 分钟稳定脚本
- 录屏版本 Demo

### 5. 最终文档 V1.0

原因：

- 交付物要求明确
- 文档必须与代码完全一致

预期产出：

- README V1.0
- 产品设计文档 V1.0
- 技术文档 V1.0
- Demo 场景文档 V1.0

### 6. 自动化启动 / smoke test 脚本

原因：

- 降低演示风险

预期产出：

- 一键启动说明
- smoke test 清单或脚本

## 4. 暂停或后置

以下内容当前建议后置：

- MySQL
- WebSocket / SSE
- 多端真实实现
- 多人协作
- 复杂自然语言 `@Agent`
- 完整群聊调度

后置原因：

- 对当前阶段评分收益不如前几项高
- 会明显增加开发范围和演示不稳定性

## 5. 当前阶段结论

当前 AgentHub 已具备：

- 可运行 Web Demo
- 可见多 Agent 协作结构
- 可解释的 Task / Context / Artifact / Adapter 链路
- 可展示的 Artifact-centered iteration
- 可追踪的 AI 协作开发记录

但在最终提交前仍需要优先补齐：

- 至少两个主流平台的最小真实/半真实接入
- 更规则化的 Orchestrator
- Deploy Status Card
- 文档 V1.0 与视频交付物
