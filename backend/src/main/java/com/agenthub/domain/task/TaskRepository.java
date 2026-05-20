package com.agenthub.domain.task;

import com.agenthub.domain.conversation.ConversationId;
import java.util.List;
import java.util.Optional;

public interface TaskRepository {

    TaskSpec saveTaskSpec(TaskSpec taskSpec);

    Optional<TaskSpec> findTaskSpecById(TaskSpecId taskSpecId);

    List<TaskSpec> findTaskSpecsByConversationId(ConversationId conversationId);

    TaskRun saveTaskRun(TaskRun taskRun);

    Optional<TaskRun> findTaskRunById(TaskRunId taskRunId);

    List<TaskRun> findTaskRunsByConversationId(ConversationId conversationId);
}
