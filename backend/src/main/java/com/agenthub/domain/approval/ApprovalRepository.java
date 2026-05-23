package com.agenthub.domain.approval;

import com.agenthub.domain.conversation.ConversationId;
import java.util.List;
import java.util.Optional;

public interface ApprovalRepository {

    ApprovalRequest save(ApprovalRequest approvalRequest);

    Optional<ApprovalRequest> findById(String approvalId);

    List<ApprovalRequest> findByConversationId(ConversationId conversationId);
}
