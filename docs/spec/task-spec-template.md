# 任务规格 Task Spec 模板

## 1. Task Spec 的作用

任务规格 Task Spec 是 Orchestrator 在执行前使用的结构化任务描述。它的作用不是替代用户原始输入，而是把自然语言需求整理成后续可执行、可路由、可验证的对象。

Task Spec 的核心价值：

- 把用户需求转成稳定输入
- 为 TaskPlan 提供结构化基础
- 为 Routing Rules 提供判断依据
- 为 Reviewer 提供 Acceptance Criteria
- 为 Artifact 定义目标形态

## 2. 通用模板

```json
{
  "taskSpecId": "spec_001",
  "title": "Build login page and supporting docs",
  "userGoal": "生成一个支持邮箱登录和验证码登录的 React 登录页面，并补充 README，最后做质量检查。",
  "userInput": "帮我生成一个 React 登录页面，要求支持邮箱登录和验证码登录，同时生成 README，最后检查代码质量并给出修改建议。",
  "scope": [
    "React 登录页面",
    "README 文档",
    "基础质量检查"
  ],
  "nonGoals": [
    "真实后端服务实现",
    "完整部署流程",
    "多端同步"
  ],
  "acceptanceCriteria": [
    "页面包含邮箱登录和验证码登录两种模式",
    "代码结构清晰，便于后续修改",
    "提供一份 README 说明页面用途和使用方式",
    "Reviewer 输出结构化检查结果"
  ],
  "requiredSkills": [
    "frontend-builder",
    "backend-worker",
    "reviewer"
  ],
  "expectedArtifacts": [
    "CODE",
    "MARKDOWN",
    "REVIEW_REPORT"
  ],
  "constraints": [
    "主入口必须是聊天工作台",
    "MVP 只考虑 Web 端",
    "不依赖复杂外部平台深度集成"
  ],
  "risks": [
    "前端预览能力不足",
    "上下文过长导致协作不稳定"
  ],
  "fallbackPlan": [
    "后端能力不足时只输出 API Contract",
    "Web Preview 不稳定时使用 Code Card + Markdown Card 兜底"
  ]
}
```

## 3. 字段说明

| 字段 | 说明 |
|---|---|
| taskSpecId | Task Spec 唯一标识 |
| title | 任务标题 |
| userGoal | 结构化后的用户目标 |
| userInput | 用户原始输入 |
| scope | 本次任务要覆盖的范围 |
| nonGoals | 明确不做的内容 |
| acceptanceCriteria | 验收标准 |
| requiredSkills | 所需 Skill 列表 |
| expectedArtifacts | 预期产物类型 |
| constraints | 强约束 |
| risks | 风险点 |
| fallbackPlan | 执行失败时的兜底方案 |

## 4. 示例

### 简化示例

```json
{
  "taskSpecId": "spec_demo_login",
  "title": "React login page demo",
  "userGoal": "生成登录页并补文档和 review。",
  "requiredSkills": ["frontend-builder", "reviewer"],
  "expectedArtifacts": ["CODE", "MARKDOWN", "REVIEW_REPORT"]
}
```

## 5. 验收标准写法建议

Acceptance Criteria 必须：

- 可验证
- 不含歧义
- 和最终 Artifact 相关

推荐写法：

- 页面至少包含两种登录模式
- README 说明页面用途和运行方式
- Review Report 包含 Passed、Issues、Suggestions、Risk Level

不推荐写法：

- 页面好看
- 代码质量高
- 看起来不错

## 6. 如何被 Orchestrator 使用

Orchestrator 会围绕 Task Spec 做三件事：

1. 生成 TaskPlan
2. 选择 requiredSkills
3. 根据 acceptanceCriteria 判断是否需要 Reviewer 参与

示例逻辑：

```text
if scope contains UI:
  require frontend-builder

if scope contains API or data model:
  require backend-worker

always require reviewer when acceptanceCriteria is non-empty
```

## 7. 如何与 Skill / Rules / Artifact 关联

### 与 Skill 的关系

- requiredSkills 决定需要哪些能力单元
- Skill 文档规定每种能力如何执行、生成什么 Artifact

### 与 Rules 的关系

- Routing Rules 根据 Task Spec 的 scope、constraints、requiredSkills 路由 Agent
- Handoff Rules 根据 Task Spec 决定哪些内容必须传递

### 与 Artifact 的关系

- expectedArtifacts 明确系统希望输出什么
- Reviewer 按 Artifact 和 acceptanceCriteria 共同判断结果是否达标
