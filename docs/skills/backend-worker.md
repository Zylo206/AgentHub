# Backend Worker Skill

## 1. Skill 目标

Backend Worker Skill 用于处理接口、数据模型、服务逻辑、数据流设计等后端相关任务。

在 MVP 阶段，该 Skill 不一定必须输出真实后端业务代码。若 Demo 场景不需要真实后端，它应优先输出 API Contract、Data Model 或服务设计说明。

## 2. 输入 Input

Backend Worker 至少需要以下输入：

- Task Spec
- 当前 TaskStep 描述
- 与前端相关的必要 Artifact
- Handoff Summary

典型输入包括：

- 页面字段和交互要求
- 登录模式说明
- 约束条件
- 需要对齐的接口数据格式

## 3. 输出 Output

输出可以包括：

- API Contract
- Request / Response Schema
- Data Model
- Service Logic Draft
- 补充说明文档

## 4. 负责 Agent

默认负责 Agent：

- Backend Worker

也允许用户自定义 Agent 绑定该 Skill。

## 5. 可生成的接口草案 / 数据模型 / 服务逻辑

MVP 阶段推荐输出：

- 登录接口定义
- 验证码接口定义
- 用户登录请求体和响应体结构
- 简化的数据模型说明

不强制要求：

- 完整数据库表结构
- 完整服务端实现

## 6. 必需上下文 Required Context

执行前需要：

- taskSpecId
- acceptanceCriteria
- 当前前端页面需要哪些接口能力
- 上游 Agent 生成的字段和表单结构

## 7. 执行步骤

1. 读取 Task Spec，识别是否存在接口或数据层需求
2. 查看 Frontend Builder 已产出的页面字段与交互
3. 定义最小 API Contract 或 Data Model
4. 输出结构化 Artifact
5. 返回与前端协作相关的关键说明

## 8. 验证规则 Verification Rules

- 输出必须与前端交互要求对齐
- 接口字段命名要清晰一致
- 若只是草案，必须明确标注 draft 性质
- 不要虚构已经存在的真实服务实现

## 9. 失败处理 Failure Handling

如果当前任务不需要真实后端：

- 直接输出 API Contract 或 Data Model
- 标记为 MVP draft

如果信息不足：

- 明确指出缺失的字段或约束
- 把不确定项写入 openIssues

## 10. 对 AgentHub 的意义

Backend Worker Skill 的价值不在于“多写几行后端代码”，而在于：

- 让多 Agent 协作更完整
- 让前端产物和接口契约之间存在明确连接
- 帮助评委看到 Agent 间真正存在上下游关系
