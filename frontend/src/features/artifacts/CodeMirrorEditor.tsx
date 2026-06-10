import { useEffect, useRef, useCallback } from "react";
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from "@codemirror/view";
import { EditorState, type Extension } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { syntaxHighlighting, defaultHighlightStyle, indentOnInput, bracketMatching, foldGutter } from "@codemirror/language";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { json } from "@codemirror/lang-json";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { markdown } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";

// ---------------------------------------------------------------------------
// Language mapping
// ---------------------------------------------------------------------------
const LANGUAGE_EXTENSIONS: Record<string, () => Extension> = {
  javascript: () => javascript(),
  js: () => javascript(),
  jsx: () => javascript({ jsx: true }),
  typescript: () => javascript({ typescript: true }),
  ts: () => javascript({ typescript: true }),
  tsx: () => javascript({ jsx: true, typescript: true }),
  python: () => python(),
  py: () => python(),
  json: () => json(),
  css: () => css(),
  html: () => html(),
  xml: () => html(),
  svg: () => html(),
  markdown: () => markdown(),
  md: () => markdown(),
};

function getLanguageExtension(language?: string | null): Extension {
  if (!language) return javascript();
  const factory = LANGUAGE_EXTENSIONS[language.toLowerCase()];
  return factory ? factory() : javascript();
}

// ---------------------------------------------------------------------------
// Selection info
// ---------------------------------------------------------------------------
export interface SelectionInfo {
  startLine: number;
  endLine: number;
  selectedText: string;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface CodeMirrorEditorProps {
  content: string;
  language?: string | null;
  readOnly?: boolean;
  height?: string;
  dark?: boolean;
  onChange?: (value: string) => void;
  onSelectionChange?: (info: SelectionInfo | null) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function CodeMirrorEditor({
  content,
  language,
  readOnly = false,
  height = "320px",
  dark = false,
  onChange,
  onSelectionChange,
}: CodeMirrorEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onSelectionChangeRef = useRef(onSelectionChange);

  // Keep callbacks in refs to avoid recreating the editor on every render
  onChangeRef.current = onChange;
  onSelectionChangeRef.current = onSelectionChange;

  const extractSelection = useCallback((view: EditorView): SelectionInfo | null => {
    const { from, to } = view.state.selection.main;
    if (from === to) return null;
    const doc = view.state.doc;
    const startLine = doc.lineAt(from).number;
    const endLine = doc.lineAt(to).number;
    const selectedText = doc.sliceString(from, to);
    return { startLine, endLine, selectedText };
  }, []);

  // Create editor on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const extensions: Extension[] = [
      lineNumbers(),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      history(),
      indentOnInput(),
      bracketMatching(),
      foldGutter(),
      syntaxHighlighting(defaultHighlightStyle),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      getLanguageExtension(language),
      EditorView.theme({
        "&": { height, fontSize: "13px" },
        ".cm-scroller": { overflow: "auto", fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace' },
        ".cm-content": { padding: "8px 0" },
        ".cm-line": { padding: "0 8px" },
        ".cm-gutters": {
          background: dark ? "#1e293b" : "#f8f9fb",
          borderRight: `1px solid ${dark ? "rgba(148,163,184,0.15)" : "rgba(31,35,41,0.06)"}`,
          color: dark ? "#64748b" : "#a7adb5",
        },
        ".cm-activeLineGutter": { background: dark ? "rgba(59,130,246,0.1)" : "rgba(47,115,255,0.06)" },
        ".cm-activeLine": { background: dark ? "rgba(59,130,246,0.06)" : "rgba(47,115,255,0.04)" },
        "&.cm-focused": { outline: "none" },
      }),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChangeRef.current?.(update.state.doc.toString());
        }
        if (update.selectionSet) {
          onSelectionChangeRef.current?.(extractSelection(update.view));
        }
      }),
    ];

    if (readOnly) {
      extensions.push(EditorState.readOnly.of(true));
      extensions.push(EditorView.editable.of(false));
    }

    if (dark) {
      extensions.push(oneDark);
    }

    const state = EditorState.create({
      doc: content,
      extensions,
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly, dark, language]);

  // Sync external content changes (e.g., when switching artifacts)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const currentContent = view.state.doc.toString();
    if (currentContent !== content) {
      view.dispatch({
        changes: { from: 0, to: currentContent.length, insert: content },
      });
    }
  }, [content]);

  return (
    <div
      ref={containerRef}
      className="cm-editor-container"
      data-testid="codemirror-editor"
    />
  );
}
