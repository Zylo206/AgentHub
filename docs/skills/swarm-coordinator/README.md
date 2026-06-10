# swarm-coordinator / 多 Agent 协调器

`swarm-coordinator` is the coordination lifecycle sample for this repository.

`swarm-coordinator` 是本仓库的 coordination lifecycle 样例。

It generates a structured multi-agent task plan with bounded workers, handoff rules, acceptance criteria, and a verification plan. It does not actually launch parallel agents.

它会生成结构化的多 Agent 任务计划，包括有边界的 worker、交接规则、验收标准和验证计划，但不会真的启动并行 agent。

## Output Shape / 输出结构

The runtime emits JSON with:

```json
{
  "goal": "",
  "task_state": "PLANNED",
  "workers": [],
  "handoff_rules": [],
  "shared_context": [],
  "acceptance_criteria": [],
  "verification_required": true,
  "verification_plan": [],
  "risks": [],
  "next_step": ""
}
```

runtime 输出的 JSON 包含：

```json
{
  "goal": "",
  "task_state": "PLANNED",
  "workers": [],
  "handoff_rules": [],
  "shared_context": [],
  "acceptance_criteria": [],
  "verification_required": true,
  "verification_plan": [],
  "risks": [],
  "next_step": ""
}
```

## Usage / 使用方式

Single run:

```powershell
python tools/skill_runner.py skills/swarm-coordinator skills/swarm-coordinator/tests/cases/001-basic-plan.input.json
```

单个运行：

```powershell
python tools/skill_runner.py skills/swarm-coordinator skills/swarm-coordinator/tests/cases/001-basic-plan.input.json
```

Batch tests:

```powershell
python tools/run_skill_tests.py skills/swarm-coordinator
```

批量测试：

```powershell
python tools/run_skill_tests.py skills/swarm-coordinator
```

## Safety Boundary / 安全边界

- keep worker plans bounded / 保持 worker 计划有边界
- keep handoff rules explicit / 保持交接规则明确
- do not execute shell commands / 不执行 shell 命令
- do not modify source code / 不修改源码

