package com.agenthub.api.message;

import com.agenthub.application.message.MessageApplicationService;
import com.agenthub.common.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
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
                        request.targetAgentId()),
                "Message sent");
    }

    @GetMapping
    public ApiResponse<?> listMessages(@PathVariable("conversationId") String conversationId) {
        return ApiResponse.success(messageApplicationService.listMessages(conversationId));
    }
}

record SendMessageRequest(@NotBlank String content, String targetAgentId) {}
