# AgentHub Spec Index

本目录存放 AgentHub 的稳定规格文档。Spec 只描述已经稳定或明确约束的规则，不记录每轮开发过程；开发过程写入 `docs/collaboration/dev-log.md`。

## Core Specs

| Spec | 范围 |
|---|---|
| `multi-agent-chat-spec.md` | Conversation、participants、多 `@Agent`、Agent protocol message、群聊式 Agent 回复流 |
| `message-interaction-spec.md` | 消息类型、Action Bar、引用 / 回复 / pin / memory / regenerate、弱媒体边界 |
| `demo-task-spec.md` | demo-task 主链路、触发、TaskRun、TaskStep、Artifact 生成边界 |
| `task-spec-template.md` | 新任务规格模板 |

## Artifact / Adapter Specs

| Spec | 范围 |
|---|---|
| `artifact-lifecycle-spec.md` | Artifact 生成、版本、Revision、Diff、Apply、Snapshot、Restore、Deploy Preview |
| `deployment-publish-spec.md` | 聊天触发 Deploy、Approval Gate、本地静态 Preview、DEPLOY_STATUS、Artifact Bundle 下载 |
| `adapter-output-spec.md` | Adapter Artifact JSON contract、REAL_FIRST、quality gate、fallback |
| `real-agent-output-stability-spec.md` | OpenAI-compatible / Claude Code / Codex 真实输出稳定性、失败分类、build validation |
| `claude-codex-headless-adapter-spec.md` | Claude Code / Codex headless Artifact-only v1 接入边界 |

## Context / Safety Specs

| Spec | 范围 |
|---|---|
| `context-memory-spec.md` | pinned context、MemoryItem、ContextSnapshot、HandoffSummary |
| `context-search-spec.md` | DB-backed Agentic Search、List / Grep / Read、FULLTEXT opt-in、embedding 边界 |
| `approval-audit-spec.md` | ApprovalRequest、ActionAuditLog、高风险操作强制审批 |
| `mysql-profile-spec.md` | JDBC/MySQL profile、初始化、repository 覆盖、restart verify |

## Client / Platform Specs

| Spec | 范围 |
|---|---|
| `desktop-support-spec.md` | 可选 Tauri 桌面壳、本地文件访问、系统通知、Agent CLI 进程管理和安全边界 |

## Production Collaboration Specs

| Spec | 范围 |
|---|---|
| `collaboration-auth-sync-spec.md` | 多人协作、账号权限、组织空间、Realtime 授权、Presence 和 Artifact 冲突处理 |

## Boundary Rules

- Mock、fixture、static fallback 不能写成真实生产能力。
- `REAL_ADAPTER` 只表示通过当前 contract / quality / build gate，不代表产物已达到生产上线质量。
- Deploy Preview 是本地静态预览，不是真实云部署。
- Context Search 默认是 DB-backed Agentic Search + heuristic scoring，不是默认向量检索。
- MySQL/JDBC 是 opt-in profile，不是默认 runtime。
- Tauri desktop 是可选壳能力，不替代 Web 主力端，也不默认启用 workspace-write。
