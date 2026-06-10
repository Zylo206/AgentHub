# AI Collaboration

这里沉淀的是 AgentHub 和 AI / Codex 协作的可复用规范，不保存完整对话记录。

## 阅读顺序

1. `development-workflow.md`
2. `prompt-template.md`
3. `decision-log.md`
4. `dev-log.md`
5. `demo-checklist.md`

## 文件说明

- `development-workflow.md`：每轮协作开发的标准流程和边界。
- `prompt-template.md`：给 Codex / AI Agent 下发任务的标准 prompt 模板。
- `decision-log.md`：关键产品 / 技术决策理由。
- `dev-log.md`：追加式开发记录，保留阶段结果，不记完整聊天。
- `demo-checklist.md`：演示 / 验收 / 烟测清单。

## 使用规则

- 只记录可复用规范，不记录完整对话。
- 过程性细节放 `dev-log.md`。
- 规则变化优先同步 `development-workflow.md` 和 `decision-log.md`。
- 任务执行前先看 `prompt-template.md`。

## 和其他目录的关系

- `docs/spec/` = 稳定规格。
- `docs/plans/` = 当前计划。
- `docs/rules/` = 全局约束。
- `docs/collaboration/` = 人和 AI 怎么协作。
