# Routing Rules

## 1. Orchestrator 路由规则

Routing Rules 定义 Orchestrator 如何把 TaskSpec 或 TaskStep 分派给合适的 Agent。

核心原则：

- 根据任务内容路由，不根据随机偏好路由
- 优先 Specialist Agent，最后再进入 Reviewer
- 多步骤任务必须有清晰顺序和依赖关系

## 2. Frontend Builder 选择规则

以下任务应优先路由到 Frontend Builder：

- 页面
- 组件
- UI
- 样式
- 表单
- 交互
- Web Preview

示例：

- 生成 React 登录页
- 调整按钮颜色
- 添加 loading 状态

## 3. Backend Worker 选择规则

以下任务应优先路由到 Backend Worker：

- 接口
- 数据库
- 数据模型
- 服务逻辑
- API Contract

示例：

- 设计登录接口
- 输出验证码接口响应格式
- 设计用户数据模型

## 4. Reviewer 选择规则

以下任务应优先路由到 Reviewer：

- 检查
- 验收
- 质量
- 安全
- Review

示例：

- 检查是否满足 Acceptance Criteria
- 给出代码质量建议

## 5. 多 Agent 任务排序规则

多步骤任务推荐顺序：

1. 先执行 Specialist Agent
2. 再执行下游 Specialist Agent
3. 最后执行 Reviewer

在 Demo 场景中通常是：

1. Frontend Builder
2. Backend Worker
3. Reviewer

## 6. 路由冲突处理

若同一任务同时命中多个规则：

- 优先根据主产物判断
- 若主产物是页面，先给 Frontend Builder
- 若主产物是接口或数据结构，先给 Backend Worker
- Reviewer 永远不抢主产物生成

## 7. 示例

### 示例 1

任务：

“帮我做一个登录页面，并生成 README，最后检查质量。”

路由结果：

- 页面 -> Frontend Builder
- README -> Frontend Builder 或 Backend Worker 附带输出
- 质量检查 -> Reviewer

### 示例 2

任务：

“设计用户登录接口和响应结构。”

路由结果：

- API Contract -> Backend Worker
- Review -> Reviewer

## 8. 对实现的指导意义

后续实现中，Routing Rules 可作为：

- Orchestrator 生成 TaskPlan 后的分配依据
- AgentRouter 的规则表
- 前端路由说明卡片的展示依据
