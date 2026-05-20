# AgentHub Roadmap

## 1. Roadmap 说明

这份 Roadmap 用于把当前 `AgentHub` 的比赛推进路径与最新课题要求对齐。它面向两个目标：

- 指导实现顺序
- 保证交付物、Demo、AI 协作资产和赛题评分点一致

当前阶段仍然以：

- Web 端优先
- 聊天主入口优先
- 多 Agent 协作主链路优先
- Artifact-centered iteration 优先

为核心原则。

## 2. 阶段总览

| Phase | 名称 | 当前状态 |
|---|---|---|
| Phase 1 | 项目初始化与范围冻结 | 已完成 |
| Phase 2 | IM 工作台与前端骨架 | 已完成 |
| Phase 3 | 后端基础模块 | 已完成 |
| Phase 4 | Orchestrator 与多 Agent 协作 | 当前阶段 |
| Phase 5 | Context 与 Artifact 流程 | 当前阶段 |
| Phase 6 | AI 协作资产沉淀 | 下一阶段 |
| Phase 7 | Demo 稳定与比赛提交 | 计划中 |

## 3. Phase 1：项目初始化与范围冻结

### 目标

- 明确 AgentHub 定位
- 对齐比赛范围
- 建立文档体系

### 任务

- 梳理课题要求
- 冻结 `P0 / P1 / P2`
- 建立 `docs/spec`、`docs/skills`、`docs/rules`、`docs/collaboration`

### 输出物

- 比赛计划文档
- 产品设计文档
- 技术设计文档
- Roadmap

### 验收标准

- 核心产品边界清晰
- 协作资产目录可用
- Demo 主线明确

## 4. Phase 2：IM 工作台与前端骨架

### 目标

- 搭建聊天工作台
- 明确三栏布局

### 任务

- 会话列表
- Agent 列表
- 消息流
- 输入区
- TaskRunPanel
- ArtifactPanel

### 输出物

- React + Vite 前端骨架
- 三栏工作台页面

### 验收标准

- 页面可进入
- 可创建会话
- 可展示消息和 Artifact

## 5. Phase 3：后端基础模块

### 目标

- 建立最小可联调的后端主链路

### 任务

- 定义核心领域模型
- 建立内存 Repository
- 建立 Application Service
- 建立基础 REST API
- 建立统一异常处理

### 输出物

- `Agent / Conversation / Message / TaskSpec / TaskRun / TaskStep / Artifact`
- 内存版主链路

### 验收标准

- 后端可创建会话
- 可发送消息
- 可生成静态 Demo Task
- 可返回 TaskRun、Artifact、Context 数据

## 6. Phase 4：Orchestrator 与多 Agent 协作

### 目标

- 让 Demo 具备“多 Agent 分工”的可见性

### 任务

- 明确 `Orchestrator` 职责
- 把任务拆解为多个 `TaskStep`
- 在 UI 中展示：
  - Frontend Builder
  - Backend Worker
  - Reviewer
- 保持至少 2 个主流 Agent 平台的统一接入设计

### 输出物

- Task Spec 生成链路
- TaskRun / TaskStep 执行链路
- Agent 分工展示

### 验收标准

- 一个复杂任务能拆成多个步骤
- 每个步骤有明确 Agent 归属
- 结果可以聚合显示

## 7. Phase 5：Context 与 Artifact 流程

### 目标

- 让系统真正体现“围绕产物持续迭代”

### 任务

- 实现 `ContextSnapshot`
- 实现 `HandoffSummary`
- 实现 TaskStep 与 Artifact 的联动
- 实现 Artifact revision 静态 Demo
- 在聊天流和右侧面板中展示版本链路

### 输出物

- ContextPanel
- HandoffSummary 展示
- Artifact version 展示
- Revision TaskRun 静态演示

### 验收标准

- 能看见哪个 Step 产出了哪个 Artifact
- 能看见 Artifact 如何从 v1 演进到 v2
- 能看见 Frontend Builder 与 Reviewer 之间的交接

## 8. Phase 6：AI 协作资产沉淀

### 目标

- 对齐评分最高的 `AI 协作能力`

### 任务

- 补强真实 `Task Spec`
- 完善 `Frontend Builder / Backend Worker / Reviewer` Skill
- 完善 `Global / Routing / Handoff Rules`
- 完善 `Collaboration Protocol`
- 确保这些资产与产品行为一致

### 输出物

- 可提交的 AI 协作开发记录
- 可在答辩中引用的规范体系

### 验收标准

- `Spec / Skill / Rules` 不只是文档说明
- 可以清楚解释它们如何驱动系统行为

## 9. Phase 7：Demo 稳定与比赛提交

### 目标

- 完成最终交付

### 任务

- 锁定稳定 Demo 主线
- 做完整彩排
- 完成产品设计文档与技术文档收口
- 整理 AI 协作开发记录
- 录制 3 分钟 Demo 视频

### 输出物

- 可运行 Demo
- 最终提交文档
- Demo 视频

### 验收标准

- 演示链路稳定
- 评委能看懂系统价值
- 所有交付物与赛题要求一致

## 10. 当前阶段判断

### 已完成

- 主仓建立
- 核心文档体系建立
- 前后端骨架建立
- 静态 demo-task 主链路
- Context / Handoff 展示
- Artifact revision 静态 Demo

### 当前阶段

- 把当前系统行为和最新课题要求完全对齐
- 打磨“多 Agent 协作 + Artifact 迭代”展示链路

### 下一阶段

- 强化 `Spec / Skill / Rules` 在界面中的可见性
- 补 deployment status card 等比赛要求里提到但当前还较弱的展示能力
- 开始准备面向答辩的 Demo 脚本

## 11. 风险点

### 风险 1：课题要求与当前实现脱节

影响：

- 文档和 Demo 讲法不一致
- 答辩时容易被问住

缓解：

- 以最新会议要求为准更新核心文档
- 所有 P0 / P1 / P2 统一口径

### 风险 2：功能很多，但主线不突出

影响：

- 评委看不清核心价值

缓解：

- 始终围绕一条主线演示：
  - 发任务
  - 拆任务
  - 多 Agent 协作
  - 生成 Artifact
  - 二次修改

### 风险 3：AI 协作资产只停留在文档

影响：

- 30% 的 AI 协作能力分拿不高

缓解：

- 在界面里显式展示：
  - Task Spec
  - Handoff Summary
  - Reviewer 检查依据
  - Artifact revision 链路

### 风险 4：P2 过早投入

影响：

- 稳定性下降
- P0 不够扎实

缓解：

- P2 仅做加分，不反客为主
- 优先保证主链路稳定

## 12. 下一步建议

按最新课题要求，接下来最值得优先推进的是：

1. 在界面里增加部署状态卡片的静态演示
2. 给 Artifact 增加更清晰的版本链路展示
3. 把 `Spec / Skill / Rules` 与当前 UI 和后端对象进一步一一对应
4. 收敛最终答辩 Demo 脚本，避免功能点散乱
