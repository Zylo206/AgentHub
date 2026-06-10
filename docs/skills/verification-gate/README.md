# verification-gate / 验证关卡

`verification-gate` is the verification lifecycle sample for this repository.

`verification-gate` 是本仓库的 verification lifecycle 样例。

It reads a task goal and the available diff/log context, then emits a structured verification report. It does not modify source code, commit, or push.

它读取任务目标以及 diff / 日志上下文，然后输出结构化 verification report。它不会修改源码，也不会 commit 或 push。

## Output Shape / 输出结构

The runtime emits JSON with:

```json
{
  "status": "VERIFIED",
  "risk_level": "LOW",
  "findings": [],
  "evidence": {
    "diff_reviewed": true,
    "tests_run": true,
    "build_checked": true,
    "lint_checked": true
  },
  "next_actions": []
}
```

runtime 输出的 JSON 包含：

```json
{
  "status": "VERIFIED",
  "risk_level": "LOW",
  "findings": [],
  "evidence": {
    "diff_reviewed": true,
    "tests_run": true,
    "build_checked": true,
    "lint_checked": true
  },
  "next_actions": []
}
```

## Usage / 使用方式

Single run:

```powershell
python tools/skill_runner.py skills/verification-gate skills/verification-gate/tests/cases/001-no-test-log.input.json
```

单个运行：

```powershell
python tools/skill_runner.py skills/verification-gate skills/verification-gate/tests/cases/001-no-test-log.input.json
```

Batch tests:

```powershell
python tools/run_skill_tests.py skills/verification-gate
```

批量测试：

```powershell
python tools/run_skill_tests.py skills/verification-gate
```

## Safety Boundary / 安全边界

- read diff, test logs, build logs, and lint logs / 读取 diff、测试日志、构建日志和 lint 日志
- never modify source code / 不修改源码
- never commit or push / 不 commit 或 push
- keep the output read-only and structured / 保持只读且结构化输出

