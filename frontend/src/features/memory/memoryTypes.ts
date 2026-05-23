import type { IdValue } from "../../utils/id";

export interface MemoryItem {
  memoryId: string;
  conversationId: IdValue;
  sourceType: string;
  sourceId: string;
  scope: string;
  category: string;
  content: string;
  importance: number;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string;
}
