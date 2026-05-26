# Deferred Roadmap

本文件记录当前明确后置的能力。后置不代表不重要，而是当前收益 / 成本比不如真实 Adapter、持久化验证、上下文和执行控制稳定化。

## 暂缓能力

| 能力 | 状态 | 暂缓原因 | 重新评估条件 |
|---|---|---|---|
| 多节点事件总线 | Deferred | 当前没有多实例部署需求，引入 Redis / Kafka / broker 会扩大工程面 | 单节点 SSE 稳定后，出现多实例部署需求 |
| 真实 token streaming | Deferred | 真实 Artifact contract 和质量门禁优先级更高，streaming 只是交互增强 | REAL_FIRST 输出稳定，cancel token 语义清晰 |
| 真实部署平台 | Deferred | Vercel / Netlify / Docker / K8s 会引入外部鉴权和构建不确定性 | 本地 Deploy Preview 与 Approval/Audit 稳定后 |
| 桌面端 / 移动端 | Deferred | 课题 P2，加分项，不影响当前 Web 主链路 | Web 端主链路接近最终提交形态 |
| 完整 Workflow Canvas | Deferred | 容易偏离 IM-first 定位 | Orchestrator TaskGraph 需要可视化编辑时 |
| 完整 DAG 引擎 | Deferred | 当前 TaskGraph / ExecutionBatch 已够 MVP 解释和调度 | 出现复杂条件分支、循环、人工节点需求 |
| Vector search / RAG backend | Deferred | 当前 Context Retrieval 以 heuristic + explain 为主，不引入外部向量库 | 数据持久化稳定，Memory / Artifact 数据量显著增加 |
| 全量 MySQL 默认切换 | Deferred | JDBC 骨架已具备，但默认切换会增加开发和演示风险 | MySQL sprint 完成 create/query/update/restart 主链路 |
| Claude / Codex / OpenCode 深度接入 | Deferred | 当前优先打磨 OpenAI-compatible 真实输出，不同时铺开多个 provider | OpenAI-compatible 的 schema、quality、fallback 稳定后 |
| 真实杀毒 / 多租户权限 | Deferred | 附件安全边界已有字段和接口，真实扫描器和 RBAC 可后置 | 附件进入长期保存或多用户环境 |

## 当前不应做的事

- 不要把 fixture smoke 当作真实外部 provider 验证。
- 不要把 static preview 当作真实部署。
- 不要为了展示效果先做 token streaming，而忽略最终 Artifact contract。
- 不要在 MySQL 未验证前默认切换 persistence mode。
- 不要把 AgentHub 改造成 Workflow Canvas 产品，IM-first 是核心定位。

## 保留策略

- 所有 deferred 能力应继续保留接口设计空间。
- 已有 fallback、mock、static demo 不能被移除。
- 文档中必须明确哪些能力是 MVP、半真实、静态模拟或后置计划。
