package com.agenthub.application.audit;

import com.agenthub.application.realtime.RealtimeEventPublisher;
import com.agenthub.application.realtime.RealtimeEventType;
import com.agenthub.common.IdGenerator;
import com.agenthub.common.TimeProvider;
import com.agenthub.domain.audit.ActionAuditLog;
import com.agenthub.domain.audit.ActionAuditRepository;
import com.agenthub.domain.conversation.ConversationId;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ActionAuditService {

    private final ActionAuditRepository actionAuditRepository;
    private final RealtimeEventPublisher realtimeEventPublisher;
    private final IdGenerator idGenerator;
    private final TimeProvider timeProvider;

    public ActionAuditService(
            ActionAuditRepository actionAuditRepository,
            RealtimeEventPublisher realtimeEventPublisher,
            IdGenerator idGenerator,
            TimeProvider timeProvider) {
        this.actionAuditRepository = actionAuditRepository;
        this.realtimeEventPublisher = realtimeEventPublisher;
        this.idGenerator = idGenerator;
        this.timeProvider = timeProvider;
    }

    public ActionAuditLog record(
            ConversationId conversationId,
            String actionType,
            String targetType,
            String targetId,
            String status,
            String summary) {
        ActionAuditLog saved = actionAuditRepository.save(new ActionAuditLog(
                idGenerator.nextId("audit"),
                conversationId,
                actionType,
                targetType,
                targetId,
                status,
                summary,
                timeProvider.now()));
        realtimeEventPublisher.publish(
                conversationId,
                RealtimeEventType.ACTION_AUDIT_CREATED,
                "ACTION_AUDIT",
                saved.getAuditId(),
                java.util.Map.of(
                        "actionType", actionType,
                        "targetType", targetType,
                        "status", status));
        return saved;
    }

    public List<ActionAuditLog> listByConversation(String conversationId) {
        return actionAuditRepository.findByConversationId(new ConversationId(conversationId));
    }
}
