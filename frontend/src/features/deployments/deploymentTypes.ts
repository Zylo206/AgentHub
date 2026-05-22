import type { IdValue } from "../../utils/id";

export interface DeploymentRecord {
  deploymentId: string;
  artifactId: IdValue;
  conversationId: IdValue;
  taskRunId?: IdValue | null;
  artifactTitle: string;
  deployTarget: string;
  status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED" | string;
  previewUrl: string;
  message: string;
  createdAt: string;
}
