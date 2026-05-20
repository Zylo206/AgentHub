import type { IdValue } from "../../utils/id";

export interface Agent {
  id: IdValue;
  name: string;
  role: string;
  description: string;
  systemPrompt: string;
  capabilityTags: string[];
  toolTags: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
}
