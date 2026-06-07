import type { IdValue } from "../../utils/id";

export interface Conversation {
  id: IdValue;
  title: string;
  type: string;
  participantAgentIds: IdValue[];
  ownerUserId?: string;
  orgTag?: string;
  visibility?: "PRIVATE" | "ORG" | "PUBLIC";
  memberRoles?: Record<string, string>;
  pinned?: boolean;
  archived?: boolean;
  unreadCount?: number;
  lastReadAt?: string | null;
  lastMessageAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
