# AgentHub Decision Log V0.5

## 决策 1：主入口选择 IM Workspace，而不是 Workflow Canvas

### 背景

比赛课题强调 IM 聊天为核心交互范式，并要求平台看起来像飞书 / 微信式协作工作台。

### 选择

将 `/workspace` 的三栏 IM 工作台作为当前产品主入口，而不是先做 Workflow Canvas。

### 原因

- 更贴合赛题要求
- 更适合 3 分钟 Demo 展示
- 更容易把 Task、Context、Artifact 串到一个连续界面里

### 影响

- 当前产品路径清晰
- Workflow Canvas 不作为 MVP 主入口

### 后续计划

- 如有时间，可把更复杂编排能力放到后续扩展层，而不是替代聊天主入口

## 决策 2：先做静态 demo-task，而不是先接真实 Agent

### 背景

一开始真实接 Codex / Claude Code / OpenCode 会带来不稳定依赖、权限和 provider 复杂度。

### 选择

先做静态 demo-task 主链路，保证：

- TaskSpec
- TaskRun / TaskStep
- Artifact
- Context / Handoff

先整体成立。

### 原因

- 比赛原型更需要稳定演示链路
- 先证明协作结构成立，再逐步增强真实性

### 影响

- 当前 Demo 稳定
- 但必须持续标注“这是 static demo”

### 后续计划

- 在稳定链路基础上逐步替换成更真实的 Adapter 执行

## 决策 3：先用内存 Repository，而不是 MySQL

### 背景

当前阶段优先目标是跑通链路和形成 Demo，而不是先做持久化系统。

### 选择

先使用 InMemory Repository，后续再迁移到 MyBatis + MySQL。

### 原因

- 开发速度快
- 联调简单
- 适合单机 Demo

### 影响

- 当前刷新进程后数据会丢失
- 不适合真实多用户和长期演示环境

### 后续计划

- 在 API 结构不变前提下替换为 MyBatis + MySQL

## 决策 4：先做 MockAdapter 和 placeholder Adapter

### 背景

赛题要求统一 Adapter 层，并要求至少两个主流平台方向，但当前真实 provider 接入尚未完成。

### 选择

先实现：

- MockAgentAdapter
- Codex placeholder
- Claude Code placeholder
- fallback -> MOCK

### 原因

- 先把 Adapter Layer 抽象结构立住
- 先让 preferred / actual / fallback 在 UI 中可见

### 影响

- 当前能展示统一 Adapter Layer 设计
- 但不能宣称真实 provider 已接通

### 后续计划

- 逐步让两个主流平台至少形成最小真实或半真实接入

## 决策 5：优先做 Artifact-centered iteration

### 背景

赛题不只是看聊天，而是看用户是否能围绕代码、文档、页面等产物持续推进任务。

### 选择

将 Artifact revision、Version History、Diff Summary 作为当前产品主线的一部分。

### 原因

- 这是 AgentHub 与普通聊天产品最大的差异点
- 能显著提升产品感和演示说服力

### 影响

- 当前 Demo 的重点从“问答”转为“产物迭代”

### 后续计划

- 后续继续补局部修改、真实 diff、更多版本链能力

## 决策 6：Version History / Diff Summary 先做轻量版

### 背景

真实 diff 和版本图谱实现成本高，而当前阶段更需要“看得懂的版本演进展示”。

### 选择

先做前端轻量 Version History 和静态 Diff Summary。

### 原因

- 足以支撑当前比赛 Demo
- 能明确说明 revision 链路

### 影响

- 当前已具备版本演进可视化
- 但仍需明确它不是“真实代码 diff”

### 后续计划

- 后续再逐步引入更真实的版本比对和 lineage 服务

## 决策 7：用户自建 Agent 先做最小保存闭环

### 背景

赛题要求支持用户自建 Agent，但一次性做完整 Agent 管理和执行接入风险过高。

### 选择

先实现最小保存闭环：

- 创建 Agent
- 保存到内存 Repository
- 在 Workspace Agent List 中可见

### 原因

- 先满足“自建 Agent 可见、可说明”的产品要求
- 保持开发范围可控

### 影响

- 当前已经形成配置闭环
- 但执行闭环尚未完成

### 后续计划

- 让 Custom Agent 的 preferredAdapterType 真正进入执行路径
- 再补最小 Selected Agent / `@Agent`

## 决策 8：多端支持和部署发布放到 P2

### 背景

赛题里多端和部署发布是加分项，但当前 MVP 先要保证主链路可运行、可演示。

### 选择

将以下内容放到 P2：

- 多端支持
- 多人协作
- 部署发布
- Deploy Status Card

### 原因

- 当前阶段主线是 IM Workspace + 多 Agent 协作 + Artifact iteration
- P2 过早介入会破坏稳定性

### 影响

- 当前产品聚焦明确
- 但后续提交前仍需至少有设计说明或静态展示方案

### 后续计划

- 先补 Deploy Status Card 静态展示
- 再视时间决定是否补真实部署链路

## 决策 9：必须明确区分 mock / placeholder / real integration

### 背景

比赛答辩时，最容易被质疑的是把演示能力说成真实能力。

### 选择

在代码、文档、演示口径中明确区分：

- static demo
- MockAdapter
- placeholder adapter
- real integration

### 原因

- 保证项目表达真实可信
- 避免评审追问时口径崩溃

### 影响

- 当前文档和 Demo 都必须主动说明边界

### 后续计划

- 继续保持这条纪律，直到真实 provider 接入完成
