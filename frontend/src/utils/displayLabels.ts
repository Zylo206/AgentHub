export function normalizeStatusClass(value?: string | null): string {
  return (value || "unknown").toLowerCase().replace(/_/g, "-");
}

export function displayAgentRole(value?: string | null): string {
  const labels: Record<string, string> = {
    ORCHESTRATOR: "主控 Agent",
    FRONTEND_BUILDER: "前端构建 Agent",
    BACKEND_WORKER: "后端协作 Agent",
    REVIEWER: "评审 Agent",
    CUSTOM: "自定义 Agent"
  };

  return value ? labels[value] || value : "-";
}

export function displayStatus(value?: string | null): string {
  const labels: Record<string, string> = {
    ACTIVE: "启用",
    DISABLED: "禁用",
    AVAILABLE: "可用",
    PLACEHOLDER: "占位",
    MISCONFIGURED: "未配置",
    ERROR: "异常",
    CREATED: "已创建",
    ACCEPTED: "已验收",
    REJECTED: "已拒绝",
    PENDING: "待处理",
    RUNNING: "运行中",
    COMPLETED: "已完成",
    FAILED: "失败",
    BLOCKED: "阻塞",
    APPROVED: "已批准",
    CANCELLED: "已取消",
    CONSUMED: "已消费",
    EXPIRED: "已过期",
    FALLBACK_USED: "已 fallback"
  };

  return value ? labels[value] || value : "-";
}

export function displayConversationType(value?: string | null): string {
  const labels: Record<string, string> = {
    SINGLE: "单聊",
    GROUP: "群聊"
  };

  return value ? labels[value] || value : "-";
}

export function displayArtifactType(value?: string | null): string {
  const labels: Record<string, string> = {
    CODE: "代码",
    MARKDOWN: "文档",
    API_CONTRACT: "API 契约",
    DATA_MODEL: "数据模型",
    REVIEW_REPORT: "评审报告",
    WEB_PREVIEW: "网页预览",
    DIFF_SUMMARY: "Diff 摘要"
  };

  return value ? labels[value] || value : "-";
}

export function displayArtifactSourceKind(value?: string | null): string {
  const labels: Record<string, string> = {
    STATIC_TEMPLATE: "静态模板",
    REAL_ADAPTER: "真实 Adapter 输出",
    MOCK_FALLBACK: "Mock fallback",
    USER_REVISION: "用户修改",
    DEPLOY_PREVIEW: "部署预览"
  };

  return value ? labels[value] || value : "-";
}

export function displayMessageSender(value?: string | null): string {
  const labels: Record<string, string> = {
    USER: "用户",
    AGENT: "Agent",
    SYSTEM: "系统"
  };

  return value ? labels[value] || value : "-";
}
