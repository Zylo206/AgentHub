import type { IdValue } from "../../utils/id";

export interface ContextSnapshot {
  id: IdValue;
  conversationId: IdValue;
  taskRunId: IdValue;
  includedMessageIds: IdValue[];
  includedArtifactIds: IdValue[];
  pinnedContextItems: string[];
  retrievedContextItems?: RetrievedContextItem[];
  summary: string;
  createdAt: string;
}

export interface RetrievedContextItem {
  sourceType: string;
  sourceId: string;
  title: string;
  content: string;
  score: number;
  reason: string;
  taskStepId?: IdValue | null;
  injectedStepId?: IdValue | null;
  injectionStepId?: IdValue | null;
  targetStepId?: IdValue | null;
  stepId?: IdValue | null;
  injectedIntoStep?: string | null;
}

export interface PinnedContext {
  id: string;
  conversationId: IdValue;
  content: string;
  sourceType: string;
  sourceId: string;
  createdAt: string;
}

export interface HandoffSummary {
  id: string;
  taskRunId: IdValue;
  sourceStepId: IdValue;
  targetStepId: IdValue;
  sourceAgentId: string;
  targetAgentId: string;
  passedArtifactIds: IdValue[];
  keyDecisions: string[];
  openIssues: string[];
  summary: string;
  createdAt: string;
}
