import type { IdValue } from "../../utils/id";

export interface Conversation {
  id: IdValue;
  title: string;
  type: string;
  participantAgentIds: IdValue[];
  pinned?: boolean;
  archived?: boolean;
  unreadCount?: number;
  lastReadAt?: string | null;
  lastMessageAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
