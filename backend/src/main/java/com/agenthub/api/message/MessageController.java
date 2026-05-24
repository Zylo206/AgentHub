package com.agenthub.api.message;

import com.agenthub.application.message.MessageApplicationService;
import com.agenthub.application.orchestrator.OrchestratorService;
import com.agenthub.common.ApiResponse;
import com.agenthub.domain.message.MessageAttachment;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/conversations/{conversationId}/messages")
public class MessageController {

    private final MessageApplicationService messageApplicationService;
    private final OrchestratorService orchestratorService;

    public MessageController(
            MessageApplicationService messageApplicationService,
            OrchestratorService orchestratorService) {
        this.messageApplicationService = messageApplicationService;
        this.orchestratorService = orchestratorService;
    }

    @PostMapping
    public ApiResponse<?> sendMessage(
            @PathVariable("conversationId") String conversationId,
            @Valid @RequestBody SendMessageRequest request) {
        return ApiResponse.success(
                messageApplicationService.sendUserMessage(
                        conversationId,
                        request.content(),
                        request.targetAgentId(),
                        request.mentionedAgentIds(),
                        request.replyToMessageId(),
                        request.quotedMessageId(),
                        toAttachments(request.attachments())),
                "Message sent");
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
        String selectedAgentId = request == null ? null : request.selectedAgentId();
        return ApiResponse.success(
                orchestratorService.runFromMessage(conversationId, messageId, selectedAgentId),
                "Orchestrator run created");
    }

    private List<MessageAttachment> toAttachments(List<SendMessageAttachmentRequest> attachments) {
        if (attachments == null) {
            return List.of();
        }

        return attachments.stream()
                .map(attachment -> new MessageAttachment(
                        attachment.attachmentId(),
                        attachment.fileName(),
                        attachment.contentType(),
                        attachment.size(),
                        attachment.contentPreview()))
                .toList();
    }
}

record SendMessageRequest(
        @NotBlank String content,
        String targetAgentId,
        List<String> mentionedAgentIds,
        String replyToMessageId,
        String quotedMessageId,
        @Valid List<SendMessageAttachmentRequest> attachments) {}

record SendMessageAttachmentRequest(
        @NotBlank String attachmentId,
        @NotBlank String fileName,
        String contentType,
        @PositiveOrZero long size,
        String contentPreview) {}

record RunOrchestratorFromMessageRequest(String selectedAgentId) {}
