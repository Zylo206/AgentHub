package com.agenthub.infrastructure.persistence.memory;

import com.agenthub.domain.audit.ActionAuditLog;
import com.agenthub.domain.audit.ActionAuditRepository;
import com.agenthub.domain.conversation.ConversationId;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Repository;

@Repository
public class InMemoryActionAuditRepository implements ActionAuditRepository {

    private final ConcurrentHashMap<String, ActionAuditLog> storage = new ConcurrentHashMap<>();

    @Override
    public ActionAuditLog save(ActionAuditLog auditLog) {
        storage.put(auditLog.getAuditId(), auditLog);
        return auditLog;
    }

    @Override
    public List<ActionAuditLog> findByConversationId(ConversationId conversationId) {
        return storage.values().stream()
                .filter(auditLog -> auditLog.getConversationId().equals(conversationId))
                .sorted(Comparator.comparing(ActionAuditLog::getCreatedAt))
                .toList();
    }
}
