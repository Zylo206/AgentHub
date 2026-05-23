package com.agenthub.domain.audit;

import com.agenthub.domain.conversation.ConversationId;
import java.util.List;

public interface ActionAuditRepository {

    ActionAuditLog save(ActionAuditLog auditLog);

    List<ActionAuditLog> findByConversationId(ConversationId conversationId);
}
