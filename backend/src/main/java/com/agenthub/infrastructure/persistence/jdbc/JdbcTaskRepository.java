package com.agenthub.infrastructure.persistence.jdbc;

import com.agenthub.domain.agent.AgentId;
import com.agenthub.domain.conversation.ConversationId;
import com.agenthub.domain.message.MessageId;
import com.agenthub.domain.task.OrchestratorDecisionLog;
import com.agenthub.domain.task.TaskGraph;
import com.agenthub.domain.task.TaskPlan;
import com.agenthub.domain.task.TaskRepository;
import com.agenthub.domain.task.TaskRun;
import com.agenthub.domain.task.TaskRunId;
import com.agenthub.domain.task.TaskRunStatus;
import com.agenthub.domain.task.TaskSpec;
import com.agenthub.domain.task.TaskSpecId;
import com.agenthub.domain.task.TaskSpecStatus;
import com.agenthub.domain.task.TaskStep;
import com.agenthub.domain.task.TaskStepId;
import com.agenthub.domain.task.TaskStepStatus;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Repository;

@Repository
@ConditionalOnProperty(name = "agenthub.persistence.mode", havingValue = "jdbc")
public class JdbcTaskRepository implements TaskRepository {

    private final JdbcConnectionFactory connectionFactory;
    private final boolean fulltextEnabled;

    public JdbcTaskRepository(
            JdbcConnectionFactory connectionFactory,
            @Value("${agenthub.context.search.fulltext-enabled:false}") boolean fulltextEnabled) {
        this.connectionFactory = connectionFactory;
        this.fulltextEnabled = fulltextEnabled;
        initSchema();
    }

    @Override
    public TaskSpec saveTaskSpec(TaskSpec taskSpec) {
        String sql = """
                REPLACE INTO agenthub_task_specs
                (id, conversation_id, source_message_id, title, user_goal, user_input, scope_json, non_goals_json,
                 acceptance_criteria_json, required_skills_json, expected_artifacts_json, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """;
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement(sql)) {
            statement.setString(1, taskSpec.getId().value());
            statement.setString(2, taskSpec.getConversationId().value());
            statement.setString(3, taskSpec.getSourceMessageId() == null ? null : taskSpec.getSourceMessageId().value());
            statement.setString(4, taskSpec.getTitle());
            statement.setString(5, taskSpec.getUserGoal());
            statement.setString(6, taskSpec.getUserInput());
            statement.setString(7, JdbcSerializationSupport.toJson(taskSpec.getScope()));
            statement.setString(8, JdbcSerializationSupport.toJson(taskSpec.getNonGoals()));
            statement.setString(9, JdbcSerializationSupport.toJson(taskSpec.getAcceptanceCriteria()));
            statement.setString(10, JdbcSerializationSupport.toJson(taskSpec.getRequiredSkills()));
            statement.setString(11, JdbcSerializationSupport.toJson(taskSpec.getExpectedArtifacts()));
            statement.setString(12, taskSpec.getStatus().name());
            statement.setTimestamp(13, JdbcSerializationSupport.timestamp(taskSpec.getCreatedAt()));
            statement.setTimestamp(14, JdbcSerializationSupport.timestamp(taskSpec.getUpdatedAt()));
            statement.executeUpdate();
            return taskSpec;
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to save task spec", exception);
        }
    }

    @Override
    public Optional<TaskSpec> findTaskSpecById(TaskSpecId taskSpecId) {
        List<TaskSpec> specs = querySpecs("SELECT * FROM agenthub_task_specs WHERE id = ?", taskSpecId.value());
        return specs.stream().findFirst();
    }

    @Override
    public List<TaskSpec> findTaskSpecsByConversationId(ConversationId conversationId) {
        return querySpecs("SELECT * FROM agenthub_task_specs WHERE conversation_id = ? ORDER BY created_at", conversationId.value());
    }

    @Override
    public TaskRun saveTaskRun(TaskRun taskRun) {
        saveRun(taskRun);
        saveSteps(taskRun);
        return taskRun;
    }

    @Override
    public Optional<TaskRun> findTaskRunById(TaskRunId taskRunId) {
        List<TaskRun> taskRuns = queryRuns("SELECT * FROM agenthub_task_runs WHERE id = ?", taskRunId.value());
        return taskRuns.stream().findFirst();
    }

    @Override
    public List<TaskRun> findTaskRunsByConversationId(ConversationId conversationId) {
        return queryRuns("SELECT * FROM agenthub_task_runs WHERE conversation_id = ? ORDER BY created_at", conversationId.value());
    }

    @Override
    public List<TaskRun> findRecentTaskRunsByConversationId(ConversationId conversationId, int limit) {
        List<TaskRun> taskRuns = queryRuns(
                "SELECT * FROM agenthub_task_runs WHERE conversation_id = ? ORDER BY created_at DESC LIMIT ?",
                conversationId.value(),
                Math.max(0, limit));
        Collections.reverse(taskRuns);
        return taskRuns;
    }

    @Override
    public List<TaskRun> searchTaskRunsByConversationId(ConversationId conversationId, List<String> keywords, int limit) {
        List<String> normalizedKeywords = normalizeKeywords(keywords);
        if (normalizedKeywords.isEmpty()) {
            return List.of();
        }
        if (fulltextEnabled) {
            String sql = """
                    SELECT * FROM agenthub_task_runs
                    WHERE conversation_id = ?
                      AND MATCH(result_summary, decision_summary) AGAINST (? IN NATURAL LANGUAGE MODE)
                    ORDER BY created_at DESC
                    LIMIT ?
                    """;
            List<TaskRun> taskRuns = queryRuns(
                    sql,
                    conversationId.value(),
                    toFulltextQuery(normalizedKeywords),
                    Math.max(0, limit));
            Collections.reverse(taskRuns);
            return taskRuns;
        }
        String where = likeWhere("LOWER(CONCAT(COALESCE(result_summary, ''), ' ', COALESCE(decision_summary, '')))", normalizedKeywords.size());
        String sql = "SELECT * FROM agenthub_task_runs WHERE conversation_id = ? AND (" + where
                + ") ORDER BY created_at DESC LIMIT ?";
        List<TaskRun> taskRuns = queryRuns(sql, conversationId.value(), normalizedKeywords, Math.max(0, limit));
        Collections.reverse(taskRuns);
        return taskRuns;
    }

    private void saveRun(TaskRun taskRun) {
        String sql = """
                REPLACE INTO agenthub_task_runs
                (id, conversation_id, task_spec_id, status, task_plan_goal, decision_mode, planner_decision,
                 routing_decision, execution_decision, aggregation_decision, fallback_decision, decision_summary,
                 result_summary, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """;
        OrchestratorDecisionLog decisionLog = taskRun.getOrchestratorDecisionLog();
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement(sql)) {
            statement.setString(1, taskRun.getId().value());
            statement.setString(2, taskRun.getConversationId().value());
            statement.setString(3, taskRun.getTaskSpecId().value());
            statement.setString(4, taskRun.getStatus().name());
            statement.setString(5, taskRun.getTaskPlan() == null ? null : taskRun.getTaskPlan().getGoal());
            statement.setString(6, decisionLog.getDecisionMode());
            statement.setString(7, decisionLog.getPlannerDecision());
            statement.setString(8, decisionLog.getRoutingDecision());
            statement.setString(9, decisionLog.getExecutionDecision());
            statement.setString(10, decisionLog.getAggregationDecision());
            statement.setString(11, decisionLog.getFallbackDecision());
            statement.setString(12, decisionLog.getSummary());
            statement.setString(13, taskRun.getResultSummary());
            statement.setTimestamp(14, JdbcSerializationSupport.timestamp(taskRun.getCreatedAt()));
            statement.setTimestamp(15, JdbcSerializationSupport.timestamp(taskRun.getUpdatedAt()));
            statement.executeUpdate();
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to save task run", exception);
        }
    }

    private void saveSteps(TaskRun taskRun) {
        String deleteSql = "DELETE FROM agenthub_task_steps WHERE task_run_id = ?";
        String insertSql = """
                INSERT INTO agenthub_task_steps
                (id, task_run_id, step_order, assigned_agent_id, task_description, status, input_context, output_content,
                 preferred_adapter_type, actual_adapter_type, adapter_status, adapter_response_summary,
                 adapter_error_message, parallel_group_key, depends_on_step_orders_json, routing_reason,
                 real_output_used, artifact_parse_status, artifact_build_validation_status,
                 artifact_quality_status, artifact_quality_score, artifact_quality_reason,
                 produced_artifact_ids_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """;
        try (Connection connection = connectionFactory.open()) {
            try (var delete = connection.prepareStatement(deleteSql)) {
                delete.setString(1, taskRun.getId().value());
                delete.executeUpdate();
            }
            try (var insert = connection.prepareStatement(insertSql)) {
                for (TaskStep step : taskRun.getSteps()) {
                    insert.setString(1, step.getId().value());
                    insert.setString(2, taskRun.getId().value());
                    insert.setInt(3, step.getStepOrder());
                    insert.setString(4, step.getAssignedAgentId().value());
                    insert.setString(5, step.getTaskDescription());
                    insert.setString(6, step.getStatus().name());
                    insert.setString(7, step.getInputContext());
                    insert.setString(8, step.getOutputContent());
                    insert.setString(9, step.getPreferredAdapterType());
                    insert.setString(10, step.getActualAdapterType());
                    insert.setString(11, step.getAdapterStatus());
                    insert.setString(12, step.getAdapterResponseSummary());
                    insert.setString(13, step.getAdapterErrorMessage());
                    insert.setString(14, step.getParallelGroupKey());
                    insert.setString(15, JdbcSerializationSupport.toJson(step.getDependsOnStepOrders()));
                    insert.setString(16, step.getRoutingReason());
                    insert.setBoolean(17, step.isRealOutputUsed());
                    insert.setString(18, step.getArtifactParseStatus());
                    insert.setString(19, step.getArtifactBuildValidationStatus());
                    insert.setString(20, step.getArtifactQualityStatus());
                    if (step.getArtifactQualityScore() == null) {
                        insert.setObject(21, null);
                    } else {
                        insert.setInt(21, step.getArtifactQualityScore());
                    }
                    insert.setString(22, step.getArtifactQualityReason());
                    insert.setString(23, JdbcSerializationSupport.artifactIdsJson(step.getProducedArtifactIds()));
                    insert.setTimestamp(24, JdbcSerializationSupport.timestamp(step.getCreatedAt()));
                    insert.setTimestamp(25, JdbcSerializationSupport.timestamp(step.getUpdatedAt()));
                    insert.addBatch();
                }
                insert.executeBatch();
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to save task steps", exception);
        }
    }

    private List<TaskSpec> querySpecs(String sql, String value) {
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement(sql)) {
            statement.setString(1, value);
            try (ResultSet resultSet = statement.executeQuery()) {
                java.util.ArrayList<TaskSpec> specs = new java.util.ArrayList<>();
                while (resultSet.next()) {
                    specs.add(mapSpec(resultSet));
                }
                return specs;
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to query task specs", exception);
        }
    }

    private List<TaskRun> queryRuns(String sql, String value) {
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement(sql)) {
            statement.setString(1, value);
            try (ResultSet resultSet = statement.executeQuery()) {
                java.util.ArrayList<TaskRun> runs = new java.util.ArrayList<>();
                while (resultSet.next()) {
                    runs.add(mapRun(resultSet));
                }
                return runs;
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to query task runs", exception);
        }
    }

    private List<TaskRun> queryRuns(String sql, String value, int limit) {
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement(sql)) {
            statement.setString(1, value);
            statement.setInt(2, limit);
            try (ResultSet resultSet = statement.executeQuery()) {
                java.util.ArrayList<TaskRun> runs = new java.util.ArrayList<>();
                while (resultSet.next()) {
                    runs.add(mapRun(resultSet));
                }
                return runs;
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to query task runs", exception);
        }
    }

    private List<TaskRun> queryRuns(String sql, String conversationId, List<String> keywords, int limit) {
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement(sql)) {
            statement.setString(1, conversationId);
            int index = 2;
            for (String keyword : keywords) {
                statement.setString(index++, "%" + keyword + "%");
            }
            statement.setInt(index, limit);
            try (ResultSet resultSet = statement.executeQuery()) {
                java.util.ArrayList<TaskRun> runs = new java.util.ArrayList<>();
                while (resultSet.next()) {
                    runs.add(mapRun(resultSet));
                }
                return runs;
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to search task runs", exception);
        }
    }

    private List<TaskRun> queryRuns(String sql, String conversationId, String fulltextQuery, int limit) {
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement(sql)) {
            statement.setString(1, conversationId);
            statement.setString(2, fulltextQuery);
            statement.setInt(3, limit);
            try (ResultSet resultSet = statement.executeQuery()) {
                java.util.ArrayList<TaskRun> runs = new java.util.ArrayList<>();
                while (resultSet.next()) {
                    runs.add(mapRun(resultSet));
                }
                return runs;
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to fulltext search task runs", exception);
        }
    }

    private String likeWhere(String columnExpression, int keywordCount) {
        return java.util.stream.IntStream.range(0, keywordCount)
                .mapToObj(index -> columnExpression + " LIKE ?")
                .collect(java.util.stream.Collectors.joining(" OR "));
    }

    private List<String> normalizeKeywords(List<String> keywords) {
        if (keywords == null) {
            return List.of();
        }
        return keywords.stream()
                .filter(keyword -> keyword != null && !keyword.isBlank())
                .map(keyword -> keyword.toLowerCase(Locale.ROOT))
                .distinct()
                .toList();
    }

    private String toFulltextQuery(List<String> keywords) {
        return String.join(" ", keywords);
    }

    private TaskSpec mapSpec(ResultSet resultSet) throws SQLException {
        String sourceMessageId = resultSet.getString("source_message_id");
        return new TaskSpec(
                new TaskSpecId(resultSet.getString("id")),
                new ConversationId(resultSet.getString("conversation_id")),
                sourceMessageId == null ? null : new MessageId(sourceMessageId),
                resultSet.getString("title"),
                resultSet.getString("user_goal"),
                resultSet.getString("user_input"),
                JdbcSerializationSupport.stringList(resultSet.getString("scope_json")),
                JdbcSerializationSupport.stringList(resultSet.getString("non_goals_json")),
                JdbcSerializationSupport.stringList(resultSet.getString("acceptance_criteria_json")),
                JdbcSerializationSupport.stringList(resultSet.getString("required_skills_json")),
                JdbcSerializationSupport.stringList(resultSet.getString("expected_artifacts_json")),
                TaskSpecStatus.valueOf(resultSet.getString("status")),
                JdbcSerializationSupport.instant(resultSet.getTimestamp("created_at")),
                JdbcSerializationSupport.instant(resultSet.getTimestamp("updated_at")));
    }

    private TaskRun mapRun(ResultSet resultSet) throws SQLException {
        TaskRunId taskRunId = new TaskRunId(resultSet.getString("id"));
        List<TaskStep> steps = loadSteps(taskRunId);
        TaskPlan taskPlan = new TaskPlan(resultSet.getString("task_plan_goal"), steps);
        OrchestratorDecisionLog decisionLog = new OrchestratorDecisionLog(
                resultSet.getString("decision_mode"),
                resultSet.getString("planner_decision"),
                resultSet.getString("routing_decision"),
                resultSet.getString("execution_decision"),
                resultSet.getString("aggregation_decision"),
                resultSet.getString("fallback_decision"),
                resultSet.getString("decision_summary"));
        return new TaskRun(
                taskRunId,
                new ConversationId(resultSet.getString("conversation_id")),
                new TaskSpecId(resultSet.getString("task_spec_id")),
                TaskRunStatus.valueOf(resultSet.getString("status")),
                taskPlan,
                steps,
                TaskGraph.fromSteps(steps),
                decisionLog,
                resultSet.getString("result_summary"),
                JdbcSerializationSupport.instant(resultSet.getTimestamp("created_at")),
                JdbcSerializationSupport.instant(resultSet.getTimestamp("updated_at")));
    }

    private List<TaskStep> loadSteps(TaskRunId taskRunId) {
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement(
                        "SELECT * FROM agenthub_task_steps WHERE task_run_id = ? ORDER BY step_order")) {
            statement.setString(1, taskRunId.value());
            try (ResultSet resultSet = statement.executeQuery()) {
                java.util.ArrayList<TaskStep> steps = new java.util.ArrayList<>();
                while (resultSet.next()) {
                    steps.add(new TaskStep(
                            new TaskStepId(resultSet.getString("id")),
                            new TaskRunId(resultSet.getString("task_run_id")),
                            resultSet.getInt("step_order"),
                            new AgentId(resultSet.getString("assigned_agent_id")),
                            resultSet.getString("task_description"),
                            TaskStepStatus.valueOf(resultSet.getString("status")),
                            resultSet.getString("input_context"),
                            resultSet.getString("output_content"),
                            resultSet.getString("preferred_adapter_type"),
                            resultSet.getString("actual_adapter_type"),
                            resultSet.getString("adapter_status"),
                            resultSet.getString("adapter_response_summary"),
                            resultSet.getString("adapter_error_message"),
                            resultSet.getString("parallel_group_key"),
                            JdbcSerializationSupport.integerList(resultSet.getString("depends_on_step_orders_json")),
                            resultSet.getString("routing_reason"),
                            readOptionalBoolean(resultSet, "real_output_used"),
                            readOptionalColumn(resultSet, "artifact_parse_status"),
                            readOptionalColumn(resultSet, "artifact_build_validation_status"),
                            readOptionalColumn(resultSet, "artifact_quality_status"),
                            readOptionalInteger(resultSet, "artifact_quality_score"),
                            readOptionalColumn(resultSet, "artifact_quality_reason"),
                            JdbcSerializationSupport.artifactIds(resultSet.getString("produced_artifact_ids_json")),
                            JdbcSerializationSupport.instant(resultSet.getTimestamp("created_at")),
                            JdbcSerializationSupport.instant(resultSet.getTimestamp("updated_at"))));
                }
                return steps.stream().sorted(Comparator.comparingInt(TaskStep::getStepOrder)).toList();
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to load task steps", exception);
        }
    }

    private void initSchema() {
        try (Connection connection = connectionFactory.open();
                var statement = connection.createStatement()) {
            statement.executeUpdate("""
                    CREATE TABLE IF NOT EXISTS agenthub_task_specs (
                        id VARCHAR(128) PRIMARY KEY,
                        conversation_id VARCHAR(128) NOT NULL,
                        source_message_id VARCHAR(128),
                        title VARCHAR(512),
                        user_goal TEXT,
                        user_input TEXT,
                        scope_json TEXT,
                        non_goals_json TEXT,
                        acceptance_criteria_json TEXT,
                        required_skills_json TEXT,
                        expected_artifacts_json TEXT,
                        status VARCHAR(64),
                        created_at TIMESTAMP,
                        updated_at TIMESTAMP
                    )
                    """);
            statement.executeUpdate("""
                    CREATE TABLE IF NOT EXISTS agenthub_task_runs (
                        id VARCHAR(128) PRIMARY KEY,
                        conversation_id VARCHAR(128) NOT NULL,
                        task_spec_id VARCHAR(128) NOT NULL,
                        status VARCHAR(64),
                        task_plan_goal TEXT,
                        decision_mode VARCHAR(128),
                        planner_decision TEXT,
                        routing_decision TEXT,
                        execution_decision TEXT,
                        aggregation_decision TEXT,
                        fallback_decision TEXT,
                        decision_summary TEXT,
                        result_summary TEXT,
                        created_at TIMESTAMP,
                        updated_at TIMESTAMP
                    )
                    """);
            statement.executeUpdate("""
                    CREATE TABLE IF NOT EXISTS agenthub_task_steps (
                        id VARCHAR(128) PRIMARY KEY,
                        task_run_id VARCHAR(128) NOT NULL,
                        step_order INT,
                        assigned_agent_id VARCHAR(128),
                        task_description TEXT,
                        status VARCHAR(64),
                        input_context LONGTEXT,
                        output_content LONGTEXT,
                        preferred_adapter_type VARCHAR(64),
                        actual_adapter_type VARCHAR(64),
                        adapter_status VARCHAR(64),
                        adapter_response_summary TEXT,
                        adapter_error_message TEXT,
                        parallel_group_key VARCHAR(128),
                        depends_on_step_orders_json TEXT,
                        routing_reason TEXT,
                        real_output_used BOOLEAN,
                        artifact_parse_status VARCHAR(64),
                        artifact_build_validation_status VARCHAR(64),
                        artifact_quality_status VARCHAR(64),
                        artifact_quality_score INT,
                        artifact_quality_reason TEXT,
                        produced_artifact_ids_json TEXT,
                        created_at TIMESTAMP,
                        updated_at TIMESTAMP
                    )
                    """);
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to initialize task schema", exception);
        }
    }

    private String readOptionalColumn(ResultSet resultSet, String columnName) {
        try {
            return resultSet.getString(columnName);
        } catch (SQLException ignored) {
            return null;
        }
    }

    private boolean readOptionalBoolean(ResultSet resultSet, String columnName) {
        try {
            return resultSet.getBoolean(columnName);
        } catch (SQLException ignored) {
            return false;
        }
    }

    private Integer readOptionalInteger(ResultSet resultSet, String columnName) {
        try {
            int value = resultSet.getInt(columnName);
            return resultSet.wasNull() ? null : value;
        } catch (SQLException ignored) {
            return null;
        }
    }
}
