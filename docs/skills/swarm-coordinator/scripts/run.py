#!/usr/bin/env python3
"""Minimal swarm-coordinator runtime."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any


DOC_KEYWORDS = ("readme", "docs", "documentation", "文档", "说明")
VERIFY_KEYWORDS = ("test", "verify", "validation", "验证", "测试")
VALID_STATES = {
    "PLANNED",
    "RESEARCHING",
    "IMPLEMENTING",
    "VERIFYING",
    "DONE",
    "BLOCKED",
    "FAILED",
}
DEFAULT_ROLES = ["research", "implementation", "verification"]
DOC_ROLE = "documentation"


def load_input(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise FileNotFoundError(f"input file not found: {path}")
    try:
        raw = path.read_text(encoding="utf-8")
    except OSError as exc:
        raise RuntimeError(f"failed to read input file: {path}") from exc
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError(f"invalid JSON in input file: {path}: {exc}") from exc
    if not isinstance(data, dict):
        raise ValueError("input JSON must be an object")
    return data


def text(value: Any) -> str:
    return value.strip() if isinstance(value, str) else ""


def normalize_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    result: list[str] = []
    for item in value:
        if isinstance(item, str):
            stripped = item.strip()
            if stripped:
                result.append(stripped)
    return result


def format_artifact(artifact: dict[str, Any]) -> str:
    path = text(artifact.get("path"))
    kind = text(artifact.get("type"))
    summary = text(artifact.get("summary"))
    prefix = " / ".join(part for part in [path, kind] if part)
    if prefix and summary:
        return f"{prefix}: {summary}"
    if prefix:
        return prefix
    return summary


def contains_any(haystack: str, needles: tuple[str, ...]) -> bool:
    lower = haystack.lower()
    return any(needle.lower() in lower for needle in needles)


def build_shared_context(payload: dict[str, Any], goal: str) -> list[str]:
    items: list[str] = []
    context = text(payload.get("context"))
    if context:
        items.append(f"Context: {context}")
    for constraint in normalize_list(payload.get("constraints")):
        items.append(f"Constraint: {constraint}")
    for file_name in normalize_list(payload.get("changed_files")):
        items.append(f"Changed file: {file_name}")
    artifacts = payload.get("artifacts")
    if isinstance(artifacts, list):
        for artifact in artifacts:
            if isinstance(artifact, dict):
                formatted = format_artifact(artifact)
                if formatted:
                    items.append(f"Artifact: {formatted}")
    if goal:
        items.insert(0, f"Goal: {goal}")
    return items


def build_workers(goal: str, shared_context: list[str], doc_enabled: bool) -> list[dict[str, Any]]:
    roles = list(DEFAULT_ROLES)
    if doc_enabled:
        roles.insert(2, DOC_ROLE)

    workers: list[dict[str, Any]] = []
    for index, role in enumerate(roles):
        if role == "research":
            task = f"Research the goal and identify constraints, dependencies, and open questions for: {goal}"
            expected_output = "A bounded research report with facts, dependencies, and clarifications."
            handoff_to = ["implementation"]
        elif role == "implementation":
            task = "Implement the agreed changes within the bounded scope from research."
            expected_output = "A constrained implementation plan or patch summary."
            handoff_to = [DOC_ROLE] if doc_enabled else ["verification"]
        elif role == DOC_ROLE:
            task = "Prepare or update the documentation plan for the agreed changes."
            expected_output = "A concise documentation delta with preserved user constraints."
            handoff_to = ["verification"]
        else:
            task = "Verify the output against the goal, constraints, and acceptance criteria."
            expected_output = "A verification report with findings and a decision."
            handoff_to = []

        workers.append(
            {
                "role": role,
                "task": task,
                "input": ["goal", "shared_context"] if role != "verification" else ["worker_outputs", "acceptance_criteria"],
                "expected_output": expected_output,
                "handoff_to": handoff_to,
            }
        )

    if workers:
        workers[0]["handoff_to"] = ["implementation"]
        if doc_enabled:
            workers[1]["handoff_to"] = [DOC_ROLE]
            workers[2]["handoff_to"] = ["verification"]
            workers[-1]["handoff_to"] = []
        else:
            workers[1]["handoff_to"] = ["verification"]
            workers[-1]["handoff_to"] = []

    return workers


def build_handoff_rules(workers: list[dict[str, Any]]) -> list[str]:
    rules: list[str] = []
    for index, worker in enumerate(workers):
        targets = worker.get("handoff_to", [])
        if targets:
            rules.append(f"{worker['role']} hands off to {', '.join(targets)} with its expected output.")
        else:
            rules.append(f"{worker['role']} is terminal and should deliver the final coordinated output.")
    return rules


def goal_is_ambiguous(goal: str) -> bool:
    lower = goal.strip().lower()
    words = [word for word in re.split(r"\s+", lower) if word]
    vague_terms = {"this", "it", "that", "something", "improve", "fix"}
    return len(words) <= 3 or any(term in lower for term in vague_terms)


def build_plan(payload: dict[str, Any]) -> dict[str, Any]:
    goal = text(payload.get("goal"))
    if not goal:
        raise ValueError("goal is required and must be non-empty")

    context = text(payload.get("context"))
    constraints = normalize_list(payload.get("constraints"))
    changed_files = normalize_list(payload.get("changed_files"))
    artifacts_raw = payload.get("artifacts")
    require_verification = payload.get("require_verification", True)
    if not isinstance(require_verification, bool):
        require_verification = bool(require_verification)

    preferred_state = text(payload.get("preferred_state")).upper()
    task_state = preferred_state if preferred_state in VALID_STATES else "PLANNED"

    doc_enabled = contains_any(goal, DOC_KEYWORDS) or contains_any(context, DOC_KEYWORDS)
    verify_emphasis = contains_any(goal, VERIFY_KEYWORDS) or contains_any(context, VERIFY_KEYWORDS)

    shared_context = build_shared_context(payload, goal)
    workers = build_workers(goal, shared_context, doc_enabled)
    handoff_rules = build_handoff_rules(workers)

    acceptance_criteria = [
        "The goal is preserved and addressed.",
        "All constraints are respected.",
        "Verification plan is completed.",
    ]
    verification_plan = [
        "Review worker outputs.",
        "Check acceptance criteria.",
        "Validate final result against user constraints.",
    ]

    risks: list[str] = []
    if goal_is_ambiguous(goal):
        risks.append("Ambiguous goal may cause incorrect task decomposition.")
    if not constraints:
        risks.append("No explicit constraints were provided.")
    if not require_verification:
        risks.append("Verification is disabled.")
    if verify_emphasis and "verification" not in {worker["role"] for worker in workers}:
        risks.append("Verification emphasis was detected but no verification worker was planned.")

    if doc_enabled:
        next_step = "Start with the research worker and produce a bounded research report."
    else:
        next_step = f"Start with the {workers[0]['role']} worker and produce a bounded research report."

    if task_state == "PLANNED" and goal_is_ambiguous(goal):
        task_state = "PLANNED"

    return {
        "goal": goal,
        "task_state": task_state,
        "workers": workers,
        "handoff_rules": handoff_rules,
        "shared_context": shared_context,
        "acceptance_criteria": acceptance_criteria,
        "verification_required": require_verification,
        "verification_plan": verification_plan,
        "risks": risks,
        "next_step": next_step,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Run the swarm-coordinator runtime.")
    parser.add_argument("input_path", help="Path to the input JSON file.")
    args = parser.parse_args()

    try:
        payload = load_input(Path(args.input_path))
        plan = build_plan(payload)
    except (FileNotFoundError, ValueError, RuntimeError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    except Exception as exc:  # pragma: no cover - defensive fallback
        print(f"error: unexpected runtime failure: {exc}", file=sys.stderr)
        return 1

    print(json.dumps(plan, indent=2, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
