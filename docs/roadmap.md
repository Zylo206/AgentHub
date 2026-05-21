# AgentHub Roadmap V0.5

## 1. 已完成

### 文档与资产

- 文档目录结构建立
- Spec / Skill / Rules / Collaboration 基础文档建立
- V0.5 文档同步版准备

### 前后端骨架

- 前端 React + Vite 工程
- 后端 Spring Boot 工程
- 核心领域模型
- 内存 Repository
- 基础 REST API

### 产品主链路

- 三栏 IM 工作台
- Conversation List
- Agent List
- Message Stream
- ChatInput
- TaskRunPanel
- ContextPanel
- ArtifactPanel

### 协作链路

- 静态 demo-task
- TaskSpec / TaskRun / TaskStep 展示
- ContextSnapshot / HandoffSummary
- Artifact Revision
- Version History
- Diff Summary
- Agent Adapter Layer placeholder / Mock fallback
- Agent Builder 最小闭环

## 2. 当前阶段

当前阶段目标：

- 完成 V0.5 文档同步
- 校准 README / 产品设计 / 技术设计 / Demo 场景 / Roadmap
- 保持当前 Web Demo 稳定
- 保证“已完成”和“未完成”口径与代码一致

当前阶段重点：

- 不再继续堆功能
- 优先统一文档、代码、演示话术
- 为 3 分钟 Demo 形成稳定主线

## 3. 下一阶段

按优先级建议如下：

### 1. Selected Agent / @Agent 最小执行链路

- 在 Workspace 中增加最小 Agent 指定能力
- 让用户创建的自定义 Agent 能被选中或参与一次可见执行

### 2. OrchestratorService 继续加强

- 减少静态编排逻辑散落
- 把 demo-task / revision 的编排组织得更清晰
- 为后续真实路由和真实执行做准备

### 3. 自定义 Agent preferredAdapter 接入执行链路

- 让 Custom Agent 的 `preferredAdapterType` 真正影响 TaskStep 执行
- 形成“创建 Agent -> 选中 Agent -> 执行 step”的最小闭环

### 4. 至少两个 Agent 平台的最小真实 / 半真实接入

- 保留稳定 fallback
- 但至少让两个主流平台中的一个或两个具备更真实的接入路径

### 5. SSE / WebSocket 流式状态

- TaskRun 状态更新
- Message 流式输出
- Adapter 执行状态可视化

### 6. Deploy Status Card 静态展示

- 先做静态部署状态卡片
- 后续再接真实部署链路

### 7. MySQL 持久化

- 从内存 Repository 迁移到 MyBatis + MySQL
- 保留当前 API 结构不变

### 8. 最终文档 V1.0 和 3 分钟 Demo 视频

- 最终产品设计文档
- 最终技术文档
- 最终 AI 协作开发记录
- 最终录屏脚本和视频

## 4. 风险点

### 风险 1：静态 Demo 被误解为真实接入

缓解：

- 文档中持续明确标注 placeholder / fallback / static demo
- 演示时主动说明边界

### 风险 2：硬要求未完成项过多

缓解：

- 优先补最小 `@Agent`
- 优先补最小真实/半真实 provider 接入
- 优先补流式状态而不是扩散功能面

### 风险 3：文档、代码、演示口径不一致

缓解：

- 每个阶段先同步文档，再扩能力
- 所有对外材料以当前仓库代码为准

## 5. 当前阶段结论

当前 AgentHub 已经具备：

- 可运行 Web Demo
- 可展示的多 Agent 协作结构
- 可解释的 Task / Context / Artifact / Adapter 关系
- 可演示的 Artifact 二次修改链路
- 可保存的自定义 Agent 最小闭环

但距离赛题完整硬要求，仍需继续补：

- 最小 `@Agent`
- 至少两个主流平台的更真实接入
- 流式执行
- 持久化
- P2 部署与多端说明
