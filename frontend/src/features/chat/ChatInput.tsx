import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import type { Agent } from "../agents/agentTypes";
import type { ArtifactSelectionReference } from "../artifacts/artifactTypes";
import type { LightweightAttachment, Message } from "./chatTypes";
import { parseLeadingAgentMention } from "./agentMention";
import { formatId, getIdValue } from "../../utils/id";

interface ChatInputProps {
  value: string;
  disabled: boolean;
  sending: boolean;
  agents: Agent[];
  selectedAgent?: Agent | null;
  quotedMessage?: Message | null;
  quoteMode?: "quote" | "reply";
  artifactSelectionReference?: ArtifactSelectionReference | null;
  attachments: LightweightAttachment[];
  onChange: (value: string) => void;
  onAttachmentsChange: (attachments: LightweightAttachment[]) => void;
  onUploadFiles?: (files: File[]) => Promise<LightweightAttachment[]>;
  onClearQuote?: () => void;
  onClearArtifactSelection?: () => void;
  onSend: () => void;
}

interface MentionQuery {
  query: string;
  start: number;
  end: number;
}

function uniqueAgents(agents: Agent[]): Agent[] {
  const seen = new Set<string>();
  return agents.filter((agent) => {
    const id = getIdValue(agent.id);
    if (!id || seen.has(id)) {
      return false;
    }
    seen.add(id);
    return true;
  });
}

function summarizeCapabilities(agents: Agent[]): string[] {
  return Array.from(new Set(agents.flatMap((agent) => agent.toolTags || []).filter(Boolean))).slice(0, 6);
}

function formatAttachmentSize(size?: number): string {
  if (typeof size !== "number" || Number.isNaN(size)) {
    return "size n/a";
  }
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function getAttachmentContentType(attachment: LightweightAttachment): string {
  return attachment.contentType || attachment.mimeType || "attachment";
}

function getActiveMentionQuery(value: string, cursorPosition: number): MentionQuery | null {
  const safeCursor = Math.max(0, Math.min(cursorPosition, value.length));
  const beforeCursor = value.slice(0, safeCursor);
  const mentionMatch = beforeCursor.match(/(?:^|\s)@([^\s@]*)$/);
  if (!mentionMatch) {
    return null;
  }

  const mentionToken = mentionMatch[0].trimStart();
  const start = beforeCursor.length - mentionToken.length;

  return {
    query: mentionMatch[1] || "",
    start,
    end: safeCursor
  };
}

function sortAgentsByMatch(agents: Agent[], query: string): Agent[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return agents;
  }

  return [...agents].sort((left, right) => {
    const leftName = left.name.toLowerCase();
    const rightName = right.name.toLowerCase();
    const leftStarts = leftName.startsWith(normalizedQuery) ? 0 : 1;
    const rightStarts = rightName.startsWith(normalizedQuery) ? 0 : 1;
    if (leftStarts !== rightStarts) {
      return leftStarts - rightStarts;
    }
    return leftName.localeCompare(rightName);
  });
}

export function ChatInput({
  value,
  disabled,
  sending,
  agents,
  selectedAgent,
  quotedMessage,
  quoteMode = "quote",
  artifactSelectionReference,
  attachments,
  onChange,
  onAttachmentsChange,
  onUploadFiles,
  onClearQuote,
  onClearArtifactSelection,
  onSend
}: ChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [cursorPosition, setCursorPosition] = useState(value.length);
  const [activeMentionIndex, setActiveMentionIndex] = useState(0);

  const routingPreview = useMemo(() => {
    const parsedMention = parseLeadingAgentMention(value, agents);
    const mentionedAgents = parsedMention.error ? [] : parsedMention.matchedAgents;
    const targetAgents = uniqueAgents(mentionedAgents.length > 0 ? mentionedAgents : selectedAgent ? [selectedAgent] : []);
    const adapters = Array.from(new Set(targetAgents.map((agent) => agent.preferredAdapterType || "MOCK")));
    const capabilities = summarizeCapabilities(targetAgents);

    if (parsedMention.error) {
      return {
        mode: "MENTION_ERROR",
        title: "Agent 指定异常",
        detail: parsedMention.error,
        agents: [],
        adapters: [],
        capabilities: []
      };
    }

    if (targetAgents.length > 1) {
      return {
        mode: "MULTI_AGENT",
        title: "多 Agent 协作",
        detail: "消息开头的多个 @Agent 会作为协作成员，由 Orchestrator 继续拆分任务。",
        agents: targetAgents,
        adapters,
        capabilities
      };
    }

    if (targetAgents.length === 1) {
      return {
        mode: "SINGLE_AGENT",
        title: `To: @${targetAgents[0].name}`,
        detail: "当前消息优先发给该 Agent；需要时 Orchestrator 仍可补充其他成员。",
        agents: targetAgents,
        adapters,
        capabilities
      };
    }

    return {
      mode: "AUTO_ROUTE",
      title: "To: Orchestrator",
      detail: "未指定 Agent 时，按能力和可用性自动分派。",
      agents: [],
      adapters: [],
      capabilities: []
    };
  }, [agents, selectedAgent, value]);

  const activeMentionQuery = useMemo(() => getActiveMentionQuery(value, cursorPosition), [cursorPosition, value]);

  const mentionSuggestions = useMemo(() => {
    if (!activeMentionQuery) {
      return [];
    }

    const normalizedQuery = activeMentionQuery.query.trim().toLowerCase();
    const filteredAgents = agents.filter((agent) => {
      if (!normalizedQuery) {
        return true;
      }

      return [agent.name, agent.role, agent.preferredAdapterType, ...agent.capabilityTags, ...agent.toolTags]
        .filter(Boolean)
        .some((candidate) => String(candidate).toLowerCase().includes(normalizedQuery));
    });

    return sortAgentsByMatch(filteredAgents, normalizedQuery).slice(0, 6);
  }, [activeMentionQuery, agents]);

  useEffect(() => {
    setActiveMentionIndex((current) => {
      if (mentionSuggestions.length === 0) {
        return 0;
      }
      return Math.min(current, mentionSuggestions.length - 1);
    });
  }, [mentionSuggestions]);

  async function addLocalFiles(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    const fileList = Array.from(files);
    if (onUploadFiles) {
      const uploadedAttachments = await onUploadFiles(fileList);
      onAttachmentsChange([...attachments, ...uploadedAttachments]);
      return;
    }

    const nextAttachments: LightweightAttachment[] = await Promise.all(
      fileList.map(async (file, index) => {
        const isTextLike =
          file.type.startsWith("text/") ||
          /\.(md|txt|json|csv|log|tsx?|jsx?|css|html)$/i.test(file.name);
        const contentPreview = isTextLike ? await file.text().then((text) => text.slice(0, 1200)).catch(() => "") : "";

        return {
          attachmentId: `local-${Date.now()}-${index}-${file.name}`,
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
          mimeType: file.type || "application/octet-stream",
          size: file.size,
          sizeBytes: file.size,
          contentPreview,
          previewText: contentPreview,
          source: "LOCAL_DEMO"
        };
      })
    );

    onAttachmentsChange([...attachments, ...nextAttachments]);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!disabled && !sending) {
      onSend();
    }
  }

  function updateCursorPositionFromTextarea() {
    if (!textareaRef.current) {
      return;
    }
    setCursorPosition(textareaRef.current.selectionStart || 0);
  }

  function applyMention(agent: Agent) {
    if (!activeMentionQuery) {
      return;
    }

    const mentionText = `@${agent.name} `;
    const nextValue = `${value.slice(0, activeMentionQuery.start)}${mentionText}${value.slice(activeMentionQuery.end)}`;
    const nextCursorPosition = activeMentionQuery.start + mentionText.length;

    onChange(nextValue);
    setCursorPosition(nextCursorPosition);
    setActiveMentionIndex(0);

    requestAnimationFrame(() => {
      if (!textareaRef.current) {
        return;
      }
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(nextCursorPosition, nextCursorPosition);
    });
  }

  function insertTextAtCursor(text: string) {
    const selectionStart = textareaRef.current?.selectionStart ?? value.length;
    const selectionEnd = textareaRef.current?.selectionEnd ?? value.length;
    const nextValue = `${value.slice(0, selectionStart)}${text}${value.slice(selectionEnd)}`;
    const nextCursorPosition = selectionStart + text.length;
    onChange(nextValue);
    setCursorPosition(nextCursorPosition);

    requestAnimationFrame(() => {
      if (!textareaRef.current) {
        return;
      }
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(nextCursorPosition, nextCursorPosition);
    });
  }

  function handleTextareaKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (mentionSuggestions.length === 0 || !activeMentionQuery) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveMentionIndex((current) => (current + 1) % mentionSuggestions.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveMentionIndex((current) => (current - 1 + mentionSuggestions.length) % mentionSuggestions.length);
      return;
    }

    if ((event.key === "Enter" || event.key === "Tab") && !event.shiftKey) {
      event.preventDefault();
      applyMention(mentionSuggestions[activeMentionIndex] ?? mentionSuggestions[0]);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setCursorPosition(value.length);
    }
  }

  function insertMentionHint() {
    if (disabled || sending) {
      return;
    }
    insertTextAtCursor("@");
  }

  const routeSummary =
    routingPreview.agents.length > 0
      ? routingPreview.agents.map((agent) => `@${agent.name}`).join(" / ")
      : "Orchestrator";
  const routeMeta = routingPreview.adapters.length > 0 ? routingPreview.adapters.join(" / ") : "自动分派";
  const routePillLabel = activeMentionQuery
    ? mentionSuggestions.length > 0
      ? `可选 Agent ${mentionSuggestions.length}`
      : "未找到 Agent"
    : routingPreview.mode === "MENTION_ERROR"
      ? "路由异常"
      : "当前路由";

  return (
    <form className="chat-input" data-testid="chat-input" onSubmit={handleSubmit}>
      <textarea
        ref={textareaRef}
        className="chat-input__textarea"
        data-testid="chat-input-textarea"
        rows={3}
        placeholder="发送消息，输入 @ 查看可用 Agent，或直接描述你的任务。"
        value={value}
        disabled={disabled}
        onChange={(event) => {
          onChange(event.target.value);
          setCursorPosition(event.target.selectionStart || event.target.value.length);
        }}
        onClick={updateCursorPositionFromTextarea}
        onKeyDown={handleTextareaKeyDown}
        onSelect={updateCursorPositionFromTextarea}
      />

      {mentionSuggestions.length > 0 && activeMentionQuery ? (
        <div className="chat-agent-mention-menu" data-testid="chat-agent-mention-menu" role="listbox" aria-label="Agent suggestions">
          {mentionSuggestions.map((agent, index) => {
            const isActive = index === activeMentionIndex;
            return (
              <button
                key={getIdValue(agent.id) || agent.name}
                type="button"
                role="option"
                aria-selected={isActive}
                className={`chat-agent-mention-menu__item${isActive ? " chat-agent-mention-menu__item--active" : ""}`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  applyMention(agent);
                }}
              >
                <strong>@{agent.name}</strong>
                <span>{agent.role}</span>
                <em>{agent.preferredAdapterType || "MOCK"}</em>
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="chat-input__context-chips" aria-label="Composer context">
        {quotedMessage ? (
          <div className="chat-context-chip chat-quote-preview">
            <strong>{quoteMode === "reply" ? "回复" : "引用"}</strong>
            <span>{quotedMessage.content}</span>
            <em>{formatId(quotedMessage.id)}</em>
            <button type="button" className="ghost-button" data-testid="chat-quote-clear" onClick={onClearQuote}>
              移除
            </button>
          </div>
        ) : null}

        {artifactSelectionReference ? (
          <div className="chat-context-chip chat-artifact-selection-preview" data-testid="chat-artifact-selection-preview">
            <strong>局部修改</strong>
            <span>
              正在修改 {artifactSelectionReference.artifactTitle} v{artifactSelectionReference.artifactVersion} 的第{" "}
              {artifactSelectionReference.startLine}-{artifactSelectionReference.endLine} 行
            </span>
            <code>{artifactSelectionReference.selectedText.slice(0, 120)}</code>
            <button type="button" className="ghost-button" data-testid="chat-artifact-selection-clear" onClick={onClearArtifactSelection}>
              移除
            </button>
          </div>
        ) : null}

        {attachments.map((attachment) => (
          <div className="chat-context-chip chat-attachment-chip" key={attachment.attachmentId || attachment.id || attachment.fileName}>
            <strong>{attachment.fileName}</strong>
            <span>{getAttachmentContentType(attachment)}</span>
            <em>{formatAttachmentSize(attachment.size ?? attachment.sizeBytes)}</em>
            <button
              type="button"
              className="ghost-button"
              onClick={() => onAttachmentsChange(attachments.filter((item) => item !== attachment))}
            >
              移除
            </button>
          </div>
        ))}
      </div>

      <input
        ref={fileInputRef}
        className="chat-attachment-composer__file"
        data-testid="chat-attachment-file-input"
        type="file"
        multiple
        disabled={disabled || sending}
        onChange={(event) => {
          void addLocalFiles(event.currentTarget.files).catch((error) => {
            console.warn("Attachment upload failed", error);
          });
          event.currentTarget.value = "";
        }}
      />

      <div className="chat-input__actions">
        <div className="chat-input__toolbar" aria-label="Composer tools">
          <button type="button" className="ghost-button" disabled={disabled || sending} onClick={() => fileInputRef.current?.click()}>
            附件
          </button>
          <button type="button" className="ghost-button" disabled={disabled || sending} onClick={insertMentionHint}>
            @Agent
          </button>
          <div
            className={`chat-routing-pill chat-routing-pill--${routingPreview.mode.toLowerCase()}`}
            data-testid="chat-routing-preview"
            title={routingPreview.detail}
          >
            <span>{routePillLabel}</span>
            <strong>{routeSummary}</strong>
            <em>{routeMeta}</em>
          </div>
        </div>
        <button
          type="submit"
          className="primary-button"
          data-testid="chat-send-button"
          disabled={disabled || sending || (!value.trim() && attachments.length === 0)}
        >
          {sending ? "发送中..." : "发送"}
        </button>
      </div>
    </form>
  );
}
