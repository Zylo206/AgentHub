# Real Adapter Plan

本计划聚焦 `OPENAI_COMPATIBLE -> REAL_FIRST -> REAL_ADAPTER Artifact` 链路。当前策略是先把 OpenAI-compatible 打磨稳定，再考虑 Claude / Codex / OpenCode 深度接入。

## 当前状态

- `Done` OpenAI-compatible Adapter 支持 base URL、API key、model、timeout、retry、JSON response format 配置。
- `Done` CLI Adapter 对 Codex / Claude Code / OpenCode 做可配置探测和 fallback。
- `Done` `REAL_FIRST` 模式支持真实 Adapter 成功时优先生成 `REAL_ADAPTER` Artifact。
- `Done` Adapter output contract 已收紧到 raw JSON：
  - `assistantMessage`
  - `artifacts[]`
  - `title`
  - `type`
  - `language`
  - `content`
  - `summary`
- `Done` `AdapterArtifactContractValidator` 拒绝 markdown fence、空 content、错误文本、不支持 type 等。
- `Done` `AdapterArtifactQualityEvaluator` 记录 parse / quality / build validation 结果。
- `Done` `real-adapter-smoke-test.mjs` 可 opt-in 验证真实 provider。
- `Done` 可选 `AGENTHUB_REAL_ADAPTER_SMOKE_EXPECT_CODE_BUILD=true` 对 CODE Artifact 做 TypeScript 编译检查。

## 活跃计划

### P0：主产物质量继续收敛

- 继续强化 prompt contract，减少 provider 输出 wrapper、fence、解释性文字和空内容。
- 继续观察真实 provider 的 `parse failure`、`quality failure`、`build failure`。
- 将质量失败原因反馈到 TaskRunPanel、ArtifactPanel、Adapter Quality Dashboard。
- 让静态 fallback 明确标记为 fallback / archived，不能覆盖合格真实主产物。

### P0：失败分类

- Provider transient failure：429、5xx、timeout、I/O，可按配置 retry。
- Contract failure：JSON schema 不合格，不 retry，直接 fallback。
- Quality failure：内容过短、CODE 不像代码、错误文本，不 retry，直接 fallback。
- Build failure：可选 CODE compile smoke 失败，记录原因，不伪装成可用真实产物。

### P1：Provider 扩展

- OpenAI-compatible 稳定后，再评估 Claude / Codex / OpenCode 深度接入。
- CLI Adapter 当前仍是探测型半真实接入，不承诺深度平台语义。
- 不同时铺开多个 provider，避免调试面失控。

## 验证路径

默认环境：

```bash
node scripts/smoke-test.mjs
```

真实 provider opt-in：

```bash
node scripts/real-adapter-smoke-test.mjs
```

真实 CODE 编译 opt-in：

```bash
AGENTHUB_REAL_ADAPTER_SMOKE_EXPECT_CODE_BUILD=true node scripts/real-adapter-smoke-test.mjs
```

## 边界

- 不提交任何 API key。
- 不要求默认 smoke 依赖真实外部 LLM。
- fixture 验证不等于真实 provider 验证。
- REAL_ADAPTER 进入 Artifact 不等于产物质量已达到生产级，需要持续通过 contract、quality、build validation。
