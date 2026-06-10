# Spec Index

这里存放已稳定、可执行、可验收的规格。Spec 不记录开发过程，只定义规则和边界。

## 阅读顺序

1. Core Specs
2. Artifact / Adapter Specs
3. Context / Safety Specs
4. Production Collaboration Specs
5. Client / Platform Specs

## 优先级说明

- Core：主链路，优先级最高。
- Supporting：支撑主链路的能力。
- Boundary：明确限制和非目标。
- Archived：已被新版本替代或仅作历史参考。

## Spec 总表

| Spec | 范围 | 优先级 | 说明 |
|---|---|---:|---|
| `multi-agent-chat-spec.md` | 会话、@Agent、多 Agent 协作 | Core | 主交互协议 |
| `message-interaction-spec.md` | 消息类型、Action Bar、引导 / 回复 / pin / memory / regenerate | Core | 消息层主流程 |
| `demo-task-spec.md` | demo-task 主链路、TaskRun、TaskStep、Artifact 生成 | Core | 演示主流程 |
| `artifact-lifecycle-spec.md` | Artifact 生命周期 | Core | 主产物链路 |
| `approval-audit-spec.md` | 审批与审计 | Core | 高风险操作边界 |
| `adapter-output-spec.md` | Adapter JSON contract、REAL_FIRST、quality gate、fallback | Core | 实现输出约束 |
| `real-agent-output-stability-spec.md` | OpenAI-compatible / Claude Code / Codex 真实体输出稳定性 | Supporting | 真实体能力收敛 |
| `claude-codex-headless-adapter-spec.md` | Claude Code / Codex headless 接入边界 | Boundary | 只定义接入方式 |
| `context-memory-spec.md` | pinned context、MemoryItem、HandoffSummary | Supporting | 上下文与交接 |
| `context-search-spec.md` | DB-backed Agentic Search | Supporting | 检索边界 |
| `mysql-profile-spec.md` | JDBC/MySQL profile | Boundary | 可选运行配置 |
| `desktop-support-spec.md` | Tauri 桌面壳 | Boundary | 可选桌面能力 |
| `collaboration-auth-sync-spec.md` | 多人协作、权限、presence、realtime 授权 | Supporting | 协作扩展能力 |

## 边界规则

- Mock / fixture / static fallback 不是生产能力。
- `REAL_ADAPTER` 只表示通过当前 contract / quality / build gate，不代表生产就绪。
- Deploy Preview 是本地静态预览，不是云部署。
- Context Search 默认是 DB-backed Agentic Search + heuristic scoring，不是默认向量检索。
- MySQL / JDBC 是 opt-in profile，不是默认 runtime。
- 重叠 spec 要注明主从关系，避免重复定义。

## 详细索引

更完整的条目说明见 `index.md`。
