package com.agenthub.infrastructure.persistence.memory;

import com.agenthub.domain.conversation.ConversationId;
import com.agenthub.domain.task.TaskRepository;
import com.agenthub.domain.task.TaskRun;
import com.agenthub.domain.task.TaskRunId;
import com.agenthub.domain.task.TaskSpec;
import com.agenthub.domain.task.TaskSpecId;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Repository;

@Repository
@ConditionalOnProperty(name = "agenthub.persistence.mode", havingValue = "memory", matchIfMissing = true)
public class InMemoryTaskRepository implements TaskRepository {

    private final ConcurrentHashMap<String, TaskSpec> taskSpecStorage = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, TaskRun> taskRunStorage = new ConcurrentHashMap<>();

    @Override
    public TaskSpec saveTaskSpec(TaskSpec taskSpec) {
        taskSpecStorage.put(taskSpec.getId().value(), taskSpec);
        return taskSpec;
    }

    @Override
    public Optional<TaskSpec> findTaskSpecById(TaskSpecId taskSpecId) {
        return Optional.ofNullable(taskSpecStorage.get(taskSpecId.value()));
    }

    @Override
    public List<TaskSpec> findTaskSpecsByConversationId(ConversationId conversationId) {
        return taskSpecStorage.values().stream()
                .filter(taskSpec -> taskSpec.getConversationId().equals(conversationId))
                .sorted(Comparator.comparing(TaskSpec::getCreatedAt))
                .toList();
    }

    @Override
    public TaskRun saveTaskRun(TaskRun taskRun) {
        taskRunStorage.put(taskRun.getId().value(), taskRun);
        return taskRun;
    }

    @Override
    public Optional<TaskRun> findTaskRunById(TaskRunId taskRunId) {
        return Optional.ofNullable(taskRunStorage.get(taskRunId.value()));
    }

    @Override
    public List<TaskRun> findTaskRunsByConversationId(ConversationId conversationId) {
        return taskRunStorage.values().stream()
                .filter(taskRun -> taskRun.getConversationId().equals(conversationId))
                .sorted(Comparator.comparing(TaskRun::getCreatedAt))
                .toList();
    }
}
