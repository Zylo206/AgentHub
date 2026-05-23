import type { IdValue } from "../../utils/id";

export interface ArtifactSnapshot {
  snapshotId: string;
  artifactId: IdValue;
  conversationId: IdValue;
  taskRunId: IdValue;
  title: string;
  type: string;
  status: string;
  language: string;
  content: string;
  version: number;
  operationType: string;
  createdAt: string;
}
