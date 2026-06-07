package com.agenthub.api.attachment;

import com.agenthub.application.attachment.AttachmentApplicationService;
import com.agenthub.application.auth.ConversationAccessService;
import com.agenthub.common.ApiResponse;
import com.agenthub.domain.attachment.AttachmentRecord;
import java.nio.file.Path;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api")
public class AttachmentController {

    private final AttachmentApplicationService attachmentApplicationService;
    private final ConversationAccessService conversationAccessService;

    public AttachmentController(
            AttachmentApplicationService attachmentApplicationService,
            ConversationAccessService conversationAccessService) {
        this.attachmentApplicationService = attachmentApplicationService;
        this.conversationAccessService = conversationAccessService;
    }

    @PostMapping("/conversations/{conversationId}/attachments")
    public ApiResponse<?> uploadAttachment(
            @PathVariable("conversationId") String conversationId,
            @RequestParam("file") MultipartFile file) {
        conversationAccessService.requireWritable(conversationId);
        AttachmentRecord attachment = attachmentApplicationService.upload(conversationId, file);
        return ApiResponse.success(attachment, "Attachment uploaded");
    }

    @GetMapping("/attachments/{attachmentId}")
    public ApiResponse<?> getAttachment(@PathVariable("attachmentId") String attachmentId) {
        AttachmentRecord attachment = attachmentApplicationService.getAttachment(attachmentId);
        conversationAccessService.requireReadable(attachment.getConversationId().value());
        return ApiResponse.success(attachment);
    }

    @GetMapping("/conversations/{conversationId}/attachments")
    public ApiResponse<?> listAttachmentsByConversation(@PathVariable("conversationId") String conversationId) {
        conversationAccessService.requireReadable(conversationId);
        return ApiResponse.success(attachmentApplicationService.listByConversation(conversationId));
    }

    @GetMapping("/attachments/{attachmentId}/download")
    public ResponseEntity<Resource> downloadAttachment(@PathVariable("attachmentId") String attachmentId) {
        AttachmentRecord attachment = attachmentApplicationService.getAttachment(attachmentId);
        conversationAccessService.requireReadable(attachment.getConversationId().value());
        Path storagePath = attachmentApplicationService.resolveStoragePath(attachmentId);
        Resource resource = new FileSystemResource(storagePath);
        MediaType mediaType = MediaType.parseMediaType(
                attachment.getContentType() == null ? "application/octet-stream" : attachment.getContentType());
        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + attachment.getFileName().replace("\"", "'") + "\"")
                .body(resource);
    }
}
