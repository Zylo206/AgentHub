import type { SyntheticEvent } from "react";
import { ArtifactCollaborationPanel } from "./ArtifactCollaborationPanel";
import { DiffSummaryPanel } from "./DiffSummaryPanel";
import type { Artifact } from "./artifactTypes";
import type { ArtifactCompareDiffResponse } from "../../api/agenthubApi";

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
  diffCompareResult: ArtifactCompareDiffResponse | null;
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
  onCreateConflictResolutionRevision: (mergedContent: string) => void;
  onApplyDiff: (artifact: Artifact) => void;
  onForceApplyDiff: (artifact: Artifact) => void;
  onSelectArtifact: (artifactId: string) => void;
  onCreateApprovalRequest: (request: {
    actionType: string;
    targetType: string;
    targetId: string;
    riskLevel: string;
    summary: string;
    affectedItems: string[];
  }) => Promise<string | null>;
  onApproveApprovalRequest: (approvalId: string) => Promise<void>;
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
  diffCompareResult,
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
  onCreateConflictResolutionRevision,
  onApplyDiff,
  onForceApplyDiff,
  onSelectArtifact,
  onCreateApprovalRequest,
  onApproveApprovalRequest
}: ArtifactRevisionWorkspaceProps) {
  return (
    <>
      <DiffSummaryPanel
        artifacts={allArtifacts}
        artifact={artifact}
        appliedArtifactId={appliedDiffArtifactId}
        compareResult={diffCompareResult}
        conflictArtifactId={diffConflictArtifactId}
        conflictMessage={diffConflictMessage}
        onCreateConflictResolutionRevision={onCreateConflictResolutionRevision}
        onApplyDiff={onApplyDiff}
        onForceApplyDiff={onForceApplyDiff}
      />

      <ArtifactCollaborationPanel
        artifact={artifact}
        onSelectArtifact={onSelectArtifact}
        onCreateApprovalRequest={onCreateApprovalRequest}
        onApproveApprovalRequest={onApproveApprovalRequest}
      />

      <section className="artifact-content-editor" data-testid="artifact-content-editor-panel">
        <div className="artifact-content-editor__header">
          <div>
            <strong>轻量编辑 / 局部修改</strong>
            <p>编辑不会直接覆盖当前 Artifact。系统会先生成 Draft Revision，再通过 Diff 与审批链路应用。</p>
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
                  : "可直接选择文本片段"}
              </span>
              <span className="artifact-content-editor__chip">
                {draftDiffPreview?.hasChanges
                  ? `Draft diff: +${draftDiffPreview.added} / -${draftDiffPreview.removed} / 变更 ${draftDiffPreview.changed}`
                  : "尚未修改内容"}
              </span>
              {draftDiffPreview?.firstChangedLine ? (
                <span className="artifact-content-editor__chip">首个变化行：{draftDiffPreview.firstChangedLine}</span>
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
                placeholder="例如：只调整选中片段的表单校验文案，并保持现有 API 不变。"
                onChange={(event) => onDraftNoteChange(event.target.value)}
              />
            </div>
            <div className="artifact-content-editor__diff-preview" data-testid="artifact-draft-diff-preview">
              <div>
                <span>Draft Diff Preview</span>
                <strong>{draftDiffPreview?.hasChanges ? "已检测到本地草稿变更" : "等待编辑或选区说明"}</strong>
              </div>
              <p>生成 Draft Revision 后，请在下方 Diff 摘要审查真实行级差异；Apply / Force Apply 仍必须经过后端审批。</p>
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
              带选区发送到聊天修改
            </button>
          </>
        ) : (
          <div className="artifact-content-editor__idle">
            <span>支持完整内容编辑，也支持选中文本片段后发起局部 Revision。</span>
            <span>当前 Artifact：{formatArtifactSize(artifact.content)}</span>
          </div>
        )}
      </section>

      <div className="artifact-revision-box">
        <div className="artifact-revision-box__header">
          <strong>对话式二次修改</strong>
          <span>生成本地 Draft Revision，不代表真实云部署或外部发布。</span>
        </div>
        <textarea
          className="artifact-revision-box__input"
          value={revisionInstruction}
          disabled={revisingArtifact}
          onChange={(event) => onRevisionInstructionChange(event.target.value)}
          placeholder="描述你希望 Agent 如何修改当前产物。"
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

    </>
  );
}
