# MySQL Profile Spec

## 目标

定义 AgentHub 的 MySQL/JDBC profile 如何从“已验证可用”推进到“工程化可维护”。
该 spec 约束的是持久化运行模式、初始化体验、验证方式和边界，不要求默认切换到 MySQL。

## 范围

- `agenthub.persistence.mode=memory|jdbc` 的行为边界。
- MySQL/JDBC schema 初始化和补列策略。
- JDBC repository 覆盖对象。
- create/query/update/restart verify 验证链路。
- 本地开发、半生产验证和演示环境的配置方式。
- MySQL profile 与默认 memory profile 的兼容关系。

## 非目标

- 不把 MySQL 设为默认 runtime。
- 不引入 MyBatis、JPA 或完整 migration framework。
- 不做多租户、RBAC、读写分离、分库分表。
- 不把附件二进制内容写入数据库；数据库只保存 metadata 和 storage key。
- 不要求默认 smoke 依赖 MySQL。
- 不在仓库中写入真实数据库密码。

## Current Behavior

- 默认运行模式仍是 `memory`，适合本地开发和稳定 demo。
- `jdbc` profile 已有 schema、JDBC repository 和 opt-in 验证脚本。
- `scripts/mysql-init-profile.mjs` 提供 opt-in MySQL 初始化体验：创建数据库、应用 `schema-jdbc.sql`、输出下一步 JDBC env。
- 已验证核心对象在真实 MySQL-compatible 环境下可 create / query / restart restore。
- `jdbc-smoke-test.mjs` 覆盖 Conversation、Message、Attachment、Artifact、TaskRun、PinnedContext、ContextSnapshot、HandoffSummary、Agent、ApprovalRequest、ActionAuditLog、MemoryItem、Deployment、ArtifactSnapshot。
- MySQL profile 仍是 opt-in 验证能力，不是完整生产数据库治理体系。

## 核心模型

### Persistence Mode

- `memory`: 默认模式，进程重启后业务数据丢失，适合快速开发和无依赖 demo。
- `jdbc`: 可选模式，使用 MySQL/JDBC 保存核心业务对象，适合半生产验证和恢复能力测试。

### 配置

- `agenthub.persistence.mode=memory|jdbc`
- `agenthub.persistence.jdbc.url`
- `agenthub.persistence.jdbc.username`
- `agenthub.persistence.jdbc.password`
- 环境变量可覆盖上述配置。
- 初始化脚本可使用 `AGENTHUB_MYSQL_HOST`、`AGENTHUB_MYSQL_PORT`、`AGENTHUB_MYSQL_DATABASE`、`AGENTHUB_MYSQL_USERNAME`、`AGENTHUB_MYSQL_PASSWORD`、`AGENTHUB_MYSQL_COMMAND`。

### 持久化对象

- Conversation
- Message
- Agent
- AttachmentRecord
- Artifact
- ArtifactSnapshot
- DeploymentRecord
- TaskSpec
- TaskRun
- TaskStep
- PinnedContext
- ContextSnapshot
- HandoffSummary
- MemoryItem
- ApprovalRequest
- ActionAuditLog

## 关键流程

1. 开发默认启动时使用 `memory` profile。
2. 验证 MySQL 时先创建测试数据库。
3. 执行 `node scripts/mysql-init-profile.mjs` 或手动执行 `schema-jdbc.sql` 初始化表结构。
4. 使用 `jdbc` profile 启动 backend。
5. 运行 `node scripts/jdbc-smoke-test.mjs create` 或等价 create 流程。
6. 创建 Conversation、Message、Attachment、TaskRun、Artifact、Context、Approval、Audit 等对象。
7. 停止并重启 backend。
8. 使用 verify 流程再次查询同一批对象。
9. 验证 attachment metadata 与 download、deployment preview、snapshot history 仍可恢复。
10. 验证完成后保持默认配置不变，不将 MySQL 切成默认运行模式。

## 初始化规则

- schema 文件必须可重复执行，尽量使用 `CREATE TABLE IF NOT EXISTS`。
- 新字段应提供安全补列策略，避免已有本地测试库直接失败。
- 初始化脚本只负责表结构，不写入真实 API key、用户隐私数据或外部账号凭证。
- 不允许把本机数据库密码写入 README、spec、dev-log 或 `.env.example`。

## Repository 规则

- application 层依赖 repository 接口，不直接依赖具体 JDBC 实现。
- JDBC repository 的行为必须与 memory repository 的业务语义一致。
- 新增核心领域对象时，必须判断是否需要同时补 memory repository、JDBC repository、schema 和 smoke verify。
- JSON 字段可以用于保存快速变化的 execution metadata，但高频查询字段应保留独立列。
- ActionAuditLog 应保持 append-only 语义。

## 验收标准

- memory profile 在未配置数据库时仍可完整运行默认 smoke。
- jdbc profile 能在真实 MySQL-compatible 实例上完成 create/query/update/restart verify。
- backend 重启后，Conversation、Message、AttachmentRecord、Artifact、TaskRun、Context、Memory、Approval、Audit、Deployment、ArtifactSnapshot 可查询。
- attachment download 能通过 metadata 找回本地文件或给出清晰失败。
- 缺失 JDBC 配置时，错误信息必须清晰，不应误报为业务逻辑失败。
- `jdbc-smoke-test.mjs` 失败时必须非 0 exit，不能伪装成功。
- `mysql-init-profile.mjs` 失败时必须非 0 exit，并明确是 mysql CLI、连接、建库还是 schema 初始化问题。
- MySQL 验证结果必须在 dev-log 中说明是否真实执行。

## Fallback / Boundary

- MySQL profile 是半生产验证路径，不是默认生产部署方案。
- 当前没有完整 migration system；schema 演进仍依赖显式 SQL 和补列。
- 当前没有连接池调优、备份恢复、慢查询治理或生产安全基线。
- 当前没有多节点一致性、事务补偿或分布式锁。
- memory profile 仍是默认稳定路径；MySQL 验证失败不应破坏默认 demo。
- 后续若进入完整生产化，再评估 Flyway/Liquibase、连接池配置、备份策略和数据库权限分层。
