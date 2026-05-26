# Active Roadmap

本文件记录当前最值得继续推进的计划。默认原则是先补真实动态能力，再补生产化稳定性；不急于做 Demo 视频、多端、真实部署平台或完整 Workflow Canvas。

## P0：真实动态能力收敛

| 优先级 | 任务 | 目标 | 验收标准 |
|---:|---|---|---|
| P0-1 | 真实 Adapter 输出质量继续收敛 | 稳定 `OPENAI_COMPATIBLE -> REAL_FIRST -> REAL_ADAPTER Artifact` 链路 | 真实 provider smoke 能生成 `REAL_ADAPTER` 主产物，schema / quality / build failure 都有明确原因 |
| P0-2 | REAL_FIRST 主产物规则强化 | 真实输出合格时优先成为主 Artifact，不合格时静态 fallback | 静态模板不能覆盖合格真实产物；fallback artifact 明确标记来源 |
| P0-3 | Adapter quality metrics 落地观察 | 让真实输出质量可回归、可诊断 | 后端指标能展示 success、fallback、parse failure、quality failure、build failure |
| P0-4 | JDBC / MySQL 实库验证 sprint | 暂不默认切 MySQL，只验证 schema 和 repository 主链路 | 真实 MySQL 下完成 create / query / update / restart verify |
| P0-5 | Stop / Cancel 执行语义继续收敛 | 让 control plane 从状态变更走向执行级控制 | cancel 后后续 step 不执行，非流式 adapter 完成后的结果可丢弃 |
| P0-6 | 文档与计划同步 | 保持代码、计划、验收边界一致 | `docs/plans`、`dev-log`、核心设计文档同步更新 |

## P1：生产化增强

| 优先级 | 任务 | 目标 | 验收标准 |
|---:|---|---|---|
| P1-1 | Browser E2E 扩展 | 覆盖 workspace、approval、restore、attachment、rejection、preview | E2E 脚本能在前后端启动后验证关键 UI 点击链 |
| P1-2 | Context Retrieval v4 后续增强 | 保留 heuristic 默认，预留 embedding backend | ContextPanel 展示 semantic backend、semanticScore、matchedTokens 和 injected step |
| P1-3 | 附件生产化继续补齐 | 从本地文件存储走向可治理附件能力 | cleanup、scan adapter、access guard 的默认实现和状态可见 |
| P1-4 | Adapter dashboard 趋势化 | 从当前指标面板升级为可观察趋势 | 指标可按 adapter / 时间窗口 / failure reason 聚合 |
| P1-5 | OpenAI-compatible prompt contract 继续打磨 | 减少模型输出 wrapper、fence、空内容和低质量代码 | 真实 provider 输出 contract 通过率提升，fallback 原因更少 |

## 暂不进入本轮

- 多节点事件总线。
- 真实 token streaming。
- 真实 Vercel / Netlify / Docker / Kubernetes 部署。
- 桌面端 / 移动端。
- 完整 Workflow Canvas / DAG 编辑器。
- Claude / Codex / OpenCode 深度平台接入的全面铺开。

## 当前推荐顺序

1. 继续观察并收敛真实 OpenAI-compatible provider 的 REAL_FIRST 输出质量。
2. 单独安排 MySQL/JDBC 实库验证 sprint，但不默认切换生产存储。
3. 完善 Stop / Cancel 的真实执行语义。
4. 等真实输出质量稳定后，再评估 token streaming 是否值得做。
