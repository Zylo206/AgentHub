import type { Artifact } from "../artifacts/artifactTypes";
import type { IdValue } from "../../utils/id";

export interface Message {
  id: IdValue;
  conversationId: IdValue;
  senderType: "USER" | "AGENT" | "SYSTEM" | string;
  senderId: string;
  targetAgentId?: string | null;
  messageType: "TEXT" | "TASK_SPEC" | "TASK_STATUS" | "DEPLOY_STATUS" | "ARTIFACT_CARD" | "ERROR" | string;
  content: string;
  artifactIds: IdValue[];
  createdAt: string;
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
  producedArtifactIds: IdValue[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskPlan {
  goal: string;
  steps: TaskStep[];
}

export interface TaskRun {
  id: IdValue;
  conversationId: IdValue;
  taskSpecId: IdValue;
  status: string;
  taskPlan?: TaskPlan;
  steps: TaskStep[];
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
