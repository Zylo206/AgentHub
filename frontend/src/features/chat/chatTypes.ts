import type { Artifact } from "../artifacts/artifactTypes";
import type { ApprovalRequest } from "../approval/approvalTypes";
import type { IdValue } from "../../utils/id";

export interface Message {
  id: IdValue;
  conversationId: IdValue;
  senderType: "USER" | "AGENT" | "SYSTEM" | string;
  senderId: string;
  targetAgentId?: string | null;
  mentionedAgentIds?: string[] | null;
  replyToMessageId?: string | null;
  quotedMessageId?: string | null;
  quotedMessageContent?: string | null;
  messageType:
    | "TEXT"
    | "TASK"
    | "RESULT"
    | "REVIEW"
    | "APPROVAL"
    | "REJECTION"
    | "TASK_SPEC"
    | "TASK_STATUS"
    | "DEPLOY_STATUS"
    | "ARTIFACT_CARD"
    | "ERROR"
    | string;
  content: string;
  attachments?: LightweightAttachment[];
  artifactIds: IdValue[];
  createdAt: string;
}

export interface LightweightAttachment {
  attachmentId?: string;
  id?: string;
  fileName: string;
  contentType?: string;
  mimeType?: string;
  size?: number;
  sizeBytes?: number;
  contentPreview?: string;
  previewText?: string;
  source?: "LOCAL_DEMO" | "TEXT_SNIPPET" | string;
}

export interface TaskSpec {
  id: IdValue;
  conversationId: IdValue;
  sourceMessageId: IdValue;
  title: string;
  userGoal: string;
  userInput: string;
  scope: string[];
  nonGoals: string[];
  acceptanceCriteria: string[];
  requiredSkills: string[];
  expectedArtifacts: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskStep {
  id: IdValue;
  taskRunId: IdValue;
  stepOrder: number;
  assignedAgentId: IdValue;
  assignedAgentName?: string;
  taskDescription: string;
  status: string;
  inputContext: string;
  outputContent: string;
  preferredAdapterType?: string;
  actualAdapterType?: string;
  adapterType?: string;
  adapterStatus?: string;
  adapterResponseSummary?: string;
  adapterErrorMessage?: string;
  parallelGroupKey?: string | null;
  dependsOnStepOrders?: number[];
  routingReason?: string | null;
  nodeId?: string | null;
  nodeType?: string | null;
  retryPolicy?: string | null;
  timeoutSeconds?: number | null;
  idempotencyKey?: string | null;
  fallbackStrategy?: string | null;
  nodeStatus?: string | null;
  terminalStatus?: string | null;
  retryAttempt?: number | null;
  executionToken?: string | null;
  leaseVersion?: number | null;
  startedAt?: string | null;
  completedAt?: string | null;
  failureType?: string | null;
  discardedReason?: string | null;
  finalDecision?: string | null;
  realOutputUsed?: boolean;
  artifactParseStatus?: string | null;
  artifactQualityStatus?: string | null;
  artifactQualityReason?: string | null;
  artifactQualityScore?: number | null;
  artifactBuildValidationStatus?: string | null;
  artifactBuildValidationReason?: string | null;
  realAdapterOutcome?: "ACCEPTED" | "PARSE_FAILED" | "QUALITY_FAILED" | "BUILD_FAILED" | "FALLBACK" | string | null;
  producedArtifactIds: IdValue[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskPlan {
  goal: string;
  steps: TaskStep[];
}

export interface ExecutionBatch {
  batchKey: string;
  stepOrders: number[];
  dependsOnBatchKeys: string[];
  executionMode: string;
  batchStatus?: string;
  startedAt?: string | null;
  completedAt?: string | null;
  durationMs?: number | null;
  failurePolicy?: string | null;
}

export interface TaskGraph {
  graphType: string;
  executionBatches: ExecutionBatch[];
  nodes?: TaskGraphNode[];
  summary: string;
}

export interface TaskGraphNode {
  nodeId: string;
  nodeType: string;
  stepOrder: number;
  dependsOnNodeIds: string[];
  retryPolicy?: string | null;
  timeoutSeconds?: number | null;
  idempotencyKey?: string | null;
  fallbackStrategy?: string | null;
  status?: string | null;
  terminalStatus?: string | null;
  retryAttempt?: number | null;
  executionToken?: string | null;
  leaseVersion?: number | null;
  startedAt?: string | null;
  completedAt?: string | null;
  failureType?: string | null;
  discardedReason?: string | null;
  finalDecision?: string | null;
}

export interface TaskRunTimelineEntry {
  timelineId: string;
  entryType: string;
  taskRunId: string;
  taskStepId?: string | null;
  nodeId?: string | null;
  title: string;
  detail: string;
  status: string;
  failureType?: string | null;
  createdAt: string;
}

export interface TaskRunObservabilityValueCount {
  label: string;
  count: number;
}

export interface TaskRunObservabilitySummary {
  taskRunCount: number;
  timelineEntryCount: number;
  retryCount: number;
  fallbackCount: number;
  discardedResultCount: number;
  approvalBypassAttempts: number;
  failureTypes: TaskRunObservabilityValueCount[];
  conflictTypes: TaskRunObservabilityValueCount[];
  fallbackReasons: TaskRunObservabilityValueCount[];
  discardedReasons: TaskRunObservabilityValueCount[];
}

export interface OrchestratorDecisionLog {
  decisionMode: string;
  plannerDecision: string;
  routingDecision: string;
  executionDecision: string;
  aggregationDecision: string;
  fallbackDecision: string;
  summary: string;
}

export interface TaskRun {
  id: IdValue;
  conversationId: IdValue;
  taskSpecId: IdValue;
  status: string;
  taskPlan?: TaskPlan;
  steps: TaskStep[];
  taskGraph?: TaskGraph;
  orchestratorDecisionLog?: OrchestratorDecisionLog;
  timeline?: TaskRunTimelineEntry[];
  retryCount?: number;
  resultSummary: string;
  createdAt: string;
  updatedAt: string;
}

export type StreamingPreviewStatus = "STREAMING" | "PARTIAL" | "DISCARDED";

export interface StreamingPreviewState {
  taskRunId: string;
  taskStepId: string;
  adapterType?: string;
  content: string;
  chunkCount: number;
  status: StreamingPreviewStatus;
  updatedAt: string;
  finishReason?: string;
}

export interface OrchestratorTriggerSuggestion {
  enabled: boolean;
  mode: string;
  requireApproval: boolean;
  matched: boolean;
  decision: string;
  reason: string;
  matchedKeywords: string[];
  pendingApproval?: ApprovalRequest | null;
  taskRun?: TaskRun | null;
}

export interface DeployIntentDraft {
  messageId: string;
  status: "PENDING" | "APPROVAL_REQUIRED" | "DEPLOYING" | "COMPLETED" | "CANCELLED" | "FAILED";
  artifactId?: string | null;
  approvalId?: string | null;
  errorMessage?: string | null;
}

export interface WorkspaceSnapshot {
  messages: Message[];
  taskSpecs: TaskSpec[];
  taskRuns: TaskRun[];
  artifacts: Artifact[];
}
