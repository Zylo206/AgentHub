package com.agenthub.api.memory;

import com.agenthub.application.memory.MemoryApplicationService;
import com.agenthub.common.ApiResponse;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class MemoryController {

    private final MemoryApplicationService memoryApplicationService;

    public MemoryController(MemoryApplicationService memoryApplicationService) {
        this.memoryApplicationService = memoryApplicationService;
    }

    @GetMapping("/conversations/{conversationId}/memories")
    public ApiResponse<?> listMemories(@PathVariable("conversationId") String conversationId) {
        return ApiResponse.success(memoryApplicationService.listMemoriesByConversation(conversationId));
    }

    @PostMapping("/conversations/{conversationId}/messages/{messageId}/memory")
    public ApiResponse<?> saveMessageAsMemory(
            @PathVariable("conversationId") String conversationId,
            @PathVariable("messageId") String messageId,
            @RequestBody(required = false) SaveMemoryRequest request) {
        return ApiResponse.success(
                memoryApplicationService.saveMessageAsMemory(
                        conversationId,
                        messageId,
                        request == null ? null : request.category()),
                "Message saved as memory");
    }

    @PatchMapping("/memories/{memoryId}")
    public ApiResponse<?> updateMemory(
            @PathVariable("memoryId") String memoryId,
            @RequestBody UpdateMemoryRequest request) {
        return ApiResponse.success(
                memoryApplicationService.updateMemory(
                        memoryId,
                        request.category(),
                        request.content(),
                        request.importance()),
                "Memory updated");
    }

    @DeleteMapping("/memories/{memoryId}")
    public ApiResponse<?> deleteMemory(@PathVariable("memoryId") String memoryId) {
        return ApiResponse.success(memoryApplicationService.deleteMemory(memoryId), "Memory deleted");
    }
}

record SaveMemoryRequest(String category) {}

record UpdateMemoryRequest(String category, String content, Integer importance) {}
