package com.agenthub.application.orchestrator;

import com.agenthub.application.approval.ApprovalApplicationService;
import com.agenthub.application.audit.ActionAuditService;
import com.agenthub.application.message.MessageApplicationService;
import com.agenthub.domain.approval.ApprovalRequest;
import com.agenthub.domain.conversation.ConversationId;
import com.agenthub.domain.message.Message;
import com.agenthub.domain.message.MessageSenderType;
import com.agenthub.domain.message.MessageType;
import com.agenthub.domain.task.TaskRun;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class OrchestratorAutoTriggerService {

    private static final String ACTION_TYPE = "ORCHESTRATOR_RUN";
    private static final String TARGET_TYPE = "MESSAGE";
    private static final String DEFAULT_MODE = "KEYWORD_OR_MENTION";

    private final OrchestratorService orchestratorService;
    private final ApprovalApplicationService approvalApplicationService;
    private final ActionAuditService actionAuditService;
    private final MessageApplicationService messageApplicationService;
    private final boolean enabled;
    private final boolean requireApproval;
    private final String mode;
    private final List<String> keywords;

    public OrchestratorAutoTriggerService(
            OrchestratorService orchestratorService,
            ApprovalApplicationService approvalApplicationService,
            ActionAuditService actionAuditService,
            MessageApplicationService messageApplicationService,
            @Value("${agenthub.orchestrator.auto-trigger.enabled:false}") boolean enabled,
            @Value("${agenthub.orchestrator.auto-trigger.require-approval:true}") boolean requireApproval,
            @Value("${agenthub.orchestrator.auto-trigger.mode:KEYWORD_OR_MENTION}") String mode,
            @Value("${agenthub.orchestrator.auto-trigger.keywords:生成,创建,实现,修改,检查,review,页面,组件,workflow,工作流,协作,agent}") String keywords) {
        this.orchestratorService = orchestratorService;
        this.approvalApplicationService = approvalApplicationService;
        this.actionAuditService = actionAuditService;
        this.messageApplicationService = messageApplicationService;
        this.enabled = enabled;
        this.requireApproval = requireApproval;
        this.mode = normalizeMode(mode);
        this.keywords = parseKeywords(keywords);
    }

    public OrchestratorAutoTriggerResult handleAfterUserMessage(Message message) {
        OrchestratorAutoTriggerResult suggestion = evaluate(message);
        if (!suggestion.enabled() || !suggestion.matched()) {
            return suggestion;
        }

        if (requireApproval) {
            ApprovalRequest approvalRequest = createPendingApproval(message, suggestion);
            messageApplicationService.appendSystemMessage(
                    message.getConversationId().value(),
                    MessageType.APPROVAL,
                    "Orchestrator auto trigger requires approval for message "
                            + message.getId().value()
                            + ". ApprovalId: "
                            + approvalRequest.getApprovalId()
                            + ". Reason: "
                            + suggestion.reason(),
                    List.of());
            return new OrchestratorAutoTriggerResult(
                    enabled,
                    mode,
                    true,
                    true,
                    "PENDING_APPROVAL",
                    suggestion.reason(),
                    suggestion.matchedKeywords(),
                    approvalRequest,
                    null);
        }

        TaskRun taskRun = orchestratorService.runFromMessage(
                message.getConversationId().value(),
                message.getId().value(),
                null);
        actionAuditService.record(
                message.getConversationId(),
                "ORCHESTRATOR_AUTO_TRIGGER_EXECUTED",
                TARGET_TYPE,
                message.getId().value(),
                "COMPLETED",
                "Auto trigger executed without approval because require-approval=false. Reason: "
                        + suggestion.reason());
        return new OrchestratorAutoTriggerResult(
                enabled,
                mode,
                false,
                true,
                "EXECUTED",
                suggestion.reason(),
                suggestion.matchedKeywords(),
                null,
                taskRun);
    }

    public OrchestratorAutoTriggerResult evaluateMessage(String conversationId, String messageId) {
        Message message = messageApplicationService.getMessage(messageId);
        if (!message.getConversationId().equals(new ConversationId(conversationId))) {
            throw new IllegalArgumentException("Message does not belong to the provided conversation.");
        }
        return evaluate(message);
    }

    public TaskRun runFromMessage(
            String conversationId,
            String messageId,
            String selectedAgentId,
            String approvalId) {
        Message message = messageApplicationService.getMessage(messageId);
        if (!message.getConversationId().equals(new ConversationId(conversationId))) {
            throw new IllegalArgumentException("Message does not belong to the provided conversation.");
        }

        if (approvalId != null && !approvalId.isBlank()) {
            ConversationId conversationRef = new ConversationId(conversationId);
            approvalApplicationService.validateApproved(
                    approvalId,
                    conversationRef,
                    ACTION_TYPE,
                    TARGET_TYPE,
                    messageId);
            TaskRun taskRun = orchestratorService.runFromMessage(conversationId, messageId, selectedAgentId);
            approvalApplicationService.consume(approvalId);
            actionAuditService.record(
                    conversationRef,
                    "ORCHESTRATOR_APPROVED_TRIGGER_EXECUTED",
                    TARGET_TYPE,
                    messageId,
                    taskRun.getStatus().name(),
                    "Approved message-level Orchestrator run executed. approvalId=" + approvalId);
            return taskRun;
        }

        if (enabled && requireApproval && message.getSenderType() == MessageSenderType.USER) {
            throw new IllegalStateException(
                    "approvalId is required because message-level Orchestrator run requires confirmation.");
        }

        return orchestratorService.runFromMessage(conversationId, messageId, selectedAgentId);
    }

    private OrchestratorAutoTriggerResult evaluate(Message message) {
        if (!enabled) {
            return OrchestratorAutoTriggerResult.disabled(mode, requireApproval);
        }
        if (message == null || message.getSenderType() != MessageSenderType.USER) {
            return new OrchestratorAutoTriggerResult(
                    enabled,
                    mode,
                    requireApproval,
                    false,
                    "IGNORED",
                    "Only user messages are eligible for orchestrator auto trigger.",
                    List.of(),
                    null,
                    null);
        }

        List<String> matchedKeywords = findMatchedKeywords(message.getContent());
        boolean hasMentionedAgents = !message.getMentionedAgentIds().isEmpty();
        boolean matched = switch (mode) {
            case "ALWAYS" -> true;
            case "MENTION" -> hasMentionedAgents;
            case "KEYWORD" -> !matchedKeywords.isEmpty();
            case "KEYWORD_OR_MENTION" -> !matchedKeywords.isEmpty() || hasMentionedAgents;
            default -> !matchedKeywords.isEmpty() || hasMentionedAgents;
        };

        String reason = matched
                ? buildMatchedReason(matchedKeywords, hasMentionedAgents)
                : "Message did not match auto-trigger mode=" + mode + ".";
        return new OrchestratorAutoTriggerResult(
                enabled,
                mode,
                requireApproval,
                matched,
                matched ? (requireApproval ? "SUGGEST_APPROVAL" : "SUGGEST_EXECUTE") : "NO_MATCH",
                reason,
                matchedKeywords,
                null,
                null);
    }

    private ApprovalRequest createPendingApproval(Message message, OrchestratorAutoTriggerResult suggestion) {
        String content = message.getContent() == null ? "" : message.getContent().trim();
        String preview = content.length() <= 120 ? content : content.substring(0, 117) + "...";
        ApprovalRequest approvalRequest = approvalApplicationService.create(
                message.getConversationId().value(),
                ACTION_TYPE,
                TARGET_TYPE,
                message.getId().value(),
                "MEDIUM",
                "Run Orchestrator from message after auto-trigger match.",
                List.of(
                        "messageId=" + message.getId().value(),
                        "mode=" + mode,
                        "reason=" + suggestion.reason(),
                        "contentPreview=" + preview));
        actionAuditService.record(
                message.getConversationId(),
                "ORCHESTRATOR_AUTO_TRIGGER_PENDING_APPROVAL",
                TARGET_TYPE,
                message.getId().value(),
                "PENDING",
                "Auto trigger matched but approval is required. approvalId=" + approvalRequest.getApprovalId());
        return approvalRequest;
    }

    private String buildMatchedReason(List<String> matchedKeywords, boolean hasMentionedAgents) {
        if (!matchedKeywords.isEmpty() && hasMentionedAgents) {
            return "Matched keywords " + matchedKeywords + " and mentioned Agent targets.";
        }
        if (!matchedKeywords.isEmpty()) {
            return "Matched keywords " + matchedKeywords + ".";
        }
        if (hasMentionedAgents) {
            return "Message mentions one or more Agent targets.";
        }
        return "Auto-trigger mode matched.";
    }

    private List<String> findMatchedKeywords(String content) {
        if (content == null || content.isBlank()) {
            return List.of();
        }
        String normalizedContent = content.toLowerCase(Locale.ROOT);
        return keywords.stream()
                .filter(keyword -> normalizedContent.contains(keyword.toLowerCase(Locale.ROOT)))
                .distinct()
                .toList();
    }

    private String normalizeMode(String value) {
        if (value == null || value.isBlank()) {
            return DEFAULT_MODE;
        }
        return value.trim().replace("-", "_").toUpperCase(Locale.ROOT);
    }

    private List<String> parseKeywords(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        return Arrays.stream(value.split(","))
                .map(String::trim)
                .filter(keyword -> !keyword.isBlank())
                .distinct()
                .toList();
    }
}
