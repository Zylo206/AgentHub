# AgentHub 产品文档 v1.5

## 1. 产品概述

AgentHub 是一个以 IM 为主交互路径的多 Agent 协作平台 v1.5。用户不需要先理解复杂工作流，只需要像使用即时通讯工具一样创建会话、选择 Agent、发送任务消息，就可以触发多 Agent 协作、生成产物、查看审阅意见，并在统一工作台中完成修改、审批、恢复和预览。

v1.5 的产品目标不是做“大而全”的 AI 平台，而是先把一条稳定、可解释、可验收的协作主路径做扎实：

- 聊天发起任务
- 多 Agent 分工协作
- 生成结构化产物
- 对产物继续迭代
- 对高风险操作做审批与审计
- 用本地预览闭环验证结果

## 2. 产品定位

### 2.1 一句话定位

`一个面向演示、答辩和 AI 工程协作场景的 IM-first 多 Agent 协作产品化原型`

### 2.2 不是什么

- 不是单纯的 Chatbot UI
- 不是完整 IDE
- 不是默认依赖真实大模型的生产平台
- 不是完整企业 IM 或权限系统
- 不是云部署平台

## 3. 目标用户

### 3.1 课程答辩与项目评审方

关注点：

- 是否真正体现“多 Agent 协作”
- 是否有从消息到产物的完整闭环
- 是否有工程化验证和边界说明

### 3.2 AI 工程产品原型体验者

关注点：

- 能否通过自然聊天发起任务
- 能否看到不同 Agent 的分工
- 能否看到产物、审阅、修订和预览

### 3.3 开发者与产品协作者

关注点：

- 能否创建自定义 Agent
- 能否通过上下文、记忆、附件、历史产物继续协作
- 能否安全地处理 Apply、Restore、Deploy 等高风险操作

## 4. v1.5 产品目标

### 4.1 已达成目标

- 形成 IM 主工作台
- 形成单 Agent / 多 Agent 协作路径
- 形成 Artifact 工作台
- 形成审批、审计和本地预览闭环
- 形成自动化验收体系

### 4.2 当前不追求目标

- 移动端
- 默认桌面运行时
- 真实云部署
- 多节点事件总线
- 全量企业权限体系
- 完整在线代码编辑器

## 5. 核心功能清单

## 5.1 Workspace

Workspace 是产品的核心界面，采用三栏结构：

- 左栏：会话列表、Agent 列表
- 中栏：消息流、输入框、运行解释
- 右栏：Artifact 工作台

核心价值：

- 把协作起点统一到聊天路径
- 让运行状态、上下文和产物在一个地方收口

## 5.2 会话管理

支持：

- 创建会话
- 搜索会话
- 置顶 / 取消置顶
- 归档 / 恢复
- 已读 / 未读状态
- 单聊 / 群聊模式区分

## 5.3 Agent 体系

支持两类 Agent：

- 内置 Agent
  - Orchestrator
  - Frontend Specialist
  - Backend Specialist
  - Reviewer
- 自定义 Agent
  - 名称
  - System Prompt
  - 能力标签
  - 工具能力
  - 首选适配器

用户可以通过：

- 左侧选中 Agent
- 消息开头 `@AgentName`
- 多个 `@AgentName`

来影响协作路径。

## 5.4 多 Agent 协作

产品中的“多 Agent”不是简单地显示多个头像，而是具备明确分工和解释能力：

- 任务规划
- Agent 路由
- 执行步骤
- 结果聚合
- 协议消息展示

用户可见的协议类型包括：

- `TASK`
- `RESULT`
- `REVIEW`
- `APPROVAL`
- `REJECTION`
- `ERROR`

## 5.5 Context / Memory / Attachment

支持：

- 固定消息到上下文
- 保存消息为长期记忆
- 上传附件
- 在后续运行中检索最近消息、记忆、附件、历史产物和 TaskRun 摘要

产品价值：

- 让协作不是“一次性回答”
- 让后续任务具备上下文连续性

## 5.6 Artifact 工作台

Artifact 是 AgentHub 的核心差异化能力。

支持：

- 查看代码、文档、评审报告、接口契约等产物
- 发起 Revision
- 查看版本历史
- 查看 Diff Summary
- Apply Diff
- Force Apply
- Snapshot
- Restore
- Deploy Preview

## 5.7 Approval / Audit

高风险操作必须经过审批：

- Apply Diff
- Force Apply
- Restore
- Deploy

并生成审计记录，确保：

- 操作可追踪
- 风险路径可解释
- 不会把高风险修改直接静默执行

## 5.8 Deploy Preview

当前产品支持本地静态预览：

- 生成 Deploy Status Card
- 生成 Preview URL
- 打开 `/preview/:artifactId`

产品边界：

- 这是本地静态预览
- 不是公网云部署

## 5.9 Desktop 可选壳

桌面壳作为扩展能力存在，提供：

- 本地文件访问
- 系统通知
- CLI 健康检查
- 托管进程控制

产品定位：

- 加分项和扩展项
- 不替代 Web 主客户端

## 6. 主用户流程

## 6.1 默认协作主路径

1. 用户打开 `/workspace`
2. 创建或选择一个会话
3. 选择 Agent，或直接输入 `@Agent`
4. 发送任务消息
5. 确认协作
6. 查看多 Agent 协议消息和 TaskRun
7. 查看生成的 Artifact
8. 发起 Revision 或 Diff Apply
9. 通过 Approval Gate 执行高风险操作
10. 打开 Preview 页面查看结果

## 6.2 自定义 Agent 路径

1. 用户在 `/agents` 创建业务 Agent
2. 返回 Workspace
3. 通过 `@AgentName` 调用新 Agent
4. 观察该 Agent 进入 TaskRun

## 6.3 产物二次修改路径

1. 选中一个 Artifact
2. 输入修改意图
3. 生成 Revision
4. 查看 Diff
5. 申请审批
6. Apply 或 Force Apply
7. 继续预览、恢复或部署

## 7. 页面与信息架构

### 7.1 `/workspace`

- 主入口
- 最高优先级页面
- 必须承担从发起到交付的完整主路径

### 7.2 `/agents`

- Agent 目录
- 创建业务 Agent
- 可选本地 CLI 健康检查视图

### 7.3 `/preview/:artifactId`

- 预览结果展示页
- 明确标识为本地静态预览

### 7.4 `/desktop`

- 可选桌面能力页
- 非默认主路径

## 8. v1.5 版本完成度

| 功能域 | 完成度 | 产品判断 |
|---|---:|---|
| IM Workspace | 95% | 可作为主展示面 |
| 会话管理 | 90% | 已达到演示和验收要求 |
| 自定义 Agent | 90% | 主路径可用 |
| 多 Agent 协作 | 90% | 已形成可解释产品形态 |
| Context / Memory / Attachment | 88% | 连续协作能力已具备 |
| Artifact 工作台 | 92% | 是当前最成熟的产品能力 |
| Approval / Audit | 95% | 风险控制闭环清晰 |
| Deploy Preview | 90% | 适合演示，不可宣称真实部署 |
| Desktop 可选壳 | 85% | 适合加分展示 |
| 真实适配器 | 75% | 有入口、有边界，但不是默认能力 |
| JDBC/MySQL | 70% | 条件能力，不是默认产品体验 |

## 9. v1.5 已知边界

- 默认环境下仍以 Mock / fallback / static preview 保证稳定演示
- 真实适配器需要额外配置，不是默认能力
- 数据库持久化不是默认模式
- 桌面壳不是主客户端
- Deploy Preview 不是云部署
- 当前不是企业级多用户 IAM / SSO 产品

## 10. 本轮验收发现的产品相关问题

1. 条件 smoke 脚本的认证前置不一致，导致 CLI 适配器和质量矩阵无法直接复用默认演示鉴权。
2. JDBC 能力虽然有实现，但默认运行模式仍是 `memory`，如果对外说明不清楚，容易被误解为已经默认持久化。
3. 默认 API smoke 对 REJECTION 闭环覆盖不完整，需要依赖 Browser E2E 或显式开关补测。

## 11. 对外展示建议

推荐的演示顺序：

1. Workspace 创建会话
2. 创建或调用自定义 Agent
3. 用多 `@Agent` 发起协作
4. 观察协议消息和 TaskRun Explain
5. 查看 Artifact
6. 做一次 Revision + Apply Diff
7. 做一次 Deploy Preview
8. 展示 Approval / Audit

推荐的话术：

- 强调“多 Agent 协作 + 可解释产物闭环”
- 强调“默认可稳定演示，不依赖真实 LLM”
- 明确“真实适配器、JDBC、Desktop 是 v1.5 的可选增强能力”

## 12. 下一阶段产品方向

1. 统一条件验收脚本体验，降低真实能力的验证门槛。
2. 在保持主路径简洁的前提下，继续提升真实适配器的完成度与质量表现。
3. 为 JDBC 模式补齐更强的产品级持久化说明和运维指引。
4. 把 Desktop 保持在“有价值但不喧宾夺主”的扩展定位。
