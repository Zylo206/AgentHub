-- AgentHub JDBC profile schema.
-- This file mirrors the lightweight JDBC repositories and is safe to run repeatedly.
-- Target dialect: MySQL 8+ / MariaDB compatible.
-- Context Search defaults to LIKE. FULLTEXT indexes below are optional and are
-- only required when AGENTHUB_CONTEXT_SEARCH_FULLTEXT_ENABLED=true.

CREATE TABLE IF NOT EXISTS agenthub_conversations (
    id VARCHAR(128) PRIMARY KEY,
    title VARCHAR(512) NOT NULL,
    type VARCHAR(64) NOT NULL,
    participant_agent_ids_json TEXT,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    INDEX idx_agenthub_conversations_updated_at (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS agenthub_agents (
    id VARCHAR(128) PRIMARY KEY,
    name VARCHAR(256) NOT NULL,
    avatar_url TEXT,
    role VARCHAR(64) NOT NULL,
    description TEXT,
    system_prompt LONGTEXT,
    preferred_adapter_type VARCHAR(64),
    capability_tags_json TEXT,
    tool_tags_json TEXT,
    status VARCHAR(64) NOT NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    INDEX idx_agenthub_agents_role_created (role, created_at),
    INDEX idx_agenthub_agents_updated_at (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS agenthub_messages (
    id VARCHAR(128) PRIMARY KEY,
    conversation_id VARCHAR(128) NOT NULL,
    sender_type VARCHAR(64) NOT NULL,
    sender_id VARCHAR(128),
    target_agent_id VARCHAR(128),
    mentioned_agent_ids_json TEXT,
    reply_to_message_id VARCHAR(128),
    quoted_message_id VARCHAR(128),
    quoted_message_content TEXT,
    message_type VARCHAR(64) NOT NULL,
    content LONGTEXT,
    artifact_ids_json TEXT,
    attachments_json TEXT,
    created_at TIMESTAMP NULL,
    INDEX idx_agenthub_messages_conversation_created (conversation_id, created_at),
    FULLTEXT KEY ft_agenthub_messages_content (content)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS agenthub_attachments (
    attachment_id VARCHAR(128) PRIMARY KEY,
    conversation_id VARCHAR(128) NOT NULL,
    message_id VARCHAR(128),
    file_name VARCHAR(512) NOT NULL,
    content_type VARCHAR(256),
    size_bytes BIGINT NOT NULL,
    storage_path TEXT NOT NULL,
    storage_key TEXT,
    checksum_sha256 VARCHAR(128),
    visibility VARCHAR(64),
    owner_user_id VARCHAR(128),
    scan_status VARCHAR(64),
    content_preview TEXT,
    created_at TIMESTAMP NULL,
    deleted_at TIMESTAMP NULL,
    INDEX idx_agenthub_attachments_conversation_created (conversation_id, created_at),
    INDEX idx_agenthub_attachments_message_created (message_id, created_at),
    FULLTEXT KEY ft_agenthub_attachments_file_preview (file_name, content_preview)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS agenthub_artifacts (
    id VARCHAR(128) PRIMARY KEY,
    conversation_id VARCHAR(128) NOT NULL,
    task_run_id VARCHAR(128),
    parent_artifact_id VARCHAR(128),
    revision_instruction TEXT,
    title VARCHAR(512) NOT NULL,
    type VARCHAR(64) NOT NULL,
    status VARCHAR(64) NOT NULL,
    language VARCHAR(64),
    content LONGTEXT,
    version INT,
    source_kind VARCHAR(64),
    source_adapter_type VARCHAR(64),
    source_task_step_id VARCHAR(128),
    generation_mode VARCHAR(64),
    build_validation_status VARCHAR(64),
    build_validation_reason TEXT,
    quality_status VARCHAR(64),
    quality_score INT,
    quality_reason TEXT,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    INDEX idx_agenthub_artifacts_conversation_created (conversation_id, created_at),
    INDEX idx_agenthub_artifacts_task_run_created (task_run_id, created_at),
    FULLTEXT KEY ft_agenthub_artifacts_title_content (title, content)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    INDEX idx_agenthub_task_specs_conversation_created (conversation_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    INDEX idx_agenthub_task_runs_conversation_created (conversation_id, created_at),
    INDEX idx_agenthub_task_runs_task_spec (task_spec_id),
    FULLTEXT KEY ft_agenthub_task_runs_result_decision (result_summary, decision_summary)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
    artifact_build_validation_reason TEXT,
    artifact_quality_status VARCHAR(64),
    artifact_quality_score INT,
    artifact_quality_reason TEXT,
    produced_artifact_ids_json TEXT,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    INDEX idx_agenthub_task_steps_run_order (task_run_id, step_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS agenthub_context_snapshots (
    id VARCHAR(128) PRIMARY KEY,
    conversation_id VARCHAR(128) NOT NULL,
    task_run_id VARCHAR(128) NOT NULL,
    included_message_ids_json TEXT,
    included_artifact_ids_json TEXT,
    pinned_context_items_json TEXT,
    retrieved_context_items_json LONGTEXT,
    summary TEXT,
    created_at TIMESTAMP NULL,
    INDEX idx_agenthub_context_snapshots_conversation_created (conversation_id, created_at),
    INDEX idx_agenthub_context_snapshots_task_run_created (task_run_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS agenthub_pinned_contexts (
    id VARCHAR(128) PRIMARY KEY,
    conversation_id VARCHAR(128) NOT NULL,
    content LONGTEXT,
    source_type VARCHAR(128),
    source_id VARCHAR(128),
    created_at TIMESTAMP NULL,
    UNIQUE KEY uq_agenthub_pinned_context_source (conversation_id, source_type, source_id),
    INDEX idx_agenthub_pinned_contexts_conversation_created (conversation_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS agenthub_artifact_snapshots (
    snapshot_id VARCHAR(128) PRIMARY KEY,
    artifact_id VARCHAR(128) NOT NULL,
    conversation_id VARCHAR(128) NOT NULL,
    task_run_id VARCHAR(128) NULL,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(64) NOT NULL,
    status VARCHAR(64) NOT NULL,
    language VARCHAR(64) NULL,
    content MEDIUMTEXT,
    version INT NOT NULL,
    operation_type VARCHAR(64) NOT NULL,
    created_at TIMESTAMP NULL,
    INDEX idx_agenthub_artifact_snapshots_conversation_created (conversation_id, created_at),
    INDEX idx_agenthub_artifact_snapshots_artifact_created (artifact_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS agenthub_deployments (
    deployment_id VARCHAR(128) PRIMARY KEY,
    artifact_id VARCHAR(128) NOT NULL,
    conversation_id VARCHAR(128) NOT NULL,
    task_run_id VARCHAR(128) NULL,
    artifact_title VARCHAR(255) NOT NULL,
    deploy_target VARCHAR(64) NOT NULL,
    status VARCHAR(64) NOT NULL,
    preview_url VARCHAR(512) NOT NULL,
    message TEXT,
    created_at TIMESTAMP NULL,
    INDEX idx_agenthub_deployments_conversation_created (conversation_id, created_at),
    INDEX idx_agenthub_deployments_artifact_created (artifact_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS agenthub_memory_items (
    memory_id VARCHAR(128) PRIMARY KEY,
    conversation_id VARCHAR(128) NOT NULL,
    source_type VARCHAR(128),
    source_id VARCHAR(128),
    scope VARCHAR(64),
    category VARCHAR(128),
    content LONGTEXT,
    embedding_json LONGTEXT,
    importance INT,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    last_used_at TIMESTAMP NULL,
    UNIQUE KEY uq_agenthub_memory_source (conversation_id, source_type, source_id),
    INDEX idx_agenthub_memory_conversation_updated (conversation_id, updated_at),
    INDEX idx_agenthub_memory_scope_updated (scope, updated_at),
    FULLTEXT KEY ft_agenthub_memory_content (content)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS agenthub_handoff_summaries (
    id VARCHAR(128) PRIMARY KEY,
    task_run_id VARCHAR(128) NOT NULL,
    source_step_id VARCHAR(128),
    target_step_id VARCHAR(128),
    source_agent_id VARCHAR(128),
    target_agent_id VARCHAR(128),
    passed_artifact_ids_json TEXT,
    key_decisions_json TEXT,
    open_issues_json TEXT,
    summary TEXT,
    created_at TIMESTAMP NULL,
    INDEX idx_agenthub_handoff_summaries_task_run_created (task_run_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS agenthub_approval_requests (
    approval_id VARCHAR(128) PRIMARY KEY,
    conversation_id VARCHAR(128) NOT NULL,
    action_type VARCHAR(128) NOT NULL,
    target_type VARCHAR(128) NOT NULL,
    target_id VARCHAR(128) NOT NULL,
    risk_level VARCHAR(64),
    summary TEXT,
    affected_items_json TEXT,
    status VARCHAR(64) NOT NULL,
    created_at TIMESTAMP NULL,
    resolved_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    INDEX idx_agenthub_approval_conversation_created (conversation_id, created_at),
    INDEX idx_agenthub_approval_status_expires (status, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS agenthub_action_audits (
    audit_id VARCHAR(128) PRIMARY KEY,
    conversation_id VARCHAR(128) NOT NULL,
    action_type VARCHAR(128) NOT NULL,
    target_type VARCHAR(128) NOT NULL,
    target_id VARCHAR(128) NOT NULL,
    status VARCHAR(64) NOT NULL,
    summary TEXT,
    created_at TIMESTAMP NULL,
    INDEX idx_agenthub_action_audits_conversation_created (conversation_id, created_at),
    INDEX idx_agenthub_action_audits_action_created (action_type, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
