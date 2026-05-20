import type { IdValue } from "../../utils/id";

export interface Conversation {
  id: IdValue;
  title: string;
  type: string;
  participantAgentIds: IdValue[];
  createdAt: string;
  updatedAt: string;
}
