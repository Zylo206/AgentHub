# AgentHub Demo Checklist V0.5

## 1. 启动检查

### backend

- [ ] `backend` 能正常启动
- [ ] 默认端口 `8080` 未被占用
- [ ] 基础健康接口可访问

### frontend

- [ ] `frontend` 能正常启动
- [ ] `/workspace` 可访问
- [ ] `/agents` 可访问

### 构建检查

- [ ] `cd backend && mvn -q -DskipTests package`
- [ ] `cd frontend && npm run build`

### API Base URL

- [ ] 前端 `VITE_API_BASE_URL` 指向正确后端
- [ ] 当前环境未误连到其他服务

## 2. 主流程检查

### Workspace 主链路

- [ ] 打开 `/workspace`
- [ ] 点击 `Create Demo Conversation`
- [ ] 在输入框中保留或输入 Demo 任务
- [ ] 点击 `Send Message`
- [ ] 点击 `Run Demo Task`

### Task 展示

- [ ] 能看到 TaskRun
- [ ] 能看到 3 个 TaskStep
- [ ] 能看到 Adapter 信息
- [ ] Frontend Builder 显示 `CODEX -> MOCK`
- [ ] Reviewer 显示 `CLAUDE_CODE -> MOCK`

### Context / Handoff 展示

- [ ] 能看到 ContextSnapshot
- [ ] 能看到 HandoffSummary
- [ ] 能看到 `sourceAgent -> targetAgent`
- [ ] 能看到 `passedArtifacts`

### Artifact 展示

- [ ] ArtifactPanel 有内容
- [ ] 能选中 `LoginPage.tsx`
- [ ] 能看到 `README.md`
- [ ] 能看到 Review Report

### Artifact Revision

- [ ] 在 revision 输入框输入：
  - `把按钮改成蓝色，并增加 loading 状态。`
- [ ] 点击 `Revise Selected Artifact`
- [ ] 能看到新的 revision TaskRun
- [ ] 能看到 `LoginPage.tsx v2`
- [ ] 能看到新的 Review Report

### Version History / Diff Summary

- [ ] Version History 出现 `v1 -> v2`
- [ ] Diff Summary 显示 revisionInstruction、changed items、risk

### Agent Builder

- [ ] 打开 `/agents`
- [ ] 创建自定义 Agent
- [ ] 回到 `/workspace`
- [ ] Agent List 中能看到新 Agent

## 3. 风险检查

- [ ] 不演示未完成的真实 LLM 接入
- [ ] 不演示未完成的真实部署
- [ ] 不把 placeholder adapter 说成真实平台接入
- [ ] 不在现场临时尝试未验证的 `@Agent` 路由
- [ ] 如果网络或依赖失败，优先使用本地已经构建成功的版本演示

## 4. 3 分钟录屏建议顺序

推荐顺序：

1. `/workspace` 总览
2. Create Demo Conversation
3. Send Message
4. Run Demo Task
5. 展示 TaskRun / TaskStep / Adapter 信息
6. 展示 ContextSnapshot / HandoffSummary
7. 展示 ArtifactPanel
8. 选中 `LoginPage.tsx`
9. 执行 Artifact Revision
10. 展示 `v1 -> v2`
11. 展示 Diff Summary
12. 打开 `/agents`
13. 创建自定义 Agent
14. 回 `/workspace` 看 Agent List

## 5. 录屏时建议避开的路径

以下内容当前不适合在正式录屏中深入演示：

- 真实 provider 调用
- 未完成的 `@Agent`
- 未完成的部署发布
- 未完成的多人协作
- 任何依赖外部网络稳定性的路径

## 6. 出问题时的兜底顺序

如果现场出现异常，优先兜底：

1. 保住 `/workspace` 主链路
2. 保住 demo-task 展示
3. 保住 revision 展示
4. `/agents` 可作为补充环节

如果 revision 不稳定：

- 至少展示已生成的 `v1`
- 展示当前 Version History 和 Diff Summary 设计
- 明确说明当前是 static demo iteration
