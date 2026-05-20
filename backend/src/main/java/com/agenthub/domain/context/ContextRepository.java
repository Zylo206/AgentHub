package com.agenthub.domain.context;

import com.agenthub.domain.conversation.ConversationId;
import com.agenthub.domain.task.TaskRunId;
import java.util.List;
import java.util.Optional;

public interface ContextRepository {

    ContextSnapshot saveContextSnapshot(ContextSnapshot snapshot);

    Optional<ContextSnapshot> findContextSnapshotById(ContextSnapshotId id);

    List<ContextSnapshot> findContextSnapshotsByConversationId(ConversationId conversationId);

    List<ContextSnapshot> findContextSnapshotsByTaskRunId(TaskRunId taskRunId);

    HandoffSummary saveHandoffSummary(HandoffSummary summary);

    List<HandoffSummary> findHandoffSummariesByTaskRunId(TaskRunId taskRunId);
}
