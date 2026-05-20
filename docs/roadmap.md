# AgentHub Roadmap

## 1. Roadmap 说明

本 Roadmap 面向 V0.1 文档与协作资产初始化阶段，用于明确：

- 已完成什么
- 当前阶段在做什么
- 下一阶段做什么
- 各阶段目标、任务、输出物、验收标准

## 2. 阶段总览

| Phase | 名称 | 状态 |
|---|---|---|
| Phase 1 | 项目初始化与范围冻结 | 已完成 |
| Phase 2 | IM 工作台与前端骨架 | 当前阶段 |
| Phase 3 | 后端基础模块 | 下一阶段 |
| Phase 4 | Orchestrator 与多 Agent 协作 | 计划中 |
| Phase 5 | Context 与 Artifact 流程 | 计划中 |
| Phase 6 | AI 协作资产沉淀 | 计划中 |
| Phase 7 | Demo 稳定与比赛提交 | 计划中 |

## 3. 各阶段说明

## Phase 1：项目初始化与范围冻结

### 目标

- 确定 AgentHub 的定位
- 冻结 P0 / P1 / P2 范围
- 建立 docs 结构和文档体系

### 任务

- 梳理比赛需求
- 确定主仓为 `AgentHub`
- 建立 Spec / Skill / Rules / Collaboration 文档结构
- 明确 Demo 方向

### 输出物

- competition-plan.md
- product-design.md
- technical-design.md
- demo-scenario.md
- roadmap.md
- docs 下各协作资产文档

### 验收标准

- 文档结构完整
- 产品边界清晰
- 主链路清晰
- 后续开发顺序明确

## Phase 2：IM 工作台与前端骨架

### 目标

- 确立聊天作为唯一主入口
- 建立基础前端结构

### 任务

- 搭建会话列表
- 搭建消息流
- 搭建输入区
- 搭建右侧 Artifact Panel 占位
- 定义前端状态结构

### 输出物

- 前端页面骨架
- 基础路由
- 基础 UI 模块

### 验收标准

- 用户可以进入聊天页面
- 可以看到 Conversation List 和 Message Stream
- 可以展示静态 Task Spec 卡片和 Artifact 卡片

## Phase 3：后端基础模块

### 目标

- 建立后端最小模型和接口骨架

### 任务

- 定义 Conversation / Message / Agent / Artifact 实体
- 搭建基本 API
- 搭建 TaskSpec / TaskRun / TaskStep 的最小结构

### 输出物

- API 草案落地为基础接口
- 基础服务模块结构
- 简单状态流转

### 验收标准

- 可以创建 Conversation
- 可以提交 Message
- 可以返回静态 Task Spec 和 TaskRun 数据

## Phase 4：Orchestrator 与多 Agent 协作

### 目标

- 打通任务拆解与 Agent 分工

### 任务

- 实现 Task Spec 生成
- 实现 TaskPlan 生成
- 实现 Routing Rules
- 实现薄 Adapter
- 实现多步骤 TaskRun

### 输出物

- Orchestrator 初版
- Agent Router
- Agent Executor
- 至少 2 个 Adapter 设计或最小接入能力

### 验收标准

- 一个复杂任务可以拆成多个 TaskStep
- 每个 TaskStep 能分配给明确 Agent
- 最终能聚合结果

## Phase 5：Context 与 Artifact 流程

### 目标

- 打通上下文交接与产物预览链路

### 任务

- 实现 Pinned Context
- 实现 Handoff Summary
- 实现 ContextSnapshot
- 实现 Code / Markdown / File / Web Preview Artifact

### 输出物

- Context Manager 初版
- Artifact Service 初版
- Handoff 可视化结构

### 验收标准

- 上一个 Agent 的 Artifact 可以传给下一个 Agent
- 右侧面板能展示核心产物
- 二次修改能基于已有 Artifact 进行

## Phase 6：AI 协作资产沉淀

### 目标

- 让比赛最看重的“AI 协作能力”显式化

### 任务

- 完善真实 Task Spec
- 完善 Frontend Builder / Backend Worker / Reviewer Skill
- 完善 Global / Routing / Handoff Rules
- 完善 Collaboration Protocol 和 State Machine

### 输出物

- 可提交的 AI 协作开发记录基础文档
- 可在 Demo 中展示的协作资产

### 验收标准

- 所有关键流程都能对应到文档资产
- 评委能看见 Spec / Skill / Rules 如何驱动产品

## Phase 7：Demo 稳定与比赛提交

### 目标

- 锁定 Demo 路径并完成提交材料

### 任务

- 固定一个稳定场景
- 做一次完整彩排
- 撰写产品文档和技术文档终稿
- 整理 AI 协作开发记录
- 录制 3 分钟 Demo 视频

### 输出物

- Runnable Demo
- 提交文档
- Demo 视频

### 验收标准

- Demo 不依赖临场解释补漏洞
- 全部交付物在截止前完成

## 4. 当前状态

### 已完成

- 比赛需求整理
- 主仓和产品策略确定
- docs 目录搭建
- V0.1 文档体系初始化

### 当前阶段

- 补全文档与协作资产
- 固化 Demo 场景
- 明确技术设计与模块边界

### 下一阶段

- 实际搭建前端骨架
- 搭建基础后端模块
- 开始实现聊天主链路

## 5. 风险点

### 风险 1：范围膨胀

如果同时做多端、部署、Diff、知识库深度集成，MVP 会失控。

### 风险 2：平台接入过深

如果前期就追求复杂 Agent 平台对齐，会拖慢核心产品链路。

### 风险 3：文档和产品脱节

如果 Spec / Skill / Rules 只是写在 docs 里，没有进入产品流程，则比赛核心分拿不到。

### 风险 4：Demo 不稳定

如果依赖真实复杂外部环境，现场演示风险会变高。

## 6. 下一步建议

1. 确认前后端技术栈
2. 搭建聊天工作台骨架
3. 定义核心实体的数据结构
4. 为 Demo 场景实现第一条 TaskRun 链路
5. 把 Spec / Skill / Rules 映射到实际前后端对象
