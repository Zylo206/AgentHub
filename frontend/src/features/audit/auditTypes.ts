import type { IdValue } from "../../utils/id";

export interface ActionAuditLog {
  auditId: string;
  conversationId: IdValue;
  actionType: string;
  targetType: string;
  targetId: string;
  status: string;
  summary: string;
  createdAt: string;
}
