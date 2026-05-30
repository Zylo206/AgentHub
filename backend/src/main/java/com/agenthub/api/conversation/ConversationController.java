package com.agenthub.api.conversation;

import com.agenthub.application.conversation.ConversationApplicationService;
import com.agenthub.common.ApiResponse;
import com.agenthub.domain.conversation.ConversationType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/conversations")
public class ConversationController {

    private final ConversationApplicationService conversationApplicationService;

    public ConversationController(ConversationApplicationService conversationApplicationService) {
        this.conversationApplicationService = conversationApplicationService;
    }

    @PostMapping
    public ApiResponse<?> createConversation(@Valid @RequestBody CreateConversationRequest request) {
        return ApiResponse.success(
                conversationApplicationService.createConversation(request.title(), request.type()),
                "Conversation created");
    }

    @GetMapping
    public ApiResponse<?> listConversations(
            @RequestParam(name = "query", required = false) String query,
            @RequestParam(name = "includeArchived", defaultValue = "false") boolean includeArchived) {
        return ApiResponse.success(conversationApplicationService.listConversations(query, includeArchived));
    }

    @GetMapping("/{conversationId}")
    public ApiResponse<?> getConversation(@PathVariable("conversationId") String conversationId) {
        return ApiResponse.success(conversationApplicationService.getConversation(conversationId));
    }

    @PostMapping("/{conversationId}/pin")
    public ApiResponse<?> pinConversation(@PathVariable("conversationId") String conversationId) {
        return ApiResponse.success(conversationApplicationService.pinConversation(conversationId), "Conversation pinned");
    }

    @PostMapping("/{conversationId}/unpin")
    public ApiResponse<?> unpinConversation(@PathVariable("conversationId") String conversationId) {
        return ApiResponse.success(conversationApplicationService.unpinConversation(conversationId), "Conversation unpinned");
    }

    @PostMapping("/{conversationId}/archive")
    public ApiResponse<?> archiveConversation(@PathVariable("conversationId") String conversationId) {
        return ApiResponse.success(conversationApplicationService.archiveConversation(conversationId), "Conversation archived");
    }

    @PostMapping("/{conversationId}/unarchive")
    public ApiResponse<?> unarchiveConversation(@PathVariable("conversationId") String conversationId) {
        return ApiResponse.success(conversationApplicationService.unarchiveConversation(conversationId), "Conversation unarchived");
    }

    @PostMapping("/{conversationId}/read")
    public ApiResponse<?> markConversationRead(@PathVariable("conversationId") String conversationId) {
        return ApiResponse.success(conversationApplicationService.markConversationRead(conversationId), "Conversation marked read");
    }
}

record CreateConversationRequest(@NotBlank String title, @NotNull ConversationType type) {}
