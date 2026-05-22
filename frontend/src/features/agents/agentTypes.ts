import type { IdValue } from "../../utils/id";

export interface Agent {
  id: IdValue;
  name: string;
  avatarUrl?: string | null;
  role: string;
  description: string;
  systemPrompt: string;
  preferredAdapterType?: string | null;
  capabilityTags: string[];
  toolTags: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdapterDescriptor {
  adapterType: string;
  status: string;
  enabled: boolean;
  placeholder: boolean;
  description: string;
  failureReason?: string | null;
  isDefault?: boolean;
}
