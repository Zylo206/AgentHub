# Smoke Validation Skill

## 适用场景

用于构建验证、smoke test、Browser E2E、回归复核和结果确认任务。

## 输入前提

- 变更范围
- 对应验证命令
- 期望通过标准
- 需要排除的已知边界

## 修改范围

- `scripts/*.mjs`
- `backend/**`
- `frontend/**`
- 相关验证说明文档

## 执行步骤

1. 先找出本次变更必须验证的主链路。
2. 优先跑最小可回归命令，再补更重的验证。
3. 记录失败点，不要只报告“没通过”。
4. 区分环境问题、配置问题和代码问题。
5. 如果是 opt-in 功能，明确说明是否启用对应环境变量或前置条件。

## 约束边界

- 不把默认 demo smoke 当成真实 LLM 验证
- 不把局部通过当成全链路通过
- 不把环境失败伪装成代码正确
- 不凭猜测写结论

## 验证命令

- `node scripts/smoke-test.mjs`
- `node scripts/sse-smoke-test.mjs`
- `node scripts/jdbc-smoke-test.mjs`
- `node scripts/real-adapter-smoke-test.mjs`
- `node scripts/e2e-browser.mjs`

## 交付格式

- `summary`
- `artifacts`
- `openIssues`
- `verificationResult`

## 失败回退

- 如果主链路没跑通，先给出失败定位
- 如果无法完成全部验证，明确列出已验证与未验证项

