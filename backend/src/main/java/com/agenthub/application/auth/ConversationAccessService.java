package com.agenthub.application.auth;

import com.agenthub.domain.conversation.Conversation;
import com.agenthub.domain.conversation.ConversationId;
import com.agenthub.domain.conversation.ConversationRepository;
import com.agenthub.domain.conversation.ConversationVisibility;
import java.util.List;
import java.util.Locale;
import java.util.NoSuchElementException;
import org.springframework.stereotype.Service;

@Service
public class ConversationAccessService {

    private final ConversationRepository conversationRepository;
    private final AuthSessionService authSessionService;

    public ConversationAccessService(
            ConversationRepository conversationRepository,
            AuthSessionService authSessionService) {
        this.conversationRepository = conversationRepository;
        this.authSessionService = authSessionService;
    }

    public List<Conversation> filterReadable(List<Conversation> conversations) {
        return conversations.stream().filter(this::canRead).toList();
    }

    public Conversation requireReadable(String conversationId) {
        Conversation conversation = conversationRepository.findById(new ConversationId(conversationId))
                .orElseThrow(() -> new NoSuchElementException("Conversation not found: " + conversationId));
        requireRead(conversation);
        return conversation;
    }

    public Conversation requireWritable(String conversationId) {
        Conversation conversation = requireReadable(conversationId);
        if (!canWrite(conversation)) {
            throw new AccessDeniedException("No write permission for conversation: " + conversationId);
        }
        return conversation;
    }

    public Conversation requireManage(String conversationId) {
        Conversation conversation = requireReadable(conversationId);
        if (!canManage(conversation)) {
            throw new AccessDeniedException("No manage permission for conversation: " + conversationId);
        }
        return conversation;
    }

    public void requireRead(Conversation conversation) {
        if (!canRead(conversation)) {
            throw new AccessDeniedException("No read permission for conversation: " + conversation.getId().value());
        }
    }

    public void requireWrite(Conversation conversation) {
        requireRead(conversation);
        if (!canWrite(conversation)) {
            throw new AccessDeniedException("No write permission for conversation: " + conversation.getId().value());
        }
    }

    private boolean canRead(Conversation conversation) {
        AuthPrincipal principal = authSessionService.current();
        if (principal.isAdmin()) {
            return true;
        }
        if (conversation.getVisibility() == ConversationVisibility.PUBLIC) {
            return true;
        }
        if (principal.userId().equals(conversation.getOwnerUserId())) {
            return true;
        }
        if (conversation.getMemberRoles().containsKey(principal.userId())) {
            return true;
        }
        return conversation.getVisibility() == ConversationVisibility.ORG
                && principal.belongsToOrg(conversation.getOrgTag());
    }

    private boolean canWrite(Conversation conversation) {
        AuthPrincipal principal = authSessionService.current();
        if (principal.isAdmin() || principal.userId().equals(conversation.getOwnerUserId())) {
            return true;
        }
        String role = conversation.getMemberRoles().get(principal.userId());
        String normalizedRole = role == null ? "" : role.toUpperCase(Locale.ROOT);
        return normalizedRole.equals("OWNER") || normalizedRole.equals("EDITOR") || normalizedRole.equals("REVIEWER");
    }

    private boolean canManage(Conversation conversation) {
        AuthPrincipal principal = authSessionService.current();
        if (principal.isAdmin() || principal.userId().equals(conversation.getOwnerUserId())) {
            return true;
        }
        String role = conversation.getMemberRoles().get(principal.userId());
        return "OWNER".equalsIgnoreCase(role);
    }
}
