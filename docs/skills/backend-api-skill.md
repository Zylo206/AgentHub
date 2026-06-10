# Backend API Skill

## 适用场景

用于接口、服务、数据模型、权限、持久化和编排逻辑任务。

## 输入前提

- Task Spec
- 相关 API 或 service 路径
- 交互约束
- 期望请求 / 响应
- 验收标准

## 修改范围

- `backend/src/main/java/com/agenthub/api/**`
- `backend/src/main/java/com/agenthub/application/**`
- `backend/src/main/java/com/agenthub/domain/**`
- `backend/src/main/java/com/agenthub/infrastructure/**`
- `backend/src/main/resources/**`

## 执行步骤

1. 先确认问题属于接口、服务还是持久化层。
2. 对齐现有领域模型和返回结构。
3. 优先复用已有 service、repository、validator。
4. 保持 REST 返回和现有 `ApiResponse` 风格一致。
5. 变更后补齐必要的失败分支和边界返回。

## 约束边界

- 不伪造已存在的后端接口
- 不绕过现有权限、审计、审批链路
- 不引入额外数据库或持久化框架
- 不改动无关业务流程

## 验证命令

- `cd backend && mvn clean package -DskipTests`
- `cd backend && mvn test`

## 交付格式

- `summary`
- `artifacts`
- `openIssues`

## 失败回退

- 如果无法完成全链路，先输出 API contract 或 service draft
- 明确写出缺失字段、缺失表或未闭合权限

