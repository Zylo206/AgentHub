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
  createdAt: string;
  updatedAt: string;
}
