# Claude / Codex Headless Adapter Spec

## 目标

定义 AgentHub 接入 Claude Code 与 Codex 的生产化 v1 规则。

当前目标不是控制桌面端 GUI，也不是让外部 Agent 直接改写 AgentHub 仓库，而是通过统一 Adapter 层把 Claude Code / Codex 的 headless 输出转成可验证的 `REAL_ADAPTER` Artifact。

## 范围

- `CLAUDE_CODE` Artifact-only headless Adapter。
- `CODEX` Artifact-only headless Adapter。
- CLI command runner、prompt builder、stream parser、fixture mode。
- `REAL_FIRST` 下的 Artifact contract、quality evaluator、build validation、fallback reason。
- Adapter smoke、streaming smoke、quality metrics、TaskStep / Artifact source metadata。
- `/api/adapters` 暴露的 capability discovery、supported modes、安全策略说明。

## 非目标

- 不接 Claude Desktop 或 Codex Desktop GUI 自动化。
- 不允许 Claude Code / Codex 直接写 AgentHub 工作区。
- 不做完整 IDE / terminal session 托管。
- 不做多轮交互式外部 Agent 会话复刻。
- 不把 fixture smoke 当作真实 CLI 验证。
- 不默认要求本机安装或登录 Claude Code / Codex。
- 不让 streaming chunk 绕过最终 Artifact contract。

## Current Behavior

- `CLAUDE_CODE` 已从通用 CLI probe 升级为专用 Artifact-only headless Adapter v1。
- `CLAUDE_CODE` 支持 JSON 和 `stream-json` 输出模式，streaming 需显式开启。
- `CODEX` 已从通用 CLI probe 升级为专用 Artifact-only headless Adapter v1。
- `CODEX` 使用隔离 run directory、stdin prompt、JSON schema prompting 和可选 stream chunk 发布。
- 两个 Adapter 都通过 `AgentAdapterRegistry` 执行，不允许绕过 fallback。
- 两个 Adapter 的最终输出都必须通过 AgentHub Artifact JSON contract。
- 两个 Adapter 默认关闭，不影响默认 memory + MOCK/static fallback demo。
- `/api/adapters` 现在会返回 supported modes、safety policies 和 capability details，便于 UI 和 smoke 解释当前能力。

## 核心原则

- Artifact-only：外部 Agent 只返回结构化 Artifact，不直接编辑仓库文件。
- Headless-first：使用 CLI 非交互能力，不依赖桌面 GUI。
- Isolated work dir：每次执行使用 `.agenthub/*-runs/{requestId}` 隔离目录。
- ProcessBuilder only：后端不拼接 shell 字符串。
- Safe tools by default：默认禁用写文件、执行危险命令或 workspace mutation。
- Contract-first：最终输出必须是 AgentHub Artifact JSON。
- Fallback-first：不可用、失败、超时、contract invalid 都进入现有 fallback。

## Adapter Contract

Claude Code / Codex 的最终有效输出必须满足：

```json
{
  "assistantMessage": "string",
  "artifacts": [
    {
      "title": "string",
      "type": "CODE|MARKDOWN|REVIEW_REPORT|API_CONTRACT|DATA_MODEL|WEB_PREVIEW",
      "language": "string",
      "content": "string",
      "summary": "string"
    }
  ]
}
```

约束：

- `assistantMessage` 是协作说明，不是 Artifact content。
- `artifacts[]` 至少包含一个可用 Artifact。
- `CODE.content` 必须是原始源码，不允许 Markdown fence。
- Wrapper metadata、CLI 日志、stderr、usage stats 不得成为 Artifact content。
- 普通自然语言输出不能在 `REAL_FIRST` 下晋升为主 Artifact。
- 根输出必须是单个 JSON object，不能是数组、字符串、Markdown code fence 或带前后解释的混合文本。
- `type` 必须严格属于 `CODE / MARKDOWN / REVIEW_REPORT / API_CONTRACT / DATA_MODEL / WEB_PREVIEW`。
- 每个 Artifact 必须包含非空 `title / type / language / content / summary`。
- Contract 缺字段、普通文本、Markdown fence、CLI wrapper、provider error 文本都按 `PARSE_FAILED` 处理。
- `CODE` 内容不像源码时按 `QUALITY_FAILED` 处理；轻量 build heuristic 失败时按 `BUILD_FAILED` 处理。

## Claude Code v1 规则

- 默认命令通过 `AGENTHUB_CLAUDE_CODE_COMMAND` 配置，默认值为 `claude`。
- 默认使用 `-p/--print` headless 模式。
- 非流式输出读取 JSON wrapper 的最终 `result`。
- 流式输出读取 JSONL / stream-json，并发布 `ADAPTER_STREAM_CHUNK`。
- `stream-json` 必须遵守 Claude Code CLI 的必要参数要求。
- 默认 allowed tools 限制为只读能力，例如 `Read,Grep,Glob`。
- 默认 disallowed tools 包含写文件和 shell mutation 类工具。
- `/api/adapters` 会非侵入式探测 `--version` / `--help`，但不会在 describe 阶段触发真实模型执行。
- 认证失败、CLI 不存在、非 0 exit、无 result、contract invalid 都进入 fallback，并输出结构化 `failureType` 诊断。

## Codex v1 规则

- 默认命令通过 `AGENTHUB_CODEX_COMMAND` 配置，默认值为 `codex`。
- 默认使用 headless exec 能力，不接 Codex Desktop GUI。
- prompt 通过 stdin 或临时文件传入，避免命令行长度和转义问题。
- 默认使用 isolated run directory 和 read-only sandbox。
- 可使用 CLI JSON / output schema 能力约束最终输出。
- 可选 streaming 只用于执行体验，最终仍聚合成完整 JSON contract。
- `/api/adapters` 会非侵入式探测 `--version` 与 `exec --help`，用于暴露 sandbox、schema、json event 等能力。
- CLI 不存在、未认证、超时、contract invalid、quality failed 都进入 fallback，并输出结构化 `failureType` 诊断。

## Capability Discovery

`/api/adapters` 返回的每个 descriptor 可包含：

- `supportedModes`：例如 `headless`、`artifact-only`、`json`、`stream-json`、`read-only-sandbox`。
- `safetyPolicies`：例如 `workspace-write-disabled`、`processbuilder-no-shell`、`isolated-run-directory`。
- `capabilityDetails`：例如 version、version probe status、stream support、schema support、sandbox support、authentication probe 状态。
- 失败诊断：direct execute 与 smoke 尽量归类为 `NOT_INSTALLED / NOT_AUTHENTICATED / PERMISSION_DENIED / TIMEOUT / CONTRACT_INVALID / QUALITY_FAILED / BUILD_FAILED / CANCELLED / FALLBACK`。

边界：

- capability discovery 只做非侵入式 CLI 探测。
- `authenticationProbe=NOT_PROBED_EXECUTE_SMOKE_REQUIRED` 表示认证必须通过 execute 或 smoke 验证。
- discovery 失败不能伪造成 AVAILABLE；但 version/help 失败不会自动等同于真实执行失败。
- `failureType` 是诊断标签，不是新的 REST status enum；REST 结构保持兼容。

## 关键流程

1. AgentRouter 选择 `CLAUDE_CODE` 或 `CODEX` 作为 preferred Adapter。
2. AgentStepExecutor 构造 AgentRequest。
3. Adapter 生成 Artifact contract prompt。
4. CommandRunner 使用 ProcessBuilder 启动隔离 CLI 进程。
5. Adapter 收集 stdout / stream chunks / stderr / exit code。
6. Streaming 模式下，chunk 只发布为实时预览，不落为最终 Artifact。
7. 执行完成后聚合最终文本。
8. Contract validator 校验 Artifact JSON。
9. Quality evaluator 和可选 build validation 决定是否可采用。
10. `REAL_FIRST` 下，只有 accepted Artifact 可成为主 Artifact。
11. 失败时记录 parse / quality / build / fallback reason，并回退 MOCK/static。
12. TaskStep、Artifact、Adapter Quality Dashboard 展示来源和质量结果。

## Streaming / Stop / Cancel 规则

- Streaming chunk 只作为执行预览，通过 `ADAPTER_STREAM_CHUNK` / `TASK_STEP_STREAM_CHUNK` 发布。
- Streaming chunk 不持久化为 token 历史，不替代最终 Message / Artifact。
- Claude Code 和 Codex 均复用同一 realtime event type，前端不应依赖 provider-specific chunk event。
- Stop / Cancel token 被观察到后，不再发布 late chunks。
- CLI 已经在途的非流式或流式调用不保证硬中断；但完成后的 late result 必须丢弃，不得落为 `REAL_ADAPTER` Artifact。
- `CANCEL_RUN` 最终语义是取消本轮 run；`STOP_RUN` 最终语义是停止后续 step。
- Audit、RealtimeRunState、TaskRunPanel 必须展示 control command accepted / rejected / terminal state。
- Fixture streaming 只验证事件和 contract，不代表真实 CLI token streaming 能力。

## 配置规则

Claude Code：

- `AGENTHUB_CLAUDE_CODE_ENABLED=false`
- `AGENTHUB_CLAUDE_CODE_COMMAND=claude`
- `AGENTHUB_CLAUDE_CODE_STREAMING_ENABLED=false`
- `AGENTHUB_CLAUDE_CODE_ARTIFACT_ONLY=true`
- `AGENTHUB_CLAUDE_CODE_FIXTURE_ENABLED=false`

Codex：

- `AGENTHUB_CODEX_ENABLED=false`
- `AGENTHUB_CODEX_COMMAND=codex`
- `AGENTHUB_CODEX_STREAMING_ENABLED=false`
- `AGENTHUB_CODEX_ARTIFACT_ONLY=true`
- `AGENTHUB_CODEX_FIXTURE_ENABLED=false`

通用：

- `AGENTHUB_ARTIFACT_GENERATION_MODE=STATIC_TEMPLATE|HYBRID_REAL|REAL_FIRST`
- 默认 smoke 不依赖任何真实 CLI。
- 真实 CLI smoke 必须显式 opt-in。

## 验收标准

- 默认 API smoke 在未安装 Claude Code / Codex 时仍通过。
- `GET /api/adapters` 能准确显示 `CLAUDE_CODE` / `CODEX` 的 AVAILABLE、DISABLED、MISCONFIGURED 或 FAILED 状态。
- `GET /api/adapters` 能展示 headless / artifact-only / stream / sandbox / safety policy 等 capability metadata。
- `POST /api/adapters/CLAUDE_CODE/execute` 可验证 Claude Code direct execute。
- `POST /api/adapters/CODEX/execute` 可验证 Codex direct execute。
- `scripts/claude-code-smoke-test.mjs` 能验证 fixture 或真实 Claude Code CLI。
- `scripts/codex-smoke-test.mjs` 能验证 fixture 或真实 Codex CLI。
- `REAL_FIRST` 成功时，Artifact 必须是 `sourceKind=REAL_ADAPTER`。
- `sourceAdapterType` 必须准确记录为 `CLAUDE_CODE` 或 `CODEX`。
- streaming 成功时能看到 `ADAPTER_STREAM_CHUNK`，最终 Artifact 仍通过 contract / quality gate。
- Stop / Cancel 中途触发后，不再发布 late chunks，CLI late result 不持久化，且不会生成 `REAL_ADAPTER` Artifact。
- contract invalid、quality failed、build failed、timeout、auth failure 都有明确 fallback reason。
- contract invalid、普通文本输出、字段缺失、Markdown fence、CLI wrapper 或日志内容不会生成假 `REAL_ADAPTER`。
- `QUALITY_FAILED` 与 `BUILD_FAILED` 必须进入 TaskStep / Artifact 质量原因，静态 fallback 保留且原因可见。
- smoke 启用 `AGENTHUB_CLAUDE_CODE_SMOKE_REQUIRE_REAL_CLI=true` 或 `AGENTHUB_CODEX_SMOKE_REQUIRE_REAL_CLI=true` 时必须拒绝 fixture mode。

## 深接前置条件

在考虑更深平台能力前，必须先满足：

- Headless Artifact-only v1 在真实 CLI 环境下稳定。
- Contract validator 和 quality evaluator 对两个 Adapter 复用一致。
- Adapter Quality Dashboard 能观察 parse failure、quality failure、build failure、fallback rate。
- Stop / Cancel 能丢弃 late result，不写入最终 Artifact。
- fixture smoke 和真实 CLI smoke 的结果在文档中明确区分。
- capability discovery 能说明 CLI 版本、支持模式、安全边界和认证验证方式。

## 后续可选增强

- 更完整的 CLI capability discovery。
- 更细粒度的 tool allowlist / denylist。
- 更稳定的 stream parser 与 partial output 状态。
- 更严格的 CODE build / lint / test opt-in 验证。
- Adapter health history 影响 Router 选择。
- 对 OpenCode 采用同样 Artifact-only headless 规格。

## Fallback / Boundary

- Claude Code / Codex 深接当前只到 headless Artifact-only v1。
- 这不是桌面端自动化、不是外部 Agent 托管终端、不是 workspace-write 模式。
- 真实 CLI 能力依赖本机安装、登录态、模型权限、网络和 CLI 版本。
- Fixture mode 只能验证 contract，不代表真实 CLI 输出。
- `REAL_ADAPTER` 表示通过当前 gate，不代表生产级代码质量。
- 默认 demo 仍必须依赖 MOCK/static fallback 保持稳定。
