import { useState, useCallback } from "react";
import Prism from "prismjs";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-python";
import "prismjs/components/prism-java";
import "prismjs/components/prism-json";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-css";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-yaml";
import type { Artifact } from "./artifactTypes";

// ---------------------------------------------------------------------------
// Language mapping: artifact.language → Prism grammar key
// ---------------------------------------------------------------------------
const LANGUAGE_MAP: Record<string, string> = {
  javascript: "javascript",
  js: "javascript",
  jsx: "jsx",
  typescript: "typescript",
  ts: "typescript",
  tsx: "jsx",
  python: "python",
  py: "python",
  java: "java",
  json: "json",
  markdown: "markdown",
  md: "markdown",
  css: "css",
  bash: "bash",
  sh: "bash",
  shell: "bash",
  yaml: "yaml",
  yml: "yaml",
  html: "markup",
  xml: "markup",
  svg: "markup",
};

function resolvePrismLanguage(language?: string | null): string {
  if (!language) return "javascript";
  return LANGUAGE_MAP[language.toLowerCase()] ?? "javascript";
}

// ---------------------------------------------------------------------------
// Syntax highlighting helper
// ---------------------------------------------------------------------------
function highlightCode(code: string, language?: string | null): string {
  const langKey = resolvePrismLanguage(language);
  const grammar = Prism.languages[langKey] ?? Prism.languages.javascript;
  try {
    return Prism.highlight(code, grammar, langKey);
  } catch {
    // Fallback: escape HTML and return plain text
    return code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
}

// ---------------------------------------------------------------------------
// Markdown → HTML via marked (supports tables, lists, code blocks, etc.)
// ---------------------------------------------------------------------------
import { marked } from "marked";

// Configure marked for safe, clean output
marked.setOptions({
  breaks: true,
  gfm: true,
});

function renderMarkdown(text: string): string {
  try {
    const result = marked.parse(text);
    // marked.parse returns string | Promise<string>; sync mode returns string
    if (typeof result === "string") return result;
    return text;
  } catch {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br/>");
  }
}

// ---------------------------------------------------------------------------
// Artifact type helpers
// ---------------------------------------------------------------------------
export function isPptArtifact(artifact: Artifact): boolean {
  const value = `${artifact.type} ${artifact.language} ${artifact.title}`.toLowerCase();
  return value.includes("ppt") || value.includes("powerpoint") || value.includes("slide");
}

export function isDocumentArtifact(artifact: Artifact): boolean {
  const value = `${artifact.type} ${artifact.language} ${artifact.title}`.toLowerCase();
  return value.includes("doc") || value.includes("markdown") || value.includes("md");
}

export function isCodeArtifact(artifact: Artifact): boolean {
  return (
    artifact.type === "CODE" ||
    artifact.type === "API_CONTRACT" ||
    artifact.type === "DATA_MODEL"
  );
}

// ---------------------------------------------------------------------------
// Copy button component
// ---------------------------------------------------------------------------
export function CopyButton({ content, className }: { content: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content ?? "");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = content ?? "";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [content]);

  return (
    <button
      type="button"
      className={className ?? "artifact-copy-btn"}
      onClick={handleCopy}
      title={copied ? "已复制" : "复制内容"}
    >
      {copied ? "✓ 已复制" : "复制"}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Render options
// ---------------------------------------------------------------------------
export interface RenderArtifactOptions {
  /** Max lines to show (for inline preview). 0 or undefined = show all */
  maxLines?: number;
  /** Whether to show line numbers */
  showLineNumbers?: boolean;
  /** CSS class prefix for the rendered content */
  classPrefix?: string;
  /** Whether to use sandbox on iframe (PreviewPage uses sandbox="", Dock doesn't) */
  iframeSandbox?: string;
  /** Whether this is a markdown-aware render context */
  markdownMode?: "raw" | "simple-html";
}

// ---------------------------------------------------------------------------
// Main render function
// ---------------------------------------------------------------------------
export function renderArtifactContent(
  artifact: Artifact,
  options: RenderArtifactOptions = {}
): JSX.Element {
  const {
    maxLines,
    showLineNumbers = false,
    classPrefix = "artifact-preview",
    iframeSandbox,
    markdownMode = "simple-html",
  } = options;

  const content = artifact.content ?? "";

  // --- WEB_PREVIEW: iframe ---
  if (artifact.type === "WEB_PREVIEW" && content.trim().startsWith("<")) {
    return (
      <iframe
        className={`${classPrefix}__frame`}
        title={artifact.title}
        srcDoc={content}
        sandbox={iframeSandbox}
      />
    );
  }

  // --- PPT: metadata shell ---
  if (isPptArtifact(artifact)) {
    return (
      <div className={`${classPrefix}__file-shell`} data-testid="artifact-ppt-preview-shell">
        <span className={`${classPrefix}__file-icon`}>PPT</span>
        <strong>{artifact.title}</strong>
        <p>PPT 当前支持查看元信息、下载、作为上下文或 Memory 使用；不提供完整在线幻灯片编辑器。</p>
        <dl>
          <div>
            <dt>版本</dt>
            <dd>v{artifact.version}</dd>
          </div>
          <div>
            <dt>大小</dt>
            <dd>{content.length} 字符</dd>
          </div>
        </dl>
      </div>
    );
  }

  // --- Document / Markdown ---
  if (isDocumentArtifact(artifact) || artifact.type === "REVIEW_REPORT") {
    const displayContent = maxLines && maxLines > 0
      ? content.split("\n").slice(0, maxLines).join("\n")
      : content;

    if (markdownMode === "simple-html" && (artifact.language === "markdown" || artifact.language === "md" || artifact.type === "MARKDOWN")) {
      return (
        <div
          className={`${classPrefix}__markdown`}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(displayContent) }}
        />
      );
    }

    return (
      <article className={`${classPrefix}__document`}>
        <strong>{artifact.title}</strong>
        <p>{displayContent || "暂无文档内容。"}</p>
      </article>
    );
  }

  // --- Code / API_CONTRACT / DATA_MODEL / default ---
  const lines = content.split("\n");
  const displayLines = maxLines && maxLines > 0 ? lines.slice(0, maxLines) : lines;
  const truncated = maxLines && maxLines > 0 && lines.length > maxLines;
  const langClass = `language-${resolvePrismLanguage(artifact.language)}`;

  if (showLineNumbers) {
    return (
      <div className={`${classPrefix}__code-container`}>
        <pre className={`${classPrefix}__code`}>
          <code
            className={langClass}
            dangerouslySetInnerHTML={{
              __html: displayLines
                .map(
                  (line, i) =>
                    `<span class="code-lineno">${String(i + 1).padStart(3, " ")}</span>${highlightCode(line, artifact.language)}`
                )
                .join("\n") + (truncated ? "\n..." : ""),
            }}
          />
        </pre>
      </div>
    );
  }

  return (
    <pre className={`${classPrefix}__code`}>
      <code
        className={langClass}
        dangerouslySetInnerHTML={{
          __html: highlightCode(displayLines.join("\n"), artifact.language) + (truncated ? "\n..." : ""),
        }}
      />
    </pre>
  );
}
