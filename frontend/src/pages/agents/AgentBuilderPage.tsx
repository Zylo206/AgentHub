import { useState } from "react";
import { createAgent } from "../../api/agenthubApi";
import type { Agent } from "../../features/agents/agentTypes";

const ADAPTER_OPTIONS = ["MOCK", "CODEX", "CLAUDE_CODE", "OPEN_CODE", "OPENAI_COMPATIBLE"] as const;

function parseTags(input: string): string[] {
  return input
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}

export function AgentBuilderPage() {
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [capabilityTags, setCapabilityTags] = useState("React, UI, CSS");
  const [toolTags, setToolTags] = useState("code, preview");
  const [preferredAdapterType, setPreferredAdapterType] = useState("CODEX");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [createdAgent, setCreatedAgent] = useState<Agent | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const agent = await createAgent({
        name,
        avatarUrl,
        systemPrompt,
        capabilityTags: parseTags(capabilityTags),
        toolTags: parseTags(toolTags),
        preferredAdapterType
      });
      setCreatedAgent(agent);
      setSuccessMessage("Agent created successfully. Return to workspace to see the new agent.");
      setName("");
      setAvatarUrl("");
      setSystemPrompt("");
      setCapabilityTags("React, UI, CSS");
      setToolTags("code, preview");
      setPreferredAdapterType("CODEX");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="simple-page">
      <div className="simple-page__card">
        <h1>Agent Builder</h1>
        <p>Create a minimal custom agent for the AgentHub demo workspace.</p>

        <form className="agent-builder-form" onSubmit={handleSubmit}>
          <label className="agent-builder-field">
            <span>Agent Name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="My Frontend Agent" />
          </label>

          <label className="agent-builder-field">
            <span>Avatar URL</span>
            <input
              value={avatarUrl}
              onChange={(event) => setAvatarUrl(event.target.value)}
              placeholder="https://example.com/avatar.png"
            />
          </label>

          <label className="agent-builder-field">
            <span>System Prompt</span>
            <textarea
              value={systemPrompt}
              onChange={(event) => setSystemPrompt(event.target.value)}
              placeholder="You are a frontend specialist."
            />
          </label>

          <label className="agent-builder-field">
            <span>Capability Tags</span>
            <input
              value={capabilityTags}
              onChange={(event) => setCapabilityTags(event.target.value)}
              placeholder="React, UI, CSS"
            />
          </label>

          <label className="agent-builder-field">
            <span>Tool Tags</span>
            <input
              value={toolTags}
              onChange={(event) => setToolTags(event.target.value)}
              placeholder="code, preview"
            />
          </label>

          <label className="agent-builder-field">
            <span>Preferred Adapter</span>
            <select
              value={preferredAdapterType}
              onChange={(event) => setPreferredAdapterType(event.target.value)}
            >
              {ADAPTER_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <div className="agent-builder-actions">
            <button type="submit" className="primary-button" disabled={submitting || !name.trim()}>
              {submitting ? "Creating..." : "Create Agent"}
            </button>
          </div>
        </form>

        {errorMessage ? <div className="builder-feedback builder-feedback--error">{errorMessage}</div> : null}
        {successMessage ? <div className="builder-feedback builder-feedback--success">{successMessage}</div> : null}

        {createdAgent ? (
          <div className="builder-summary">
            <h2>Created Agent Summary</h2>
            <p><strong>Name:</strong> {createdAgent.name}</p>
            <p><strong>Role:</strong> {createdAgent.role}</p>
            <p><strong>Preferred Adapter:</strong> {createdAgent.preferredAdapterType || "MOCK"}</p>
            <p><strong>Capability Tags:</strong> {createdAgent.capabilityTags.join(", ") || "None"}</p>
            <p><strong>Tool Tags:</strong> {createdAgent.toolTags.join(", ") || "None"}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
