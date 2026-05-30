# Real Agent Output Stability Spec

## 目标

定义真实 / 半真实 Adapter 输出进入 AgentHub Artifact 链路时必须满足的稳定性规则。

核心链路是：

`OpenAI-compatible / Claude Code / Codex -> REAL_FIRST -> REAL_ADAPTER Artifact`

目标是让真实 Agent 输出可验证、可拒绝、可 fallback、可解释，避免把错误文本、半截 JSON、fixture 输出或 Mock fallback 伪装成真实主产物。

## 范围

- OpenAI-compatible Adapter。
- Claude Code Artifact-only headless Adapter。
- Codex Artifact-only headless Adapter。
- `REAL_FIRST` 模式下的主 Artifact 选择规则。
- Adapter Artifact JSON contract。
- Contract validator、quality evaluator、build validation。
- TaskStep / Artifact / Adapter Quality Dashboard 的质量字段。
- 默认 smoke、fixture smoke、真实 provider smoke、CLI adapter smoke 的边界。

## 非目标

- 不做真实部署平台接入。
- 不做完整多 provider token streaming 统一协议。
- 不要求默认环境必须有真实 API key 或本机 CLI 登录态。
- 不允许真实 Agent 直接修改 AgentHub 仓库工作区。
- 不把 fixture 输出当作真实 provider 输出。
- 不承诺生成代码达到生产可上线质量。

## Current Behavior

- `OPENAI_COMPATIBLE` 支持真实 OpenAI-compatible provider，并已具备 opt-in smoke。
- `CLAUDE_CODE` 是 Artifact-only headless Adapter v1，支持 CLI JSON / stream-json 输出。
- `CODEX` 是 Artifact-only headless Adapter v1，支持 headless CLI 输出和 opt-in streaming 验证。
- 三类 Adapter 都必须通过 `AgentAdapterRegistry`，不能绕过 fallback。
- `REAL_FIRST` 下，只有合格真实输出可以成为主 Artifact。
- 合格真实输出存在时，静态模板只能作为 archived fallback 保留。
- 真实输出失败时，系统继续使用 Mock / static fallback 保持主链路可运行。
- CODE Artifact 可通过 opt-in TypeScript build check 做更强验证。

## 核心模型

### Adapter Artifact Contract

```json
{
  "assistantMessage": "string",
  "artifacts": [
    {
      "title": "LoginPage.tsx",
      "type": "CODE",
      "language": "tsx",
      "content": "raw source code",
      "summary": "what this artifact contains"
    }
  ]
}
```

### Artifact Source Fields

- `sourceKind=REAL_ADAPTER | STATIC_TEMPLATE | MOCK_FALLBACK | USER_REVISION | DEPLOY_PREVIEW`
- `sourceAdapterType=OPENAI_COMPATIBLE | CLAUDE_CODE | CODEX | MOCK`
- `sourceTaskStepId`
- `generationMode=STATIC_TEMPLATE | HYBRID_REAL | REAL_FIRST`
- `fallbackReason`

### TaskStep Quality Fields

- `realOutputUsed`
- `realAdapterOutcome`
- `artifactParseStatus`
- `artifactQualityStatus`
- `artifactQualityScore`
- `artifactQualityReason`
- `artifactBuildValidationStatus`
- `artifactBuildValidationReason`
- `actualAdapterType`
- `adapterStatus`
- `adapterErrorMessage`

## Outcome Taxonomy

- `ACCEPTED`：contract、quality、必要 build 校验通过，真实输出被采用。
- `PARSE_FAILED`：JSON contract 不合法、缺字段、Markdown fence、unsupported type、普通文本或 fallback text 不能在 `REAL_FIRST` 下晋升。
- `QUALITY_FAILED`：内容过短、像错误文本、CODE 不像源码、结构化文本不合格。
- `BUILD_FAILED`：CODE Artifact 在轻量 build / syntax validation 或 opt-in build smoke 中失败。
- `FALLBACK`：provider 不可用、CLI 不可用、认证失败、超时、I/O 失败、fallback 到 MOCK。

## Operational Failure Taxonomy

Adapter 执行层失败必须和 Artifact 质量失败区分：

- `NOT_INSTALLED`：本机 CLI 不存在或配置的 command 不可执行。
- `NOT_AUTHENTICATED`：CLI 或 provider 未登录、无权限、API key 缺失或认证失败。
- `PERMISSION_DENIED`：CLI 沙箱、文件权限或系统权限拒绝执行。
- `TIMEOUT`：CLI / HTTP 调用超过配置超时时间。
- `CANCELLED`：Stop / Cancel token 已触发，late chunks 或 late result 不得落入最终 Artifact。
- `CONTRACT_INVALID`：Adapter 原始响应未通过 AgentHub Artifact JSON contract；进入 TaskStep / Artifact 质量语义时应映射为 `PARSE_FAILED`。

这些执行层分类可以出现在 direct execute 诊断、`adapterErrorMessage`、CLI smoke 输出和 `/api/adapters` capability details 中。进入 Artifact 采纳链路时，用户界面仍应优先展示统一 outcome：`ACCEPTED / PARSE_FAILED / QUALITY_FAILED / BUILD_FAILED / FALLBACK`。

## 关键流程

1. Orchestrator 生成 TaskStep，并由 Router 选择 Agent 和 preferred Adapter。
2. AgentStepExecutor 调用 AgentAdapterRegistry。
3. Registry 优先执行 preferred Adapter，失败时 fallback 到 MOCK。
4. 真实 Adapter 成功返回后，先执行 Artifact JSON contract validation。
5. Contract validator 拒绝非 JSON、Markdown fence、缺字段、错误文本、非法 type。
6. CODE content 必须是原始源码，不允许 Markdown fence 或 metadata wrapper。
7. AdapterArtifactExtractor 只将可解析 artifacts 交给质量评估。
8. AdapterArtifactQualityEvaluator 执行规则化质量评估。
9. 可选 smoke 对 CODE Artifact 执行 TypeScript build check。
10. `REAL_FIRST` 下，只有 `ACCEPTED` 真实 Artifact 可以成为主 Artifact。
11. `REAL_FIRST` 中 contract 不合法必须归类为 `PARSE_FAILED`，不能混入 `QUALITY_FAILED`。
12. 静态模板只能作为 fallback / archived Artifact，不能覆盖主 REAL_ADAPTER。
13. TaskStep 和 Artifact 必须记录采用、拒绝或 fallback 的具体原因。
14. Adapter Quality Dashboard 聚合展示 success、fallback、parse failure、quality failure、build failure。

## 负例样本

以下输出必须被拒绝或降级，不得成为主 REAL_ADAPTER Artifact：

- 只返回自然语言解释，没有 `assistantMessage` 和 `artifacts[]`。
- JSON 外层包裹 Markdown fence。
- `artifacts[]` 为空。
- Artifact 缺少 `title / type / language / content / summary` 任一字段。
- `type` 不属于 AgentHub 支持的 Artifact 类型。
- CODE content 是 Markdown 文档，而不是源码。
- CODE content 包含 provider error、API key、unauthorized、rate limit 等错误文本。
- CODE content 是明显不可编译的占位内容。
- 真实 Adapter 实际 fallback 到 MOCK。

## 可观测性规则

- TaskRunPanel 展示每个 step 的 preferred / actual Adapter。
- TaskRunPanel 展示真实输出是否被采用。
- ArtifactPanel 展示 sourceKind、sourceAdapterType、generationMode。
- ArtifactPanel 展示 qualityStatus、qualityScore、buildValidationStatus。
- Adapter Quality Dashboard 聚合成功率、fallback 率、parse failure、quality failure、build failure。
- Orchestrator summary 说明真实产物数量、静态 fallback 数量和主要拒绝原因。
- Smoke 失败信息归类为 `ACCEPTED / PARSE_FAILED / QUALITY_FAILED / BUILD_FAILED / FALLBACK`。

## 验收标准

- 默认 `node scripts/smoke-test.mjs` 不依赖真实 LLM 或 CLI。
- 真实 OpenAI-compatible 环境下，`node scripts/real-adapter-smoke-test.mjs` 能验证真实 provider。
- 本机 Claude Code 可用时，`node scripts/claude-code-smoke-test.mjs` 能验证 `CLAUDE_CODE`。
- 本机 Codex CLI 可用时，`node scripts/codex-smoke-test.mjs` 能验证 `CODEX`。
- `REAL_FIRST` 成功时，主 Artifact 必须是 `sourceKind=REAL_ADAPTER`。
- 真实输出失败时，UI 必须展示 parse / quality / build / fallback reason。
- CODE Artifact 不得包含 Markdown fence。
- CODE Artifact 内容不得长期保持字面量 `\n` 单行源码。
- 静态 fallback 不得伪装成真实 Agent 输出。
- Fixture smoke 必须明确标注为 contract 验证，不是外部 provider 验证。

## Fallback / Boundary

- 默认环境仍允许 `memory + MOCK/static fallback` 稳定运行。
- `REAL_ADAPTER` 只表示通过当前 contract、quality、build gate，不表示代码生产可上线。
- Claude Code / Codex v1 是 headless Artifact-only 接入，不是桌面端 GUI 自动化。
- CLI Adapter 不允许直接写 AgentHub 工作区。
- OpenAI-compatible 的真实效果依赖 provider、模型、prompt 和网络。
- Token streaming 是体验增强，不能绕过最终 Artifact contract。
- 真实部署、多端、企业级权限、完整静态分析平台不属于本 spec。
