# Source Notes / 源说明

This skill was derived from these Claude Code concepts:

- forked agent review flows
- task-based separation between implementation and verification
- stricter internal prompt rules around honesty and explicit validation

这个 skill 参考了以下 Claude Code 思路：

- forked agent review flows
- 将 implementation 和 verification 分离
- 在 prompt 里强化诚实和显式验证规则

Portable extraction decisions:

- keep verifier behavior read-only by default
- keep "findings first" output
- avoid host-specific task APIs in the public version

可移植化时的处理原则：

- verifier 默认保持只读
- 输出保持 “findings first”
- 公开版本避免使用 host-specific task API

