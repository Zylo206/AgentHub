import type { Artifact } from "./artifactTypes";

interface ArtifactOperationBarProps {
  artifact: Artifact;
  operationMessage: string | null;
  onCopy: (artifact: Artifact) => void | Promise<void>;
  onDownload: (artifact: Artifact) => void;
}

export function ArtifactOperationBar({
  artifact,
  operationMessage,
  onCopy,
  onDownload
}: ArtifactOperationBarProps) {
  return (
    <div className="artifact-preview__actions artifact-operation-bar" data-testid="artifact-operation-bar">
      <button
        type="button"
        className="secondary-button artifact-preview__action-button"
        disabled={!artifact.content}
        onClick={() => {
          void onCopy(artifact);
        }}
      >
        复制内容
      </button>
      <button
        type="button"
        className="secondary-button artifact-preview__action-button"
        disabled={!artifact.content}
        onClick={() => onDownload(artifact)}
      >
        下载文件
      </button>
      {operationMessage ? (
        <span className="artifact-preview__operation-message">{operationMessage}</span>
      ) : null}
    </div>
  );
}
