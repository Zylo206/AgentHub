package com.agenthub.api.message;

import com.agenthub.application.message.MessageApplicationService;
import com.agenthub.common.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
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

    public MessageController(MessageApplicationService messageApplicationService) {
        this.messageApplicationService = messageApplicationService;
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
                        request.quotedMessageId()),
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
}

record SendMessageRequest(
        @NotBlank String content,
        String targetAgentId,
        List<String> mentionedAgentIds,
        String replyToMessageId,
        String quotedMessageId) {}
