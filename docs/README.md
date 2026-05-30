# AgentHub 文档入口

本目录保存 AgentHub 的产品设计、技术设计、规格、路线图、验证清单和 AI 协作记录。

## V1.0 核心文档

- `product-design.md`：中文产品设计文档，说明产品定位、用户流程、核心体验、当前能力和边界。
- `technical-design.md`：中文技术设计文档，说明前后端架构、Orchestrator、Adapter、Artifact、Context、Realtime、Persistence 和验证方式。
- `spec/index.md`：稳定规格索引，指向多 Agent、消息、Artifact、Adapter、Context、Approval、MySQL 等专题 spec。
- `plans/next.md`：当前最高优先级任务入口。每个 Agent 接手任务前应先读取。
- `collaboration/dev-log.md`：追加式开发记录，不覆盖历史 Phase。
- `collaboration/demo-checklist.md`：演示和验收清单。

## 目录说明

- `spec/`：稳定规格和验收标准。
- `plans/`：当前计划、已完成计划、延期计划和专题计划。
- `collaboration/`：协作流程、开发日志、demo checklist。
- `skills/`：项目内 Agent skill 说明。
- `rules/`：协作、路由、handoff 和执行规则。

## 写作规则

- 中文优先，英文术语可保留枚举名和配置名。
- 明确区分 `Done / Active / Deferred / Boundary`。
- 不把 Mock、fixture、static preview、fallback 写成真实生产能力。
- 文档只记录可验证事实和稳定规则；过程细节写入 dev-log。
- 涉及真实 Provider、MySQL、token streaming、部署平台时必须写清当前边界。
