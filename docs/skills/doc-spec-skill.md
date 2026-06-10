# Documentation / Spec Skill

## 适用场景

用于产品设计文档、技术设计文档、spec、rules、计划和协作规范整理任务。

## 输入前提

- 当前文档路径
- 要更新的主题
- 真实实现边界
- 需要同步的代码或验收点

## 修改范围

- `docs/product-design.md`
- `docs/technical-design.md`
- `docs/spec/**`
- `docs/rules/**`
- `docs/plans/**`
- `docs/collaboration/**`

## 执行步骤

1. 先区分这次是写 `spec`、`rules`、`plan` 还是产品 / 技术文档。
2. 只写可验证事实，不写过程故事。
3. 明确区分真实能力、fallback、静态演示和设计目标。
4. 文档结构保持简洁、可扫描、可复用。
5. 如需新增规范，优先补索引和入口，不要散落新增。

## 约束边界

- 不把 Mock、placeholder、demo 目标写成真实现状
- 不重复写已经存在的规则
- 不扩写成大段说明文
- 不把未完成项写成已完成

## 验证命令

- 读回相关文档确认结构一致
- 必要时同步检查对应代码或验收点

## 交付格式

- `summary`
- `artifacts`
- `openIssues`

## 失败回退

- 如果信息不足，先写清楚边界和待补点
- 不要编造缺失的实现细节

