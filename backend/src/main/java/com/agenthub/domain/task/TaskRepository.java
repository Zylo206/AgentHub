package com.agenthub.domain.task;

import com.agenthub.domain.conversation.ConversationId;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

public interface TaskRepository {

    TaskSpec saveTaskSpec(TaskSpec taskSpec);

    Optional<TaskSpec> findTaskSpecById(TaskSpecId taskSpecId);

    List<TaskSpec> findTaskSpecsByConversationId(ConversationId conversationId);

    TaskRun saveTaskRun(TaskRun taskRun);

    Optional<TaskRun> findTaskRunById(TaskRunId taskRunId);

    List<TaskRun> findTaskRunsByConversationId(ConversationId conversationId);

    default List<TaskRun> findRecentTaskRunsByConversationId(ConversationId conversationId, int limit) {
        List<TaskRun> taskRuns = findTaskRunsByConversationId(conversationId);
        return taskRuns.stream()
                .sorted(Comparator.comparing(TaskRun::getCreatedAt))
                .skip(Math.max(0, taskRuns.size() - Math.max(0, limit)))
                .toList();
    }

    default List<TaskRun> searchTaskRunsByConversationId(ConversationId conversationId, List<String> keywords, int limit) {
        List<String> normalizedKeywords = normalizeKeywords(keywords);
        if (normalizedKeywords.isEmpty()) {
            return List.of();
        }
        return findTaskRunsByConversationId(conversationId).stream()
                .filter(taskRun -> containsAny(taskRun.getResultSummary(), normalizedKeywords))
                .sorted(Comparator.comparing(TaskRun::getCreatedAt).reversed())
                .limit(Math.max(0, limit))
                .sorted(Comparator.comparing(TaskRun::getCreatedAt))
                .toList();
    }

    private static List<String> normalizeKeywords(List<String> keywords) {
        if (keywords == null) {
            return List.of();
        }
        return keywords.stream()
                .filter(keyword -> keyword != null && !keyword.isBlank())
                .map(keyword -> keyword.toLowerCase(Locale.ROOT))
                .distinct()
                .toList();
    }

    private static boolean containsAny(String content, List<String> keywords) {
        if (content == null || content.isBlank()) {
            return false;
        }
        String normalizedContent = content.toLowerCase(Locale.ROOT);
        return keywords.stream().anyMatch(normalizedContent::contains);
    }
}
