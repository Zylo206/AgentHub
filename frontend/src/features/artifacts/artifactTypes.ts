import type { IdValue } from "../../utils/id";

export interface Artifact {
  id: IdValue;
  conversationId: IdValue;
  taskRunId: IdValue;
  parentArtifactId?: string | null;
  revisionInstruction?: string | null;
  title: string;
  type: string;
  status: string;
  language: string;
  content: string;
  version: number;
  sourceKind?: string | null;
  sourceAdapterType?: string | null;
  sourceTaskStepId?: string | null;
  generationMode?: string | null;
  buildValidationStatus?: string | null;
  qualityStatus?: string | null;
  qualityReason?: string | null;
  qualityScore?: number | null;
  createdAt: string;
  updatedAt: string;
}
