import type { Artifact } from "../artifacts/artifactTypes";
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
  summary: string;
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
  resultSummary: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceSnapshot {
  messages: Message[];
  taskSpecs: TaskSpec[];
  taskRuns: TaskRun[];
  artifacts: Artifact[];
}
