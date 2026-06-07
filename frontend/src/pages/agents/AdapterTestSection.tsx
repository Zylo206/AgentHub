import type { FormEvent } from "react";
import type {
  AdapterDescriptor,
  AdapterExecutionResponse
} from "../../features/agents/agentTypes";
import { displayStatus, normalizeStatusClass } from "../../utils/displayLabels";
import { getAdapterDepthProfile } from "./agentBuilderUtils";

interface AdapterTestQualityReport {
  parseStatus: string;
  qualityStatus: string;
  qualityReason: string;
  acceptedCount: number;
  rejectedCount: number;
}

interface ParsedAdapterArtifact {
  title?: string;
  type?: string;
  language?: string;
  summary?: string;
  content?: string;
}

interface AdapterTestSectionProps {
  adapterOptions: AdapterDescriptor[];
  adapterTestType: string;
  adapterTestPrompt: string;
  testingAdapter: boolean;
  adapterTestError: string | null;
  adapterTestResult: AdapterExecutionResponse | null;
  selectedTestAdapterDescriptor: AdapterDescriptor | null;
  selectedTestAdapterDepthProfile: ReturnType<typeof getAdapterDepthProfile>;
  adapterTestQualityReport: AdapterTestQualityReport;
  parsedAdapterArtifacts: ParsedAdapterArtifact[];
  onAdapterTestTypeChange: (value: string) => void;
  onAdapterTestPromptChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function AdapterTestSection({
  adapterOptions,
  adapterTestType,
  adapterTestPrompt,
  testingAdapter,
  adapterTestError,
  adapterTestResult,
  selectedTestAdapterDescriptor,
  selectedTestAdapterDepthProfile,
  adapterTestQualityReport,
  parsedAdapterArtifacts,
  onAdapterTestTypeChange,
  onAdapterTestPromptChange,
  onSubmit
}: AdapterTestSectionProps) {
  return (
    <section className="adapter-test-panel" id="adapter-test">
      <div className="adapter-test-panel__header">
        <div>
          <p className="eyebrow">Adapter Test</p>
          <h2>Adapter 手动测试面板</h2>
          <p>用于验证 OPENAI_COMPATIBLE / CLI Adapter 的可用性、fallback 原因和 artifact JSON 输出。</p>
        </div>
        <span className={`adapter-health-pill adapter-health-pill--${normalizeStatusClass(selectedTestAdapterDescriptor?.status || "unknown")}`}>
          {displayStatus(selectedTestAdapterDescriptor?.status || "UNKNOWN")}
        </span>
        <span className={`agent-builder-depth-badge ${selectedTestAdapterDepthProfile.className}`}>
          {selectedTestAdapterDepthProfile.label}
        </span>
      </div>

      <form className="adapter-test-form" onSubmit={onSubmit}>
        <label className="agent-builder-field">
          <span>测试 Adapter</span>
          <select value={adapterTestType} onChange={(event) => onAdapterTestTypeChange(event.target.value)}>
            {adapterOptions.map((option) => (
              <option key={`test-${option.adapterType}`} value={option.adapterType}>
                {option.adapterType} - {displayStatus(option.status)}
              </option>
            ))}
          </select>
        </label>
        <label className="agent-builder-field">
          <span>测试 Prompt</span>
          <textarea
            value={adapterTestPrompt}
            onChange={(event) => onAdapterTestPromptChange(event.target.value)}
            placeholder="输入用于测试 Adapter 的任务描述。"
          />
        </label>
        <button type="submit" className="primary-button" disabled={testingAdapter || !adapterTestPrompt.trim()}>
          {testingAdapter ? "测试中..." : "执行 Adapter 测试"}
        </button>
      </form>

      {selectedTestAdapterDescriptor?.failureReason ? (
        <div className="agent-builder-adapter-note agent-builder-adapter-note--warning">
          当前状态说明：{selectedTestAdapterDescriptor.failureReason}
        </div>
      ) : null}
      {adapterTestError ? <div className="builder-feedback builder-feedback--error">{adapterTestError}</div> : null}

      {adapterTestResult ? (
        <div className="adapter-test-result">
          <div className="adapter-test-result__grid">
            <div>
              <span>Preferred</span>
              <strong>{adapterTestResult.preferredAdapterType}</strong>
            </div>
            <div>
              <span>Actual</span>
              <strong>{adapterTestResult.actualAdapterType}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{displayStatus(adapterTestResult.status)}</strong>
            </div>
            <div>
              <span>Fallback</span>
              <strong>{adapterTestResult.fallbackUsed ? "已 fallback" : "未 fallback"}</strong>
            </div>
          </div>
          <div className="adapter-test-result__grid">
            <div>
              <span>Parse Status</span>
              <strong>{adapterTestQualityReport.parseStatus}</strong>
            </div>
            <div>
              <span>Quality Status</span>
              <strong>{adapterTestQualityReport.qualityStatus}</strong>
            </div>
            <div>
              <span>Accepted</span>
              <strong>{adapterTestQualityReport.acceptedCount}</strong>
            </div>
            <div>
              <span>Rejected</span>
              <strong>{adapterTestQualityReport.rejectedCount}</strong>
            </div>
          </div>
          <div className="agent-builder-adapter-note">
            Artifact contract check: {adapterTestQualityReport.qualityReason}
          </div>
          {adapterTestResult.errorMessage ? (
            <div className="agent-builder-adapter-note agent-builder-adapter-note--warning">
              fallback / error：{adapterTestResult.errorMessage}
            </div>
          ) : null}
          <div className="adapter-test-result__section">
            <strong>解析结果</strong>
            {parsedAdapterArtifacts.length > 0 ? (
              <div className="adapter-test-artifact-list">
                {parsedAdapterArtifacts.map((artifact, index) => (
                  <div className="adapter-test-artifact" key={`${artifact.title || "artifact"}-${index}`}>
                    <strong>{artifact.title || `Artifact ${index + 1}`}</strong>
                    <span>{artifact.type || "UNKNOWN"} / {artifact.language || "plain"}</span>
                    {artifact.summary ? <p>{artifact.summary}</p> : null}
                    <small>{(artifact.content || "").length} chars</small>
                  </div>
                ))}
              </div>
            ) : (
              <p>未解析到 artifacts[]。如果 Adapter 返回普通文本，后端会按文本 Artifact 降级处理。</p>
            )}
          </div>
          <div className="adapter-test-result__section">
            <strong>原始响应</strong>
            <pre>{adapterTestResult.content || "(empty response)"}</pre>
          </div>
        </div>
      ) : null}
    </section>
  );
}
