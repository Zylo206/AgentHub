package com.agenthub.infrastructure.persistence.memory;

import com.agenthub.domain.approval.ApprovalRepository;
import com.agenthub.domain.approval.ApprovalRequest;
import com.agenthub.domain.conversation.ConversationId;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Repository;

@Repository
public class InMemoryApprovalRepository implements ApprovalRepository {

    private final ConcurrentHashMap<String, ApprovalRequest> storage = new ConcurrentHashMap<>();

    @Override
    public ApprovalRequest save(ApprovalRequest approvalRequest) {
        storage.put(approvalRequest.getApprovalId(), approvalRequest);
        return approvalRequest;
    }

    @Override
    public Optional<ApprovalRequest> findById(String approvalId) {
        return Optional.ofNullable(storage.get(approvalId));
    }

    @Override
    public List<ApprovalRequest> findByConversationId(ConversationId conversationId) {
        return storage.values().stream()
                .filter(approvalRequest -> approvalRequest.getConversationId().equals(conversationId))
                .sorted(Comparator.comparing(ApprovalRequest::getCreatedAt).reversed())
                .toList();
    }
}
