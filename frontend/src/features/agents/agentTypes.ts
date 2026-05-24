import type { IdValue } from "../../utils/id";

export type ToolCapabilityKey = "code" | "preview" | "review" | "deploy" | "api" | "schema" | "task_planner" | "task_router";

export interface ToolCapabilityOption {
  key: ToolCapabilityKey;
  label: string;
  description: string;
  resolvedCapabilities: string[];
}

export const TOOL_CAPABILITY_OPTIONS: ToolCapabilityOption[] = [
  {
    key: "code",
    label: "代码生成",
    description: "生成或修改前端/代码类 Artifact",
    resolvedCapabilities: ["CODE", "FRONTEND_ARTIFACT_GENERATION"]
  },
  {
    key: "preview",
    label: "预览呈现",
    description: "渲染 Web 预览并处理 Artifact 预览任务",
    resolvedCapabilities: ["WEB_PREVIEW", "ARTIFACT_PREVIEW", "FRONTEND_ARTIFACT_GENERATION"]
  },
  {
    key: "review",
    label: "质量审查",
    description: "输出 Review 报告、质量检查和修订建议",
    resolvedCapabilities: ["REVIEW_REPORT", "QUALITY_REVIEW"]
  },
  {
    key: "deploy",
    label: "部署发布",
    description: "处理部署、发布和预览发布流程",
    resolvedCapabilities: ["DEPLOYMENT", "DEPLOY_PREVIEW"]
  },
  {
    key: "api",
    label: "API 设计",
    description: "编写 API contract、后端接口和集成约定",
    resolvedCapabilities: ["API_CONTRACT", "API_CONTRACT_DESIGN"]
  },
  {
    key: "schema",
    label: "数据模型",
    description: "设计 schema、数据结构和接口模型",
    resolvedCapabilities: ["DATA_MODEL", "API_CONTRACT_DESIGN"]
  },
  {
    key: "task_planner",
    label: "任务规划",
    description: "拆解任务步骤并生成可执行计划",
    resolvedCapabilities: ["PLANNING", "TASK_PLANNING"]
  },
  {
    key: "task_router",
    label: "任务路由",
    description: "根据技能需求路由到合适 Agent",
    resolvedCapabilities: ["ROUTING", "AGENT_ROUTING"]
  }
];

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
  routeAttempts?: number;
  routeSuccesses?: number;
  routeFallbacks?: number;
  routeFailures?: number;
  fallbackRate?: number;
  successRate?: number;
}

export interface AdapterExecutionResponse {
  requestId: string;
  preferredAdapterType: string;
  actualAdapterType: string;
  adapterType: string;
  fallbackUsed: boolean;
  status: string;
  content: string;
  producedArtifactHints: string[];
  errorMessage?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
}
