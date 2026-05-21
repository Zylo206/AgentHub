# AgentHub AI 协作开发工作流 V0.5

## 1. 工作流目标

这份文档用于固化 AgentHub 当前已经形成的 AI 协作开发方式，确保后续继续开发时：

- 范围可控
- 目标清晰
- 文档、代码、Demo 能形成闭环
- mock / placeholder / static demo 不被误写成真实能力
- 每一轮开发都能留下可审计的过程记录

本工作流既服务于实际开发，也服务于比赛中的 AI 协作能力说明。

## 2. 为什么需要稳定 AI 协作工作流

AgentHub 的比赛评分中，AI 协作能力权重最高。评审不仅看“做出了什么”，还看：

- 是否有清晰的 Spec
- 是否有可复用的 Skill
- 是否有稳定的 Rules
- 是否形成了人与 AI 的协作规范
- 仓库是否 agent-friendly

如果没有稳定工作流，就容易出现以下问题：

- 每轮开发都从头组织 prompt
- AI 输出范围失控
- 文档落后于代码
- 静态 Demo 被误写成真实能力
- 无法清晰回溯“这项能力是怎么和 AI 协作完成的”

## 3. 本项目采用的阶段推进方式

AgentHub 当前采用“先边界、再结构、后功能、最后演示”的推进方式：

1. 先整理课题要求、评分点和交付物
2. 再定义产品定位和 MVP 边界
3. 先建立 `docs/spec`、`docs/skills`、`docs/rules`、`docs/collaboration`
4. 再建立前后端工程骨架
5. 再按阶段推进功能，每次只做一个明确闭环
6. 先跑通静态 Demo，再逐步替换为更真实的能力

这种方式的核心是：

> 先让“协作结构”成立，再让“实现真实性”逐步增强。

## 4. 每轮开发的标准流程

当前建议固定采用以下循环：

```text
课题要求 / 当前状态
-> 本轮目标
-> 非目标
-> 文件范围
-> 实现
-> 构建验证
-> 手动测试
-> 输出变更清单
-> 标注静态部分
-> 决定下一步
-> commit
```

详细说明如下。

### 4.1 更新当前状态

开始每轮开发前，先明确：

- 当前仓库已经完成了什么
- 当前哪些能力仍然是 static demo / placeholder / mock
- 当前最需要推进的阶段是什么

### 4.2 明确本轮目标

本轮目标必须具备以下特征：

- 只做一个阶段
- 只解决一个清晰问题
- 最终能形成可验证的闭环

例如：

- 后端核心领域模型
- 前端三栏工作台
- Context / Handoff 展示
- Artifact Revision
- 自定义 Agent 最小闭环

### 4.3 明确非目标

每一轮都要明确“不要做什么”，防止 AI 过度发挥。

例如：

- 不接真实 LLM
- 不接真实外部平台
- 不做 WebSocket / SSE
- 不接 MySQL
- 不大规模重构
- 不删除已有文件

### 4.4 限定文件范围

在 prompt 中显式限定目标文件范围，例如：

- backend 某几个 package
- frontend 某几个组件
- docs 某几份文档

这样可以显著降低 AI 改动无关文件的概率。

### 4.5 实现功能

实现阶段强调：

- 优先跑通最小闭环
- 不追求一次做“最终版”
- 当前不能真实接的能力，先用 static demo / MockAdapter / placeholder

### 4.6 构建验证

每轮实现后都要做最小验证：

- backend：`mvn -q -DskipTests package`
- frontend：`npm run build`

如果因为环境问题失败，必须区分：

- 代码问题
- 依赖解析问题
- 网络或沙箱限制

不能把构建失败写成构建成功。

### 4.7 手动测试

每轮开发必须给出最短手动测试路径，通常包含：

- 页面入口
- 点击顺序
- 输入内容
- 预期输出

手动测试路径应尽量与 Demo 录制路径一致。

### 4.8 输出变更清单

每轮开发结束后，要求 AI 输出：

- 新增文件
- 修改文件
- 实现内容
- 构建结果
- 手动测试流程
- 当前仍未完成部分
- 下一步建议

这一步本身就是 AI 协作开发记录的一部分。

### 4.9 标注静态部分

每轮开发都必须明确写出：

- 哪些能力仍是 static demo
- 哪些是 MockAdapter
- 哪些是 placeholder
- 哪些是下一阶段能力

## 5. 人类开发者负责什么

当前工作流中，人类开发者主要负责：

- 解释课题要求
- 决定产品定位
- 收敛 MVP 边界
- 决定本轮开发优先级
- 审核 AI 的实现范围和是否跑偏
- 判断哪些能力适合保留为 static demo
- 判断何时进入真实接入阶段
- 决定什么时候提交、什么时候演示

## 6. Codex / AI Agent 负责什么

Codex / AI Agent 主要负责：

- 在给定范围内实现功能
- 补齐前后端接口和展示逻辑
- 按要求同步文档
- 给出构建结果和手动测试流程
- 明确当前未完成部分
- 给出下一步建议

Codex 不负责替代人类做最终产品取舍和比赛表达判断。

## 7. 如何控制范围

AgentHub 当前控制范围的主要方法包括：

- prompt 中显式写本次目标
- prompt 中显式写非目标
- prompt 中显式写文件范围
- prompt 中显式写限制条件
- 每轮只做一个阶段

这套方式当前已经证明有效，应继续保持。

## 8. 如何避免 AI 过度发挥

为了避免 AI 自行扩展需求，当前项目应继续遵守：

- 不让 AI 同时做多个大阶段
- 不让 AI 自行决定真实 provider 接入
- 不让 AI 自行重构整个项目结构
- 不让 AI 把 placeholder 写成已完成
- 不让 AI 自动扩展到未要求的多人协作、多端、部署系统

如果某轮开发想扩范围，必须先在 prompt 中显式改目标。

## 9. 如何处理 mock / placeholder

当前项目采用的原则是：

- 能形成稳定展示链路的地方，先用 static demo
- 外部平台统一走 Adapter Layer
- 真实 provider 未接通前，使用 placeholder + Mock fallback
- 所有 mock / placeholder 都必须显式标注

这条原则当前是正确的，必须继续保持。

## 10. 如何进行构建验证

构建验证最少应包括：

### 后端

```powershell
cd backend
mvn -q -DskipTests package
```

### 前端

```powershell
cd frontend
npm run build
```

如果环境不允许：

- 明确说明失败原因
- 判断是否为代码问题
- 不得伪造成功

## 11. 如何进行手动测试

当前推荐的手动测试方式是围绕主 Demo 路径：

1. 打开 `/workspace`
2. Create Demo Conversation
3. Send Message
4. Run Demo Task
5. 查看 TaskRun / TaskStep
6. 查看 Adapter 信息
7. 查看 ContextSnapshot / HandoffSummary
8. 查看 Artifact
9. 执行 Artifact Revision
10. 查看 `v1 -> v2`
11. 打开 `/agents`
12. 创建自定义 Agent
13. 返回 `/workspace` 查看 Agent List

## 12. 如何决定下一阶段任务

下一阶段任务的选择原则：

1. 优先修补最影响主链路稳定性的缺口
2. 优先补硬要求中的缺失项
3. 优先补能提升演示说服力的能力
4. 不优先补复杂但对当前 Demo 不关键的能力

当前优先级判断示例：

- `@Agent` / Selected Agent 最小链路
- 自定义 Agent preferredAdapter 执行接入
- 至少两个主流平台的更真实接入
- SSE / WebSocket

## 13. 如何把产物沉淀为文档、代码和 Demo

每轮开发最终应沉淀为三类产物：

### 13.1 文档

- 更新 README
- 更新产品设计 / 技术设计 / Demo 场景 / Roadmap
- 更新协作文档

### 13.2 代码

- 形成最小闭环实现
- 保留构建可验证状态

### 13.3 Demo

- 形成可演示的交互路径
- 明确哪些是 static demo
- 明确哪些是下一阶段能力

## 14. 当前工作流结论

当前 AgentHub 已经形成了一个可持续推进的 AI 协作开发流程，但它仍然需要以下补强：

- development log 持续更新
- decision log 持续记录
- demo checklist 常规化
- 每轮开发后的文档同步更加纪律化

当这几项一起固定后，这套流程就不仅能支持开发，也能直接支持比赛中的 AI 协作能力答辩。
