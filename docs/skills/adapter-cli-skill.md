# Adapter / CLI Skill

## 适用场景

用于 Adapter 路由、CLI 探测、真实命令路径、fallback、能力描述和 provider 可用性判断任务。

## 输入前提

- Task Spec
- 目标 adapter 类型
- 本机命令路径或环境变量
- 期望探测结果
- 验收标准

## 修改范围

- `backend/src/main/java/com/agenthub/infrastructure/adapter/**`
- `backend/src/main/java/com/agenthub/infrastructure/cli/**`
- `backend/src/main/resources/application.yml`
- `scripts/*adapter*` 或相关验证脚本

## 执行步骤

1. 先确认当前 adapter 是 probe、mock 还是 real。
2. 检查命令路径、环境变量和可执行权限。
3. 保持 `available / disabled / probe-only / fallback` 边界清晰。
4. 让描述结果可被前端直接展示。
5. 真实 CLI 不可用时，明确回退原因，不伪装为成功。

## 约束边界

- 不把未探测到的 CLI 标成可用
- 不把 fallback 结果写成真实 adapter 成功
- 不把沙箱失败当成真实机器结论
- 不改动无关业务路由

## 验证命令

- `node scripts/real-adapter-smoke-test.mjs`
- `node scripts/claude-code-smoke-test.mjs`
- `node scripts/codex-smoke-test.mjs`

## 交付格式

- `summary`
- `artifacts`
- `openIssues`

## 失败回退

- 如果 CLI 不可用，输出 probe 结果和推荐修复路径
- 如果后端无法执行真实命令，明确说明是路径、权限还是环境问题

