package com.agenthub.application.attachment;

import com.agenthub.common.IdGenerator;
import com.agenthub.common.TimeProvider;
import com.agenthub.domain.attachment.AttachmentRecord;
import com.agenthub.domain.attachment.AttachmentRepository;
import com.agenthub.domain.conversation.ConversationId;
import com.agenthub.domain.conversation.ConversationRepository;
import com.agenthub.domain.message.MessageAttachment;
import java.io.IOException;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.NoSuchElementException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class AttachmentApplicationService {

    private static final int PREVIEW_LIMIT = 1200;

    private final AttachmentRepository attachmentRepository;
    private final ConversationRepository conversationRepository;
    private final AttachmentStorageRegistry attachmentStorageRegistry;
    private final AttachmentAccessGuard attachmentAccessGuard;
    private final AttachmentScanService attachmentScanService;
    private final IdGenerator idGenerator;
    private final TimeProvider timeProvider;
    private final long maxFileSizeBytes;

    public AttachmentApplicationService(
            AttachmentRepository attachmentRepository,
            ConversationRepository conversationRepository,
            AttachmentStorageRegistry attachmentStorageRegistry,
            AttachmentAccessGuard attachmentAccessGuard,
            AttachmentScanService attachmentScanService,
            IdGenerator idGenerator,
            TimeProvider timeProvider,
            @Value("${agenthub.attachments.max-file-size-bytes:5242880}") long maxFileSizeBytes) {
        this.attachmentRepository = attachmentRepository;
        this.conversationRepository = conversationRepository;
        this.attachmentStorageRegistry = attachmentStorageRegistry;
        this.attachmentAccessGuard = attachmentAccessGuard;
        this.attachmentScanService = attachmentScanService;
        this.idGenerator = idGenerator;
        this.timeProvider = timeProvider;
        this.maxFileSizeBytes = maxFileSizeBytes;
    }

    public AttachmentRecord upload(String conversationId, MultipartFile file) {
        ConversationId conversationRef = new ConversationId(conversationId);
        conversationRepository.findById(conversationRef)
                .orElseThrow(() -> new NoSuchElementException("Conversation not found: " + conversationId));
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Attachment file must not be empty");
        }
        if (file.getSize() > maxFileSizeBytes) {
            throw new IllegalArgumentException("Attachment exceeds max size: " + maxFileSizeBytes + " bytes");
        }

        String attachmentId = idGenerator.nextId("att");
        String fileName = sanitizeFileName(file.getOriginalFilename());
        try {
            byte[] bytes = file.getBytes();
            AttachmentStorageService.StoredAttachment storedAttachment = attachmentStorageRegistry.store(
                    attachmentId,
                    fileName,
                    new ByteArrayInputStream(bytes));
            AttachmentScanService.ScanResult scanResult = scan(bytes, attachmentId, fileName);
            AttachmentRecord record = new AttachmentRecord(
                    attachmentId,
                    conversationRef,
                    null,
                    fileName,
                    normalizeContentType(file.getContentType()),
                    file.getSize(),
                    storedAttachment.storagePath(),
                    storedAttachment.storageKey(),
                    sha256(bytes),
                    "CONVERSATION",
                    "LOCAL_USER",
                    scanResult.status(),
                    storedAttachment.storageProvider(),
                    preview(file.getContentType(), file.getOriginalFilename(), bytes),
                    timeProvider.now(),
                    null);
            return attachmentRepository.save(record);
        } catch (IOException exception) {
            throw new UncheckedIOException("Failed to store attachment", exception);
        }
    }

    public AttachmentRecord getAttachment(String attachmentId) {
        AttachmentRecord attachment = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new NoSuchElementException("Attachment not found: " + attachmentId));
        attachmentAccessGuard.assertReadable(attachment);
        return attachment;
    }

    public List<AttachmentRecord> listByConversation(String conversationId) {
        return attachmentRepository.findByConversationId(new ConversationId(conversationId));
    }

    public void attachToMessage(String conversationId, String messageId, List<MessageAttachment> attachments) {
        if (attachments == null || attachments.isEmpty()) {
            return;
        }
        ConversationId conversationRef = new ConversationId(conversationId);
        for (MessageAttachment attachment : attachments) {
            attachmentRepository.findById(attachment.attachmentId())
                    .filter(record -> record.getConversationId().equals(conversationRef))
                    .filter(record -> record.getDeletedAt() == null)
                    .ifPresent(record -> attachmentRepository.save(record.withMessageId(messageId)));
        }
    }

    public MessageAttachment toMessageAttachment(MessageAttachment requestAttachment) {
        if (requestAttachment == null) {
            return null;
        }
        return attachmentRepository.findById(requestAttachment.attachmentId())
                .map(record -> new MessageAttachment(
                        record.getAttachmentId(),
                        record.getFileName(),
                        record.getContentType(),
                        record.getSizeBytes(),
                        record.getContentPreview()))
                .orElse(requestAttachment);
    }

    public AttachmentStorageService.AttachmentContent openAttachmentContent(String attachmentId) {
        AttachmentRecord attachment = getAttachment(attachmentId);
        try {
            return attachmentStorageRegistry.open(attachment);
        } catch (IOException exception) {
            throw new UncheckedIOException("Failed to open attachment content", exception);
        }
    }

    private String preview(String contentType, String fileName, byte[] bytes) {
        if (!isTextLike(contentType, fileName)) {
            return null;
        }
        String text = new String(bytes, StandardCharsets.UTF_8)
                .replace("\u0000", "")
                .trim();
        return text.length() <= PREVIEW_LIMIT ? text : text.substring(0, PREVIEW_LIMIT);
    }

    private String sha256(byte[] bytes) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(bytes));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 digest is not available", exception);
        }
    }

    private boolean isTextLike(String contentType, String fileName) {
        String normalizedType = contentType == null ? "" : contentType.toLowerCase();
        String normalizedName = fileName == null ? "" : fileName.toLowerCase();
        return normalizedType.startsWith("text/")
                || normalizedType.contains("json")
                || normalizedType.contains("xml")
                || normalizedName.matches(".*\\.(md|txt|json|csv|log|tsx?|jsx?|css|html|xml|yaml|yml)$");
    }

    private String sanitizeFileName(String fileName) {
        String normalized = fileName == null || fileName.isBlank() ? "attachment.bin" : fileName.trim();
        normalized = normalized.replace("\\", "/");
        int slash = normalized.lastIndexOf('/');
        String leaf = slash >= 0 ? normalized.substring(slash + 1) : normalized;
        String safe = leaf.replaceAll("[\\r\\n\\t]", "_").replaceAll("[\\\\/:*?\"<>|]", "_");
        return safe.isBlank() ? "attachment.bin" : safe;
    }

    private String normalizeContentType(String contentType) {
        return contentType == null || contentType.isBlank() ? "application/octet-stream" : contentType.trim();
    }

    private AttachmentScanService.ScanResult scan(byte[] bytes, String attachmentId, String fileName) throws IOException {
        Path tempFile = Files.createTempFile("agenthub-attachment-scan-", ".bin");
        try {
            Files.write(tempFile, bytes);
            return attachmentScanService.scan(attachmentId, fileName, tempFile);
        } finally {
            Files.deleteIfExists(tempFile);
        }
    }
}
