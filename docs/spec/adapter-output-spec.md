# Adapter Output Spec

## 目标

定义真实或半真实 Adapter 输出如何进入 AgentHub Artifact 链路，重点约束 OpenAI-compatible、REAL_FIRST、JSON contract、质量评估、编译校验和 fallback。

该 spec 用于降低“Adapter 只是状态展示”的风险，让真实输出可见、可解释、可拒绝、可回退。

## 范围

- OpenAI-compatible Adapter 输出 contract。
- REAL_FIRST / HYBRID_REAL / STATIC_TEMPLATE 行为。
- REAL_ADAPTER Artifact 采纳条件。
- Adapter output parse / quality / build validation。
- TaskStep 与 Artifact 中的质量字段。
- fixture、真实 provider 和 MOCK fallback 的边界。

## 非目标

- 不做 Claude / Codex / OpenCode 深度平台接入。
- 不要求默认环境必须有真实 API key。
- 不做 token streaming。
- 不把 CLI 探测型 Adapter 写成深度真实接入。
- 不让 LLM 直接绕过 Artifact 安全链路。

## Current behavior

- OPENAI_COMPATIBLE 支持 OpenAI-compatible chat completions。
- 真实 provider 可通过环境变量配置。
- Codex / Claude Code / OpenCode 为 CLI 探测型 Adapter。
- `AgentAdapterRegistry` 统一 fallback 到 MOCK。
- Adapter output contract validator 已用于校验 JSON。
- REAL_FIRST 下，合格真实输出可以成为 REAL_ADAPTER 主 Artifact。
- 不合格输出会记录失败原因，并继续静态 fallback。
- real-adapter smoke 可 opt-in 验证真实 provider。
- CODE Artifact 可 opt-in 做 TypeScript 编译检查。
- Adapter quality metrics 会区分 accepted、parse failure、quality failure、build failure 和 fallback。
- ArtifactPanel 会展示 sourceKind、generationMode、qualityStatus、buildValidationStatus、qualityReason，以及静态 fallback / archived 的 fallback reason。

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

### Artifact Source

- `REAL_ADAPTER`
- `STATIC_TEMPLATE`
- `MOCK_FALLBACK`
- `USER_REVISION`
- `DEPLOY_PREVIEW`

### Quality Fields

- `realOutputUsed`
- `artifactParseStatus`
- `artifactQualityStatus`
- `artifactQualityReason`
- `buildValidationStatus`
- `qualityScore`

### Parse / Build Status

- `VALID_JSON_ARTIFACTS` 表示真实 Adapter 输出通过 JSON contract 并被解析为 artifacts。
- `FALLBACK_TEXT` / `TEXT_FALLBACK` 表示输出被降级为文本 fallback，不应被统计为 parse failure。
- `FAILED` 是 build validation 的失败状态。
- `WARN`、`NOT_APPLICABLE`、`NOT_EVALUATED` 和 `SKIPPED` 不应被统计为 build failure。

## 关键流程

1. AgentStepExecutor 调用 AgentAdapterRegistry。
2. Registry 根据 preferred adapter 执行，并在失败时 fallback MOCK。
3. 如果 Adapter 为 OPENAI_COMPATIBLE 且返回成功，先做 JSON contract validation。
4. Contract 通过后解析 artifacts。
5. ArtifactQualityEvaluator 评估内容质量。
6. CODE Artifact 可在 smoke 中执行可选 build validation。
7. REAL_FIRST 模式下，合格真实 Artifact 成为主 Artifact。
8. 不合格真实输出记录 failure reason，不提升为主 Artifact。
9. 静态模板继续作为 fallback / archived Artifact。
10. Orchestrator summary 展示真实产物数量、静态 fallback 数量和拒绝原因。

## 验收标准

- OPENAI_COMPATIBLE 可用时 `/api/adapters` 显示 AVAILABLE。
- `POST /api/adapters/OPENAI_COMPATIBLE/execute` 能返回真实响应或明确失败。
- REAL_FIRST 下至少一个合格真实输出能生成 `sourceKind=REAL_ADAPTER` Artifact。
- CODE Artifact content 不应包含 Markdown fence。
- 空 content、错误文本、非法 JSON 必须被拒绝。
- Fallback 不得伪装为真实输出。
- Adapter Quality Dashboard 能展示 success、fallback、parse failure、quality failure、build failure。
- REAL_FIRST 接受真实输出后，静态模板只能作为 archived / fallback Artifact 保留，不能覆盖 `REAL_ADAPTER` 主产物。
- ArtifactPanel 必须能看出主产物来源、generationMode、qualityStatus 和 fallbackReason。

## Fallback / Boundary

- 默认 smoke 不依赖真实 LLM。
- fixture 只能验证 contract，不等于真实 provider。
- 真实 provider 失败、超时、schema 不合法或质量不合格时，必须 fallback。
- CLI Adapter 当前只保证可探测、可配置、可 fallback。
- REAL_ADAPTER 进入 Artifact 不代表代码一定生产可用，只代表通过当前 contract 和质量门禁。
## Preferred Adapter Routing Rules

- Agent Builder 中的 `preferredAdapterType` 是 AdapterRoutingService 的首选输入，但不是唯一强制结果。
- Adapter 候选池仍会结合 health、success rate、fallback penalty 和 preferred bonus 选择实际 Adapter。
- `TaskStep.routingReason` 应保留候选分数和选择原因，前端可展示 requiredSkill、selected Agent、preferredAdapter、selectedAdapter 和 fallback reason。
- 如果 preferred Adapter 不可用，Registry 必须 fallback 到 MOCK，并在 TaskStep / Artifact / Adapter Dashboard 中暴露原因。
- Boundary：preferredAdapter 不能绕过 Artifact contract validator、quality evaluator、build validation 或 Approval / Audit 链路。
