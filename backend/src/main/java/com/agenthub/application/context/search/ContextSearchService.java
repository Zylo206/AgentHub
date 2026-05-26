package com.agenthub.application.context.search;

import com.agenthub.domain.artifact.Artifact;
import com.agenthub.domain.artifact.ArtifactRepository;
import com.agenthub.domain.attachment.AttachmentRecord;
import com.agenthub.domain.attachment.AttachmentRepository;
import com.agenthub.domain.context.ContextRepository;
import com.agenthub.domain.context.PinnedContext;
import com.agenthub.domain.conversation.ConversationId;
import com.agenthub.domain.memory.MemoryItem;
import com.agenthub.domain.memory.MemoryRepository;
import com.agenthub.domain.message.Message;
import com.agenthub.domain.message.MessageId;
import com.agenthub.domain.message.MessageRepository;
import com.agenthub.domain.task.TaskRepository;
import com.agenthub.domain.task.TaskRun;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class ContextSearchService {

    private final ContextRepository contextRepository;
    private final MemoryRepository memoryRepository;
    private final MessageRepository messageRepository;
    private final ArtifactRepository artifactRepository;
    private final AttachmentRepository attachmentRepository;
    private final TaskRepository taskRepository;
    private final int messageWindow;
    private final int artifactWindow;
    private final int attachmentWindow;
    private final int taskRunWindow;
    private final int grepLimit;
    private final int readMaxChars;

    public ContextSearchService(
            ContextRepository contextRepository,
            MemoryRepository memoryRepository,
            MessageRepository messageRepository,
            ArtifactRepository artifactRepository,
            AttachmentRepository attachmentRepository,
            TaskRepository taskRepository,
            @Value("${agenthub.context.search.message-window:50}") int messageWindow,
            @Value("${agenthub.context.search.artifact-window:50}") int artifactWindow,
            @Value("${agenthub.context.search.attachment-window:30}") int attachmentWindow,
            @Value("${agenthub.context.search.task-run-window:20}") int taskRunWindow,
            @Value("${agenthub.context.search.grep-limit:20}") int grepLimit,
            @Value("${agenthub.context.search.read-max-chars:4000}") int readMaxChars) {
        this.contextRepository = contextRepository;
        this.memoryRepository = memoryRepository;
        this.messageRepository = messageRepository;
        this.artifactRepository = artifactRepository;
        this.attachmentRepository = attachmentRepository;
        this.taskRepository = taskRepository;
        this.messageWindow = Math.max(1, messageWindow);
        this.artifactWindow = Math.max(1, artifactWindow);
        this.attachmentWindow = Math.max(1, attachmentWindow);
        this.taskRunWindow = Math.max(1, taskRunWindow);
        this.grepLimit = Math.max(1, grepLimit);
        this.readMaxChars = Math.max(256, readMaxChars);
    }

    public List<ContextSearchResult> search(
            ConversationId conversationId,
            String query,
            MessageId sourceMessageId,
            int memoryLimit,
            Instant now) {
        List<String> tokens = tokenize(query);
        Map<String, ContextSearchCandidate> candidates = new LinkedHashMap<>();

        listPinned(conversationId).forEach(candidate -> put(candidates, candidate));
        listMemory(conversationId, memoryLimit, now).forEach(candidate -> put(candidates, candidate));
        listRecentMessages(conversationId, sourceMessageId).forEach(candidate -> put(candidates, candidate));
        grepMessages(conversationId, sourceMessageId, tokens).forEach(candidate -> put(candidates, candidate));
        listRecentArtifacts(conversationId).forEach(candidate -> put(candidates, candidate));
        grepArtifacts(conversationId, tokens).forEach(candidate -> put(candidates, candidate));
        listRecentAttachments(conversationId).forEach(candidate -> put(candidates, candidate));
        grepAttachments(conversationId, tokens).forEach(candidate -> put(candidates, candidate));
        listRecentTaskRuns(conversationId).forEach(candidate -> put(candidates, candidate));
        grepTaskRuns(conversationId, tokens).forEach(candidate -> put(candidates, candidate));

        return candidates.values().stream()
                .map(candidate -> new ContextSearchResult(
                        candidate,
                        matchedTokens(tokens, candidate.content()),
                        searchStage(tokens, candidate)))
                .toList();
    }

    public List<String> tokenize(String query) {
        if (query == null || query.isBlank()) {
            return List.of();
        }
        Set<String> tokens = new LinkedHashSet<>();
        for (String token : query.toLowerCase(Locale.ROOT).split("[^\\p{IsAlphabetic}\\p{IsDigit}]+")) {
            if (token.length() >= 2) {
                tokens.add(token);
            }
        }
        return List.copyOf(tokens);
    }

    private List<ContextSearchCandidate> listPinned(ConversationId conversationId) {
        return contextRepository.findPinnedContextsByConversationId(conversationId).stream()
                .map(this::fromPinnedContext)
                .toList();
    }

    private List<ContextSearchCandidate> listMemory(ConversationId conversationId, int limit, Instant now) {
        return memoryRepository.findRelevantForConversation(conversationId, Math.max(limit, 6)).stream()
                .map(memoryItem -> memoryRepository.markUsed(memoryItem.getMemoryId(), now).orElse(memoryItem))
                .map(this::fromMemory)
                .toList();
    }

    private List<ContextSearchCandidate> listRecentMessages(ConversationId conversationId, MessageId sourceMessageId) {
        return messageRepository.findRecentByConversationId(conversationId, messageWindow + 1).stream()
                .filter(message -> sourceMessageId == null || !message.getId().equals(sourceMessageId))
                .map(this::fromMessage)
                .toList();
    }

    private List<ContextSearchCandidate> grepMessages(
            ConversationId conversationId,
            MessageId sourceMessageId,
            List<String> tokens) {
        if (tokens.isEmpty()) {
            return List.of();
        }
        return messageRepository.searchByConversationId(conversationId, tokens, grepLimit).stream()
                .filter(message -> sourceMessageId == null || !message.getId().equals(sourceMessageId))
                .map(message -> withWindowPolicy(fromMessage(message), "GREP_MESSAGES"))
                .toList();
    }

    private List<ContextSearchCandidate> listRecentArtifacts(ConversationId conversationId) {
        return artifactRepository.findRecentByConversationId(conversationId, artifactWindow).stream()
                .map(this::fromArtifact)
                .toList();
    }

    private List<ContextSearchCandidate> grepArtifacts(ConversationId conversationId, List<String> tokens) {
        if (tokens.isEmpty()) {
            return List.of();
        }
        return artifactRepository.searchByConversationId(conversationId, tokens, grepLimit).stream()
                .map(artifact -> withWindowPolicy(fromArtifact(artifact), "GREP_ARTIFACTS"))
                .toList();
    }

    private List<ContextSearchCandidate> listRecentAttachments(ConversationId conversationId) {
        return attachmentRepository.findRecentByConversationId(conversationId, attachmentWindow).stream()
                .map(this::fromAttachment)
                .toList();
    }

    private List<ContextSearchCandidate> grepAttachments(ConversationId conversationId, List<String> tokens) {
        if (tokens.isEmpty()) {
            return List.of();
        }
        return attachmentRepository.searchByConversationId(conversationId, tokens, grepLimit).stream()
                .map(attachment -> withWindowPolicy(fromAttachment(attachment), "GREP_ATTACHMENTS"))
                .toList();
    }

    private List<ContextSearchCandidate> listRecentTaskRuns(ConversationId conversationId) {
        return taskRepository.findRecentTaskRunsByConversationId(conversationId, taskRunWindow).stream()
                .map(this::fromTaskRun)
                .toList();
    }

    private List<ContextSearchCandidate> grepTaskRuns(ConversationId conversationId, List<String> tokens) {
        if (tokens.isEmpty()) {
            return List.of();
        }
        return taskRepository.searchTaskRunsByConversationId(conversationId, tokens, grepLimit).stream()
                .map(taskRun -> withWindowPolicy(fromTaskRun(taskRun), "GREP_TASK_RUNS"))
                .toList();
    }

    private ContextSearchCandidate fromPinnedContext(PinnedContext pinnedContext) {
        return new ContextSearchCandidate(
                ContextSearchSourceType.PINNED_CONTEXT,
                pinnedContext.getSourceId(),
                "Pinned context",
                read(pinnedContext.getContent()),
                100,
                10,
                0,
                "Manual pinned context has highest priority.",
                "LIST_PINNED_CONTEXT_ALL",
                pinnedContext.getCreatedAt());
    }

    private ContextSearchCandidate fromMemory(MemoryItem memoryItem) {
        return new ContextSearchCandidate(
                ContextSearchSourceType.MEMORY,
                memoryItem.getMemoryId(),
                memoryItem.getCategory() + " / " + memoryItem.getScope(),
                read(memoryItem.getContent()),
                80,
                8,
                memoryItem.getImportance() * 2.0,
                "Long-term memory matched by importance, recency, and query keywords.",
                "LIST_TOP_RELEVANT_MEMORY",
                memoryItem.getUpdatedAt());
    }

    private ContextSearchCandidate fromMessage(Message message) {
        return new ContextSearchCandidate(
                ContextSearchSourceType.MESSAGE,
                message.getId().value(),
                message.getSenderType() + " message",
                read(message.getContent()),
                45,
                6,
                0,
                "Recent conversation history matched by recency and query keywords.",
                "LIST_RECENT_MESSAGES_" + messageWindow,
                message.getCreatedAt());
    }

    private ContextSearchCandidate fromArtifact(Artifact artifact) {
        return new ContextSearchCandidate(
                ContextSearchSourceType.ARTIFACT,
                artifact.getId().value(),
                artifact.getTitle() + " v" + artifact.getVersion(),
                read(artifact.getTitle() + "\n" + artifact.getContent()),
                35,
                4,
                0,
                "Artifact context matched by title/content and latest conversation artifacts.",
                "LIST_RECENT_ARTIFACTS_" + artifactWindow,
                artifact.getCreatedAt());
    }

    private ContextSearchCandidate fromAttachment(AttachmentRecord attachment) {
        return new ContextSearchCandidate(
                ContextSearchSourceType.ATTACHMENT,
                attachment.getAttachmentId(),
                attachment.getFileName(),
                read(attachment.getFileName() + "\n" + nullSafe(attachment.getContentPreview())),
                30,
                4,
                0,
                "Attachment context matched by file name/content preview and latest conversation attachments.",
                "LIST_RECENT_ATTACHMENTS_" + attachmentWindow,
                attachment.getCreatedAt());
    }

    private ContextSearchCandidate fromTaskRun(TaskRun taskRun) {
        return new ContextSearchCandidate(
                ContextSearchSourceType.TASK_RUN,
                taskRun.getId().value(),
                "Previous TaskRun",
                read(taskRun.getResultSummary()),
                25,
                3,
                0,
                "Previous TaskRun summary matched by recency and query keywords.",
                "LIST_RECENT_TASK_RUNS_" + taskRunWindow,
                taskRun.getCreatedAt());
    }

    private ContextSearchCandidate withWindowPolicy(ContextSearchCandidate candidate, String windowPolicy) {
        return new ContextSearchCandidate(
                candidate.sourceType(),
                candidate.sourceId(),
                candidate.title(),
                candidate.content(),
                candidate.baseScore(),
                candidate.recencyScore(),
                candidate.importanceScore(),
                candidate.reason(),
                windowPolicy,
                candidate.createdAt());
    }

    private void put(Map<String, ContextSearchCandidate> candidates, ContextSearchCandidate candidate) {
        String key = candidate.sourceType() + ":" + candidate.sourceId();
        ContextSearchCandidate existing = candidates.get(key);
        if (existing == null || priority(candidate.windowPolicy()) > priority(existing.windowPolicy())) {
            candidates.put(key, candidate);
        }
    }

    private int priority(String windowPolicy) {
        if (windowPolicy != null && windowPolicy.startsWith("GREP_")) {
            return 2;
        }
        return 1;
    }

    private List<String> matchedTokens(List<String> tokens, String content) {
        if (tokens.isEmpty() || content == null || content.isBlank()) {
            return List.of();
        }
        String normalizedContent = content.toLowerCase(Locale.ROOT);
        List<String> matched = new ArrayList<>();
        for (String token : tokens) {
            if (normalizedContent.contains(token)) {
                matched.add(token);
            }
        }
        return List.copyOf(matched);
    }

    private String searchStage(List<String> tokens, ContextSearchCandidate candidate) {
        if (candidate.windowPolicy() != null && candidate.windowPolicy().startsWith("GREP_")) {
            return "LIST_GREP_READ";
        }
        if (!tokens.isEmpty() && !matchedTokens(tokens, candidate.content()).isEmpty()) {
            return "LIST_GREP_READ";
        }
        return "LIST_READ_FALLBACK";
    }

    private String read(String content) {
        if (content == null) {
            return "";
        }
        String normalized = content.trim();
        return normalized.length() <= readMaxChars ? normalized : normalized.substring(0, readMaxChars);
    }

    private String nullSafe(String value) {
        return value == null ? "" : value;
    }
}
