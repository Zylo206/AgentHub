package com.agenthub.application.orchestrator;

import com.agenthub.domain.approval.ApprovalRequest;
import com.agenthub.domain.task.TaskRun;
import java.util.List;

public record OrchestratorAutoTriggerResult(
        boolean enabled,
        String mode,
        boolean requireApproval,
        boolean matched,
        String decision,
        String reason,
        List<String> matchedKeywords,
        ApprovalRequest pendingApproval,
        TaskRun taskRun) {

    public static OrchestratorAutoTriggerResult disabled(String mode, boolean requireApproval) {
        return new OrchestratorAutoTriggerResult(
                false,
                mode,
                requireApproval,
                false,
                "DISABLED",
                "Message-level orchestrator auto trigger is disabled.",
                List.of(),
                null,
                null);
    }
}
