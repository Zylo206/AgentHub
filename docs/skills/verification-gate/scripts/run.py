#!/usr/bin/env python3
"""Minimal verification-gate runtime."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any


SENSITIVE_KEYWORDS = ("auth", "login", "permission", "security")
PASS_KEYWORDS = ("passed", "success", "succeeded", "ok")
FAIL_KEYWORDS = ("failed", "error", "exception")


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
    return value if isinstance(value, str) else ""


def contains_any(value: str, words: tuple[str, ...]) -> bool:
    lower = value.lower()
    return any(word in lower for word in words)


def contains_keyword(value: str, keyword: str) -> bool:
    pattern = rf"\b{re.escape(keyword)}\b"
    return re.search(pattern, value, flags=re.IGNORECASE) is not None


def diff_has_sensitive_area(diff_text: str) -> bool:
    return any(contains_keyword(diff_text, keyword) for keyword in SENSITIVE_KEYWORDS)


def build_report(payload: dict[str, Any]) -> dict[str, Any]:
    task_goal = text(payload.get("task_goal")).strip()
    git_diff = text(payload.get("git_diff")).strip()
    test_log = text(payload.get("test_log"))
    lint_log = text(payload.get("lint_log"))
    build_log = text(payload.get("build_log"))

    findings: list[str] = []
    next_actions: list[str] = []
    evidence = {
        "diff_reviewed": bool(git_diff),
        "tests_run": bool(test_log.strip()),
        "build_checked": bool(build_log.strip()),
        "lint_checked": bool(lint_log.strip()),
    }

    if not git_diff:
        return {
            "status": "FAILED",
            "risk_level": "HIGH",
            "findings": ["No git diff was provided, so the change cannot be verified."],
            "evidence": evidence,
            "next_actions": [
                "Provide the patch diff before asking for a verification gate review."
            ],
        }

    if diff_has_sensitive_area(git_diff):
        findings.append("Diff touches auth, login, permission, or security related code.")

    if test_log.strip():
        if contains_any(test_log, FAIL_KEYWORDS):
            findings.append("Test log contains a failure signal.")
        elif contains_any(test_log, PASS_KEYWORDS):
            findings.append("Test log contains a pass signal.")
        else:
            findings.append("Test log was present but did not show a clear pass signal.")
    else:
        findings.append("No test log was provided for this code diff.")

    if build_log.strip() and contains_any(build_log, ("failed", "error")):
        findings.append("Build log contains a failure signal.")

    if lint_log.strip() and contains_any(lint_log, ("failed", "error")):
        findings.append("Lint log contains an error signal.")

    hard_failure = False
    if test_log.strip() and contains_any(test_log, FAIL_KEYWORDS):
        hard_failure = True
    if build_log.strip() and contains_any(build_log, ("failed", "error")):
        hard_failure = True

    if hard_failure:
        status = "FAILED"
        risk_level = "HIGH"
        next_actions.extend([
            "Fix the failing test or build output.",
            "Rerun the relevant verification commands and resubmit the logs.",
        ])
    elif lint_log.strip() and contains_any(lint_log, ("error",)):
        status = "UNVERIFIED"
        risk_level = "MEDIUM"
        next_actions.extend([
            "Resolve the lint errors or explain why they are expected.",
            "Rerun lint and attach the updated output.",
        ])
    elif not test_log.strip():
        status = "UNVERIFIED"
        risk_level = "HIGH" if diff_has_sensitive_area(git_diff) else "MEDIUM"
        next_actions.append("Run targeted tests for the changed code paths.")
        if diff_has_sensitive_area(git_diff):
            next_actions.append("Add auth, login, or security regression coverage.")
    elif contains_any(test_log, PASS_KEYWORDS):
        status = "VERIFIED"
        risk_level = "HIGH" if diff_has_sensitive_area(git_diff) else "LOW"
        next_actions.append("No blocking issues found in the supplied evidence.")
    else:
        status = "UNVERIFIED"
        risk_level = "HIGH" if diff_has_sensitive_area(git_diff) else "MEDIUM"
        next_actions.append("Provide a clearer test result that shows pass or fail.")

    if task_goal and not findings:
        findings.append("Diff reviewed against the stated task goal.")
    elif task_goal and findings:
        findings.insert(0, "Diff reviewed against the stated task goal.")

    return {
        "status": status,
        "risk_level": risk_level,
        "findings": findings,
        "evidence": evidence,
        "next_actions": next_actions,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Run the verification-gate runtime.")
    parser.add_argument("input_path", help="Path to the input JSON file.")
    args = parser.parse_args()

    try:
        payload = load_input(Path(args.input_path))
        report = build_report(payload)
    except (FileNotFoundError, ValueError, RuntimeError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    except Exception as exc:  # pragma: no cover - defensive fallback
        print(f"error: unexpected runtime failure: {exc}", file=sys.stderr)
        return 1

    print(json.dumps(report, indent=2, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
