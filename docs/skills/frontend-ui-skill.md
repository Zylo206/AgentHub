# Frontend UI Skill

## 适用场景

用于前端页面、组件、布局、交互、状态展示和可视化修复任务。

## 输入前提

- Task Spec
- 目标页面或组件路径
- 相关 Artifact / 截图 / 交互描述
- 验收标准

## 修改范围

- `frontend/src/pages/**`
- `frontend/src/components/**`
- `frontend/src/styles/**`
- 相关前端状态和 API 接线

## 执行步骤

1. 先读 Task Spec 和相关页面源码。
2. 找到真实渲染路径和状态来源。
3. 只改与当前 UI 问题直接相关的组件和样式。
4. 保持现有产品语言一致，避免顺手重构。
5. 如果页面需要新增空态、弹窗、菜单或入口，确保与现有交互一致。

## 约束边界

- 不把示例态写成真实主界面
- 不新增无需求的布局体系
- 不引入新 UI 框架
- 不改动无关路由和后端逻辑

## 验证命令

- `cd frontend && npm run build`
- `cd frontend && npm run lint`

## 交付格式

- `summary`
- `artifacts`
- `openIssues`

## 失败回退

- 如果无法完整修复，先交付最小可用 UI 修复
- 明确说明还缺什么视觉或交互边界

