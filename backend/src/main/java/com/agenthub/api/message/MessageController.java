package com.agenthub.api.message;

import com.agenthub.application.attachment.AttachmentApplicationService;
import com.agenthub.application.auth.ConversationAccessService;
import com.agenthub.application.message.MessageApplicationService;
import com.agenthub.application.orchestrator.OrchestratorAutoTriggerService;
import com.agenthub.common.ApiResponse;
import com.agenthub.domain.message.Message;
import com.agenthub.domain.message.MessageAttachment;
import jakarta.validation.Valid;
import jakarta.validation.constraints.PositiveOrZero;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/conversations/{conversationId}/messages")
public class MessageController {

    private static final Logger logger = LoggerFactory.getLogger(MessageController.class);

    private final MessageApplicationService messageApplicationService;
    private final OrchestratorAutoTriggerService orchestratorAutoTriggerService;
    private final AttachmentApplicationService attachmentApplicationService;
    private final ConversationAccessService conversationAccessService;

    public MessageController(
            MessageApplicationService messageApplicationService,
            OrchestratorAutoTriggerService orchestratorAutoTriggerService,
            AttachmentApplicationService attachmentApplicationService,
            ConversationAccessService conversationAccessService) {
        this.messageApplicationService = messageApplicationService;
        this.orchestratorAutoTriggerService = orchestratorAutoTriggerService;
        this.attachmentApplicationService = attachmentApplicationService;
        this.conversationAccessService = conversationAccessService;
    }

    @PostMapping
    public ApiResponse<?> sendMessage(
            @PathVariable("conversationId") String conversationId,
            @Valid @RequestBody SendMessageRequest request) {
        if ((request.content() == null || request.content().isBlank())
                && (request.attachments() == null || request.attachments().isEmpty())) {
            throw new IllegalArgumentException("Message content or attachments must be provided.");
        }
        Message message = messageApplicationService.sendUserMessage(
                conversationId,
                request.content() == null ? "" : request.content(),
                request.targetAgentId(),
                request.mentionedAgentIds(),
                request.replyToMessageId(),
                request.quotedMessageId(),
                toAttachments(request.attachments()));
        attachmentApplicationService.attachToMessage(
                conversationId,
                message.getId().value(),
                message.getAttachments());
        try {
            orchestratorAutoTriggerService.handleAfterUserMessage(message);
        } catch (RuntimeException exception) {
            logger.warn(
                    "Message was saved but orchestrator auto-trigger side effect failed. conversationId={}, messageId={}",
                    conversationId,
                    message.getId().value(),
                    exception);
        }
        return ApiResponse.success(message, "Message sent");
    }

    @GetMapping
    public ApiResponse<?> listMessages(@PathVariable("conversationId") String conversationId) {
        return ApiResponse.success(messageApplicationService.listMessages(conversationId));
    }

    @PostMapping("/{messageId}/regenerate-agent-reply")
    public ApiResponse<?> regenerateAgentReply(
            @PathVariable("conversationId") String conversationId,
            @PathVariable("messageId") String messageId) {
        return ApiResponse.success(
                messageApplicationService.regenerateAgentReply(conversationId, messageId),
                "Agent reply regenerated");
    }

    @PostMapping("/{messageId}/orchestrator-run")
    public ApiResponse<?> runOrchestratorFromMessage(
            @PathVariable("conversationId") String conversationId,
            @PathVariable("messageId") String messageId,
            @Valid @RequestBody(required = false) RunOrchestratorFromMessageRequest request) {
        conversationAccessService.requireWritable(conversationId);
        String selectedAgentId = request == null ? null : request.selectedAgentId();
        String approvalId = request == null ? null : request.approvalId();
        return ApiResponse.success(
                orchestratorAutoTriggerService.runFromMessage(conversationId, messageId, selectedAgentId, approvalId),
                "Orchestrator run created");
    }

    @GetMapping("/{messageId}/orchestrator-trigger-suggestion")
    public ApiResponse<?> getOrchestratorTriggerSuggestion(
            @PathVariable("conversationId") String conversationId,
            @PathVariable("messageId") String messageId) {
        conversationAccessService.requireReadable(conversationId);
        return ApiResponse.success(
                orchestratorAutoTriggerService.evaluateMessage(conversationId, messageId),
                "Orchestrator trigger suggestion evaluated");
    }

    private List<MessageAttachment> toAttachments(List<SendMessageAttachmentRequest> attachments) {
        if (attachments == null) {
            return List.of();
        }

        return attachments.stream()
                .filter(attachment -> attachment.attachmentId() != null && !attachment.attachmentId().isBlank())
                .filter(attachment -> attachment.fileName() != null && !attachment.fileName().isBlank())
                .map(attachment -> new MessageAttachment(
                        attachment.attachmentId(),
                        attachment.fileName(),
                        attachment.contentType(),
                        attachment.size(),
                        attachment.contentPreview()))
                .map(attachmentApplicationService::toMessageAttachment)
                .toList();
    }
}

record SendMessageRequest(
        String content,
        String targetAgentId,
        List<String> mentionedAgentIds,
        String replyToMessageId,
        String quotedMessageId,
        @Valid List<SendMessageAttachmentRequest> attachments) {}

record SendMessageAttachmentRequest(
        String attachmentId,
        String fileName,
        String contentType,
        @PositiveOrZero long size,
        String contentPreview) {}

record RunOrchestratorFromMessageRequest(String selectedAgentId, String approvalId) {}
