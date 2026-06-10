# AgentHub v1.5 项目验收报告

## 1. 验收结论

- 验收日期：2026-06-08
- 验收结论：`Web 主链路通过，项目可按 v1.5 MVP 形态验收；条件能力部分未完成本轮实测`
- 建议口径：可将 AgentHub 描述为“以 IM 为主路径的多 Agent 协作平台 v1.5 MVP”，不要描述为“默认开箱即用的真实多模型生产平台”

本轮验收显示，AgentHub 的默认 Web 主链路已经具备稳定演示和阶段性交付条件：前后端可构建，核心自动化验收通过，IM 协作、Orchestrator、Context/Memory、Artifact 生命周期、Approval/Audit、Deploy Preview、SSE 和 Browser E2E 主路径均有实测证据。桌面壳作为可选扩展能力也通过了构建级验收。

需要明确的是，JDBC/MySQL、真实 OpenAI-compatible、Claude Code、Codex 等能力属于“条件能力”。它们在架构和脚本层已经有实现入口，但当前运行环境没有启用相应模式，且部分 smoke 脚本存在认证前置不一致问题，因此本轮不能将这些能力记为“实测通过”。

## 2. 验收范围

本轮覆盖以下验收范围：

- 后端构建与单元测试
- 前端类型检查与构建
- API 主链路 smoke
- SSE 实时能力 smoke
- Browser E2E 主路径
- Desktop 可选壳构建级验收
- 条件能力预检：JDBC、真实适配器、CLI 适配器 smoke

本轮未覆盖以下范围：

- 真实 OpenAI-compatible 提供商调用
- JDBC/MySQL 持久化重启验证
- 已认证的 Claude Code / Codex 真机执行
- 多节点事件总线
- 真实云部署

## 3. 验收环境

| 项目 | 值 |
|---|---|
| 操作系统 | Windows 11 x64 |
| Node.js | 22.22.2 |
| Maven | 3.9.9 |
| Java | 17.0.12 / 本机运行中的后端进程为 JDK 21 |
| 前端地址 | `http://127.0.0.1:5173` |
| 后端地址 | `http://127.0.0.1:8080` |
| 当前持久化模式 | `memory` |

## 4. 验收证据

### 4.1 构建与测试

| 验收项 | 命令 | 结果 | 说明 |
|---|---|---|---|
| 后端单元测试 | `cd backend && mvn test` | 通过 | 共 13 个测试，0 失败，0 错误 |
| 后端构建 | `cd backend && mvn -DskipTests package` | 通过 | 成功生成 Spring Boot 可执行 jar |
| 前端类型检查 | `cd frontend && npm.cmd run lint` | 通过 | `tsc --noEmit` 通过 |
| 前端构建 | `cd frontend && npm.cmd run build` | 通过 | Vite 生产构建通过 |
| Desktop Rust 校验 | `cd desktop/src-tauri && cargo check` | 通过 | 可选桌面壳编译检查通过 |
| Desktop 无安装包构建 | `cd desktop && npm.cmd run build -- --no-bundle` | 通过 | 成功生成 `agenthub-desktop.exe` |

### 4.2 自动化验收

| 验收项 | 命令 | 结果 | 说明 |
|---|---|---|---|
| API 主链路 | `node scripts/smoke-test.mjs` | 通过 | 覆盖会话、附件、消息、Context/Memory、TaskRun、Artifact、Diff、Deploy、Restore、Audit |
| SSE 实时能力 | `node scripts/sse-smoke-test.mjs` | 通过 | 覆盖事件推送、`Last-Event-ID` 回放、run state、terminal cancel 拒绝 |
| Browser E2E | `node scripts/e2e-browser.mjs` | 通过 | 覆盖 Agent 创建、协作确认、附件、Artifact、Apply/Restore/Deploy、Preview、REJECTION 恢复、三档布局 |

### 4.3 条件能力预检

| 验收项 | 命令 | 结果 | 说明 |
|---|---|---|---|
| 真实 OpenAI-compatible | `node scripts/real-adapter-smoke-test.mjs` | 跳过 | 当前未配置真实提供商环境变量 |
| JDBC/MySQL | `node scripts/jdbc-smoke-test.mjs` | 预检失败 | 后端当前为 `memory` 模式，脚本明确要求 `jdbc` |
| Codex 适配器 smoke | `node scripts/codex-smoke-test.mjs` | 失败 | 在 `/api/adapters` 前置检查阶段收到 `401 Login required` |
| Claude Code 适配器 smoke | `node scripts/claude-code-smoke-test.mjs` | 失败 | 在 `/api/adapters` 前置检查阶段收到 `401 Login required` |
| Adapter 质量矩阵 | `node scripts/adapter-quality-matrix-smoke.mjs` | 失败 | 同样因未先登录而在 `/api/adapters` 阶段失败 |

## 5. 功能完成度评估

说明：完成度是结合当前实现、自动化覆盖和边界约束给出的 v1.5 估算值，不等同于生产 SLA。

| 功能域 | 完成度 | 本轮实测 | 结论 | 说明 |
|---|---:|---|---|---|
| IM Workspace 三栏主界面 | 95% | 通过 | 已完成 | Browser E2E 与手工路径均有证据 |
| 会话管理（创建、搜索、置顶、归档、恢复） | 90% | 通过 | 已完成 | 已有 UI 与 smoke 覆盖，仍非企业 IM |
| 自定义 Agent 创建 | 90% | 通过 | 已完成 | 支持 UI 对话式创建和 API 草案创建 |
| 单 Agent / 多 `@Agent` 协作 | 90% | 通过 | 已完成 | 主链路稳定，已覆盖多 Agent mention |
| Orchestrator 计划、路由、执行、聚合解释 | 90% | 通过 | 已完成 | `smoke` 和 E2E 都验证 explain 面板 |
| Context / Memory / Attachment | 88% | 通过 | 已完成 | 包含 pin、memory、附件上传下载和检索解释 |
| Artifact 生命周期 | 92% | 通过 | 已完成 | 生成、修订、Diff、Apply、Snapshot、Restore 全覆盖 |
| Approval / Audit 安全闸门 | 95% | 通过 | 已完成 | 未带 `approvalId` 时后端拒绝，审计链可追溯 |
| Deploy Preview | 90% | 通过 | 已完成 | 本地静态预览链路通过，不等于真实云部署 |
| SSE 实时状态 | 90% | 通过 | 已完成 | 事件、回放、run state 均验证通过 |
| Browser E2E 回归门禁 | 95% | 通过 | 已完成 | 已覆盖主路径、REJECTION 恢复和布局门禁 |
| Mock / Fallback / AdapterRegistry | 90% | 通过 | 已完成 | 默认演示安全网稳定，未伪装成真实成功 |
| REAL_FIRST / REAL_ADAPTER | 75% | 未实测 | 条件完成 | 架构与脚本已具备，当前环境未启用真实提供商 |
| JDBC/MySQL 持久化 | 70% | 未通过预检 | 条件完成 | 能力已实现，当前后端未以 `jdbc` 模式运行 |
| Codex / Claude Code 适配器 | 75% | 未完成有效实测 | 条件完成 | 功能在规划和文档中完备，但 smoke 脚本认证前置有缺陷 |
| Desktop 可选壳 | 85% | 通过构建级验收 | 扩展完成 | `cargo check` 和 `tauri build --no-bundle` 通过 |

## 6. 通过项摘要

以下能力可作为 v1.5 默认验收通过项：

- Web 端单聊 / 群聊协作主路径
- 会话管理、Agent 创建、消息与附件
- 多 Agent 协作消息流与 Orchestrator Explain
- Context / Memory / Context Search
- Artifact 生成、修订、Diff、Apply、Snapshot、Restore
- Approval Request 和 Action Audit
- Deploy Preview 和 Preview 页面
- SSE 实时状态与回放
- Browser E2E 回归门禁
- Desktop 可选壳构建

## 7. 未通过项与已知问题

### 7.1 条件能力未实测

- 真实 OpenAI-compatible：当前没有真实环境变量，脚本按预期跳过
- JDBC/MySQL：当前运行后端是 `memory` 模式，不能算 JDBC 验收通过
- Claude Code / Codex：当前运行后端未启用，且对应 smoke 脚本没有先做登录

### 7.2 验收中发现的脚本问题

- `scripts/adapter-quality-matrix-smoke.mjs` 未像 `smoke-test.mjs`、`sse-smoke-test.mjs`、`e2e-browser.mjs` 那样先执行 `/api/auth/login`，当前在启用鉴权的后端上会直接 401
- `scripts/codex-smoke-test.mjs` 与 `scripts/claude-code-smoke-test.mjs` 存在同类问题，前置阶段访问 `/api/adapters` 即失败
- `smoke-test.mjs` 默认路径仍提示 REJECTION 协议消息未覆盖；不过 Browser E2E 已覆盖 `REJECTION -> revise -> accepted` 恢复路径，因此这是“默认 smoke 覆盖不足”，不是功能缺失

## 8. 风险与边界

- 当前默认后端仍以 `memory` 模式验收，不应宣称默认具备数据库级持久化
- 当前 Deploy Preview 是本地静态预览，不应宣称已接入 Vercel、Netlify、Docker 或 Kubernetes
- 当前真实适配器链路属于可选启用能力，不应宣称默认开箱即用
- 当前 Desktop 是可选桌面壳，不应取代 Web 主客户端

## 9. 最终建议

建议将 AgentHub v1.5 作为“可验收的 Web MVP + 可选 Desktop 扩展”提交，答辩或汇报时建议采用以下口径：

1. 默认展示 Web 主链路，不以真实 LLM 或 JDBC 作为前置条件。
2. 明确说明真实适配器、JDBC 和 Desktop 是可选增强能力。
3. 在后续迭代中优先修复三个 smoke 脚本的认证前置问题。
4. 若要做更高强度终验，下一轮应在 `jdbc` 模式和至少一个真实适配器下补跑条件验收。
