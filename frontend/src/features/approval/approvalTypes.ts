export interface ApprovalRequest {
  approvalId: string;
  conversationId: { value: string } | string;
  actionType: string;
  targetType: string;
  targetId: string;
  riskLevel: string;
  summary: string;
  affectedItems: string[];
  status: "PENDING" | "APPROVED" | "CANCELLED" | "CONSUMED" | "EXPIRED" | string;
  createdAt: string;
  resolvedAt?: string | null;
  expiresAt?: string | null;
}
