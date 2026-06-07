import type { ReactNode } from "react";
import type { ArtifactInspectorTab } from "./useArtifactOperationController";

interface ArtifactInspectorTabsBodyProps {
  activeTab: ArtifactInspectorTab;
  overview: ReactNode;
  diff: ReactNode;
  versions: ReactNode;
  snapshots: ReactNode;
  deploy: ReactNode;
  audit: ReactNode;
  related: ReactNode;
}

export function ArtifactInspectorTabsBody({
  activeTab,
  overview,
  diff,
  versions,
  snapshots,
  deploy,
  audit,
  related
}: ArtifactInspectorTabsBodyProps) {
  const bodyByTab: Record<ArtifactInspectorTab, ReactNode> = {
    overview,
    diff,
    versions,
    snapshots,
    deploy,
    audit,
    related
  };

  return (
    <div className={`artifact-inspector-tabs-body artifact-inspector-tabs-body--${activeTab}`} data-testid="artifact-inspector-tabs-body">
      {bodyByTab[activeTab]}
    </div>
  );
}
