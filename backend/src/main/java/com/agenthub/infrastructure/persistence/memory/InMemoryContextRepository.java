package com.agenthub.infrastructure.persistence.memory;

import com.agenthub.domain.context.ContextRepository;
import com.agenthub.domain.context.ContextSnapshot;
import com.agenthub.domain.context.ContextSnapshotId;
import com.agenthub.domain.context.HandoffSummary;
import com.agenthub.domain.context.PinnedContext;
import com.agenthub.domain.conversation.ConversationId;
import com.agenthub.domain.task.TaskRunId;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Repository;

@Repository
public class InMemoryContextRepository implements ContextRepository {

    private final ConcurrentHashMap<String, ContextSnapshot> contextSnapshotStorage = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, HandoffSummary> handoffSummaryStorage = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, PinnedContext> pinnedContextStorage = new ConcurrentHashMap<>();

    @Override
    public ContextSnapshot saveContextSnapshot(ContextSnapshot snapshot) {
        contextSnapshotStorage.put(snapshot.getId().value(), snapshot);
        return snapshot;
    }

    @Override
    public Optional<ContextSnapshot> findContextSnapshotById(ContextSnapshotId id) {
        return Optional.ofNullable(contextSnapshotStorage.get(id.value()));
    }

    @Override
    public List<ContextSnapshot> findContextSnapshotsByConversationId(ConversationId conversationId) {
        return contextSnapshotStorage.values().stream()
                .filter(snapshot -> snapshot.getConversationId().equals(conversationId))
                .sorted(Comparator.comparing(ContextSnapshot::getCreatedAt))
                .toList();
    }

    @Override
    public List<ContextSnapshot> findContextSnapshotsByTaskRunId(TaskRunId taskRunId) {
        return contextSnapshotStorage.values().stream()
                .filter(snapshot -> snapshot.getTaskRunId().equals(taskRunId))
                .sorted(Comparator.comparing(ContextSnapshot::getCreatedAt))
                .toList();
    }

    @Override
    public PinnedContext savePinnedContext(PinnedContext pinnedContext) {
        pinnedContextStorage.put(pinnedContext.getId(), pinnedContext);
        return pinnedContext;
    }

    @Override
    public Optional<PinnedContext> findPinnedContextById(String pinnedContextId) {
        return Optional.ofNullable(pinnedContextStorage.get(pinnedContextId));
    }

    @Override
    public Optional<PinnedContext> findPinnedContextBySource(
            ConversationId conversationId,
            String sourceType,
            String sourceId) {
        return pinnedContextStorage.values().stream()
                .filter(pinnedContext -> pinnedContext.getConversationId().equals(conversationId))
                .filter(pinnedContext -> pinnedContext.getSourceType().equals(sourceType))
                .filter(pinnedContext -> pinnedContext.getSourceId().equals(sourceId))
                .findFirst();
    }

    @Override
    public List<PinnedContext> findPinnedContextsByConversationId(ConversationId conversationId) {
        return pinnedContextStorage.values().stream()
                .filter(pinnedContext -> pinnedContext.getConversationId().equals(conversationId))
                .sorted(Comparator.comparing(PinnedContext::getCreatedAt))
                .toList();
    }

    @Override
    public void deletePinnedContext(String pinnedContextId) {
        pinnedContextStorage.remove(pinnedContextId);
    }

    @Override
    public HandoffSummary saveHandoffSummary(HandoffSummary summary) {
        handoffSummaryStorage.put(summary.getId(), summary);
        return summary;
    }

    @Override
    public List<HandoffSummary> findHandoffSummariesByTaskRunId(TaskRunId taskRunId) {
        return handoffSummaryStorage.values().stream()
                .filter(summary -> summary.getTaskRunId().equals(taskRunId))
                .sorted(Comparator.comparing(HandoffSummary::getCreatedAt))
                .toList();
    }
}
