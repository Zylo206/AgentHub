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

    PinnedContext savePinnedContext(PinnedContext pinnedContext);

    Optional<PinnedContext> findPinnedContextById(String pinnedContextId);

    Optional<PinnedContext> findPinnedContextBySource(ConversationId conversationId, String sourceType, String sourceId);

    List<PinnedContext> findPinnedContextsByConversationId(ConversationId conversationId);

    void deletePinnedContext(String pinnedContextId);

    HandoffSummary saveHandoffSummary(HandoffSummary summary);

    List<HandoffSummary> findHandoffSummariesByTaskRunId(TaskRunId taskRunId);
}
