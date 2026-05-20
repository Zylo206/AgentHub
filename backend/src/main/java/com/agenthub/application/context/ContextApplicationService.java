package com.agenthub.application.context;

import com.agenthub.domain.context.ContextRepository;
import com.agenthub.domain.context.ContextSnapshot;
import com.agenthub.domain.context.ContextSnapshotId;
import com.agenthub.domain.context.HandoffSummary;
import com.agenthub.domain.conversation.ConversationId;
import com.agenthub.domain.task.TaskRunId;
import java.util.List;
import java.util.NoSuchElementException;
import org.springframework.stereotype.Service;

@Service
public class ContextApplicationService {

    private final ContextRepository contextRepository;

    public ContextApplicationService(ContextRepository contextRepository) {
        this.contextRepository = contextRepository;
    }

    public ContextSnapshot getContextSnapshot(String contextSnapshotId) {
        return contextRepository.findContextSnapshotById(new ContextSnapshotId(contextSnapshotId))
                .orElseThrow(() -> new NoSuchElementException("ContextSnapshot not found: " + contextSnapshotId));
    }

    public List<ContextSnapshot> listContextSnapshotsByConversation(String conversationId) {
        return contextRepository.findContextSnapshotsByConversationId(new ConversationId(conversationId));
    }

    public List<ContextSnapshot> listContextSnapshotsByTaskRun(String taskRunId) {
        return contextRepository.findContextSnapshotsByTaskRunId(new TaskRunId(taskRunId));
    }

    public List<HandoffSummary> listHandoffSummariesByTaskRun(String taskRunId) {
        return contextRepository.findHandoffSummariesByTaskRunId(new TaskRunId(taskRunId));
    }
}
