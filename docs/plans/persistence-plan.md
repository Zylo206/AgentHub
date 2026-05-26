# Persistence Plan

本计划记录 AgentHub 从 memory repository 走向 JDBC / MySQL 验证的路线。当前原则是不默认切换 MySQL，先完成真实数据库验证 sprint。

## 当前状态

- `Done` 默认 persistence mode 仍为 `memory`，保证本地开发和 demo 稳定。
- `Done` 已有 JDBC profile 和 `schema-jdbc.sql`。
- `Done` JDBC 覆盖核心对象骨架：
  - Conversation
  - Message
  - AttachmentRecord
  - Artifact
  - TaskSpec
  - TaskRun
  - TaskStep
  - ContextSnapshot
  - PinnedContext
  - HandoffSummary
- `Done` `JdbcContextRepository` 已补齐，避免 JDBC profile 下 context 混用内存。
- `Done` `scripts/jdbc-smoke-test.mjs` 支持基础验证和 restart verify 参数。

## 活跃计划

### P0：MySQL 实库验证 sprint

目标不是默认切换数据库，而是确认 JDBC schema 和 repository 主链路真实可用。

验收范围：

- 初始化 schema。
- 创建 Conversation。
- 上传 Attachment。
- 发送 Message。
- Pin Context。
- Run Demo Task。
- 查询 TaskRun / TaskStep。
- 查询 Artifact。
- 查询 ContextSnapshot / PinnedContext / HandoffSummary。
- 重启 backend。
- 再次查询关键对象，确认不是内存态。

### P1：Repository 行为一致性

- memory 与 JDBC 的 DTO 返回结构保持一致。
- ID 序列化格式保持兼容。
- 失败信息明确区分 schema 缺失、连接失败、SQL 错误和数据不存在。

### P1：迁移策略

- 当前不引入 Flyway / Liquibase / MyBatis。
- 后续如进入长期维护，再引入 migration system。
- 附件仍可保留本地文件系统，数据库只保存 metadata。

## 配置边界

- 默认：`agenthub.persistence.mode=memory`。
- 可选：`agenthub.persistence.mode=jdbc`。
- JDBC 连接信息必须来自环境变量或本地配置，不写入仓库。
- 未提供 JDBC 连接时，不应影响 memory 模式启动。

## 暂缓

- 默认切换 MySQL。
- 全量生产 migration system。
- 多租户 schema。
- 对象存储迁移。
