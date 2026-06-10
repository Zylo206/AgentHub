# Global Rules

## 1. 规则优先级

当文档之间存在冲突时，优先级从高到低如下：

1. `AGENTS.md`
2. `docs/spec/`
3. `docs/rules/global-rules.md`
4. `docs/rules/routing-rules.md`
5. `docs/rules/handoff-rules.md`
6. `docs/skills/`

`rules-template.md` 仅用于创建新规则，不参与日常执行。

## 2. 全局行为规则

- 所有非平凡任务都应先被整理成 Task Spec，再开始执行。
- 所有任务都应有明确的验收标准。
- 所有输出都应明确区分 `Done / Active / Deferred / Boundary`。
- 所有 Agent 响应都应包含简短完成摘要。
- 所有交接都应携带必要上下文、关键 Artifact 和未完成事项。
- Review 结论必须基于验收标准，而不是直觉。

## 3. 输出规则

- 能产出结构化 Artifact 时，优先产出结构化 Artifact。
- 不要把推测写成事实。
- 不要把 Mock、fixture、static preview、fallback 写成真实生产能力。
- 如果存在不确定性，先说明不确定，再给出最保守可执行方案。
- 如果任务只能部分完成，必须明确说明边界与剩余工作。

## 4. Artifact 规则

- Artifact 是系统核心对象，不是普通文本附件。
- 生成 Artifact 时必须声明 `artifactType`、`title`、`content`。
- 代码、文档、评审报告、API Contract 等输出应能被后续 Agent 直接复用。
- Diff、Apply、Snapshot、Restore 结果必须可追溯。

## 5. 安全规则

- 不得伪造已执行成功的部署、发布、适配器调用或外部平台接入。
- 不得伪造已存在的后端接口或已可用的 Web Preview。
- 不得在未说明前提的情况下声称已完成高风险操作。
- 不得隐瞒失败原因。

## 6. 路由规则

- UI、交互、布局、状态管理任务优先路由到前端。
- API、服务、持久化、编排任务优先路由到后端。
- 提示词、角色定义、行为规则优先路由到规则或技能维护者。
- 验收、风险检查、质量门禁优先路由到 Reviewer。
- 知识检索、文件查找、事实补全优先路由到知识类 Agent。

## 7. 交接规则

- 交接必须包含：已完成内容、待完成内容、风险、下一步建议。
- 交接不得复制完整聊天历史。
- 交接应优先传递与下一步直接相关的 Artifact 和决策。
- 如果任务语义变化，必须先更新 Task Spec，再继续执行。

## 8. Demo 规则

- Demo 优先展示可解释的协作链路，而不是不可见的后台复杂度。
- Demo 优先展示任务、路由、交接、审查、Artifact 这条主链路。
- Demo 中必须明确哪些是真实能力，哪些是 fallback 或静态演示。
- 任何可被误认为真实生产能力的示例态，都应显式标注边界。

