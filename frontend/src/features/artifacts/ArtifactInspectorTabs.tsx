export type ArtifactInspectorTab = "overview" | "diff" | "versions" | "snapshots" | "deploy" | "audit" | "related";

export const DEFAULT_ARTIFACT_INSPECTOR_TABS: Array<{ key: ArtifactInspectorTab; label: string }> = [
  { key: "overview", label: "概览" },
  { key: "diff", label: "Diff" },
  { key: "versions", label: "版本" },
  { key: "snapshots", label: "快照" },
  { key: "deploy", label: "部署" },
  { key: "audit", label: "审计" },
  { key: "related", label: "关联" }
];

interface ArtifactInspectorTabsProps {
  tabs?: Array<{ key: ArtifactInspectorTab; label: string }>;
  activeTab: ArtifactInspectorTab;
  versionCount: number;
  snapshotCount: number;
  deploymentCount: number;
  relatedCount: number;
  onChange: (tab: ArtifactInspectorTab) => void;
}

export function ArtifactInspectorTabs({
  tabs = DEFAULT_ARTIFACT_INSPECTOR_TABS,
  activeTab,
  versionCount,
  snapshotCount,
  deploymentCount,
  relatedCount,
  onChange
}: ArtifactInspectorTabsProps) {
  function getCount(tab: ArtifactInspectorTab): number | null {
    if (tab === "versions") {
      return versionCount;
    }
    if (tab === "snapshots") {
      return snapshotCount;
    }
    if (tab === "deploy") {
      return deploymentCount;
    }
    if (tab === "related") {
      return relatedCount;
    }
    return null;
  }

  return (
    <div className="artifact-inspector-tabs artifact-inspector-tabs--interactive" aria-label="Artifact inspector sections">
      {tabs.map((tab) => {
        const count = getCount(tab.key);
        return (
          <button
            key={tab.key}
            type="button"
            className={`artifact-inspector-tabs__item ${activeTab === tab.key ? "artifact-inspector-tabs__item--active" : ""}`}
            data-testid={`artifact-inspector-tab-${tab.key}`}
            aria-pressed={activeTab === tab.key}
            onClick={() => onChange(tab.key)}
          >
            {tab.label}
            {count === null ? "" : ` ${count}`}
          </button>
        );
      })}
    </div>
  );
}
