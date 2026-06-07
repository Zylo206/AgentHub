import type { SyntheticEvent } from "react";
import { DiffSummaryPanel } from "./DiffSummaryPanel";
import type { Artifact } from "./artifactTypes";

interface DraftSelection {
  startLine: number;
  endLine: number;
}

interface DraftDiffPreview {
  added: number;
  removed: number;
  changed: number;
  firstChangedLine: number | null;
  hasChanges: boolean;
}

interface ArtifactRevisionWorkspaceProps {
  artifact: Artifact;
  allArtifacts: Artifact[];
  revisingArtifact: boolean;
  isEditingSelectedArtifact: boolean;
  draftContent: string;
  draftNote: string;
  draftSelection: DraftSelection | null;
  draftDiffPreview: DraftDiffPreview | null;
  revisionInstruction: string;
  appliedDiffArtifactId: string | null;
  diffConflictArtifactId: string | null;
  diffConflictMessage: string | null;
  canSendSelectionToChat: boolean;
  onStartContentEdit: (artifact: Artifact) => void;
  onCancelContentEdit: () => void;
  onDraftContentChange: (value: string) => void;
  onDraftNoteChange: (value: string) => void;
  onDraftSelectionChange: (event: SyntheticEvent<HTMLTextAreaElement>) => void;
  onCreateDraftRevision: () => void;
  onSendSelectionToChat: () => void;
  onRevisionInstructionChange: (value: string) => void;
  onCreateRevision: () => void;
  onApplyDiff: (artifact: Artifact) => void;
  onForceApplyDiff: (artifact: Artifact) => void;
}

function formatArtifactSize(content: string | null | undefined): string {
  const length = (content || "").length;
  if (length >= 1000) {
    return `${(length / 1000).toFixed(1)}k chars`;
  }
  return `${length} chars`;
}

export function ArtifactRevisionWorkspace({
  artifact,
  allArtifacts,
  revisingArtifact,
  isEditingSelectedArtifact,
  draftContent,
  draftNote,
  draftSelection,
  draftDiffPreview,
  revisionInstruction,
  appliedDiffArtifactId,
  diffConflictArtifactId,
  diffConflictMessage,
  canSendSelectionToChat,
  onStartContentEdit,
  onCancelContentEdit,
  onDraftContentChange,
  onDraftNoteChange,
  onDraftSelectionChange,
  onCreateDraftRevision,
  onSendSelectionToChat,
  onRevisionInstructionChange,
  onCreateRevision,
  onApplyDiff,
  onForceApplyDiff
}: ArtifactRevisionWorkspaceProps) {
  return (
    <>
      <section className="artifact-content-editor" data-testid="artifact-content-editor-panel">
        <div className="artifact-content-editor__header">
          <div>
            <strong>内容编辑 / 局部修改</strong>
            <p>
              编辑不会直接覆盖当前 Artifact。系统会先生成 Draft Revision，再通过 Diff Preview 和 Approval Gate 应用。
            </p>
          </div>
          <button
            type="button"
            className="secondary-button"
            data-testid="artifact-content-edit-toggle"
            onClick={() => {
              if (isEditingSelectedArtifact) {
                onCancelContentEdit();
              } else {
                onStartContentEdit(artifact);
              }
            }}
          >
            {isEditingSelectedArtifact ? "退出编辑" : "编辑内容"}
          </button>
        </div>

        {isEditingSelectedArtifact ? (
          <>
            <div className="artifact-content-editor__tools">
              <span className="artifact-content-editor__chip">
                {draftSelection
                  ? `已选中第 ${draftSelection.startLine}-${draftSelection.endLine} 行`
                  : "可直接选择 textarea 中的片段"}
              </span>
              <span className="artifact-content-editor__chip">
                {draftDiffPreview?.hasChanges
                  ? `Draft diff: +${draftDiffPreview.added} / -${draftDiffPreview.removed} / 变更 ${draftDiffPreview.changed}`
                  : "尚未修改内容"}
              </span>
              {draftDiffPreview?.firstChangedLine ? (
                <span className="artifact-content-editor__chip">
                  首个变化行：{draftDiffPreview.firstChangedLine}
                </span>
              ) : null}
            </div>
            <textarea
              className="artifact-content-editor__textarea"
              data-testid="artifact-content-editor-textarea"
              value={draftContent}
              disabled={revisingArtifact}
              spellCheck={false}
              onChange={(event) => onDraftContentChange(event.target.value)}
              onSelect={onDraftSelectionChange}
              onKeyUp={onDraftSelectionChange}
              onMouseUp={onDraftSelectionChange}
            />
            <div className="artifact-content-editor__local-instruction">
              <label htmlFor="artifact-local-revision-note">局部修改说明</label>
              <textarea
                id="artifact-local-revision-note"
                data-testid="artifact-local-revision-note"
                value={draftNote}
                disabled={revisingArtifact}
                placeholder="例如：只把选中片段改成带错误态的表单校验，并保持现有 API 不变。"
                onChange={(event) => onDraftNoteChange(event.target.value)}
              />
            </div>
            <div className="artifact-content-editor__diff-preview" data-testid="artifact-draft-diff-preview">
              <div>
                <span>Draft Diff Preview</span>
                <strong>{draftDiffPreview?.hasChanges ? "已检测到本地草稿变更" : "等待编辑或选区说明"}</strong>
              </div>
              <p>
                生成 Draft Revision 后，请在下方 Diff Summary 审查真实行级 diff；Apply / Force Apply
                仍必须经过后端 Approval Gate。
              </p>
            </div>
            <button
              type="button"
              className="primary-button artifact-content-editor__button"
              data-testid="artifact-create-draft-revision"
              disabled={revisingArtifact || (!draftNote.trim() && (artifact.content || "") === draftContent)}
              onClick={onCreateDraftRevision}
            >
              {revisingArtifact ? "生成中..." : "生成 Draft Revision"}
            </button>
            <button
              type="button"
              className="secondary-button artifact-content-editor__chat-button"
              data-testid="artifact-send-selection-to-chat"
              disabled={!canSendSelectionToChat || !draftContent.trim()}
              onClick={onSendSelectionToChat}
            >
              带选区到聊天框修改
            </button>
          </>
        ) : (
          <div className="artifact-content-editor__idle">
            <span>支持完整内容编辑，也支持选中片段 / 行号范围后带说明发起局部 Revision。</span>
            <span>当前 Artifact：{formatArtifactSize(artifact.content)}</span>
          </div>
        )}
      </section>
      <div className="artifact-revision-box">
        <div className="artifact-revision-box__header">
          <strong>产物二次修改</strong>
          <span>本地静态迭代，不代表真实云部署</span>
        </div>
        <textarea
          className="artifact-revision-box__input"
          value={revisionInstruction}
          disabled={revisingArtifact}
          onChange={(event) => onRevisionInstructionChange(event.target.value)}
        />
        <button
          type="button"
          className="primary-button artifact-revision-box__button"
          disabled={revisingArtifact || !revisionInstruction.trim()}
          onClick={onCreateRevision}
        >
          {revisingArtifact ? "修改中..." : "修改选中产物"}
        </button>
      </div>
      <DiffSummaryPanel
        artifacts={allArtifacts}
        artifact={artifact}
        appliedArtifactId={appliedDiffArtifactId}
        conflictArtifactId={diffConflictArtifactId}
        conflictMessage={diffConflictMessage}
        onApplyDiff={onApplyDiff}
        onForceApplyDiff={onForceApplyDiff}
      />
    </>
  );
}
