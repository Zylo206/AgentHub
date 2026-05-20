import type { IdValue } from "../../utils/id";

export interface ContextSnapshot {
  id: IdValue;
  conversationId: IdValue;
  taskRunId: IdValue;
  includedMessageIds: IdValue[];
  includedArtifactIds: IdValue[];
  pinnedContextItems: string[];
  summary: string;
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
