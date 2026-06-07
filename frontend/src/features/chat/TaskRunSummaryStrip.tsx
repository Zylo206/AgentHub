import type { Artifact } from "../artifacts/artifactTypes";
import type { TaskRun } from "./chatTypes";
import { countFallbackSteps, getParallelExecutionGroups } from "./taskRunPanelHelpers";

interface TaskRunSummaryStripProps {
  taskRun: TaskRun;
  producedArtifacts: Artifact[];
}

export function TaskRunSummaryStrip({ taskRun, producedArtifacts }: TaskRunSummaryStripProps) {
  const fallbackStepCount = countFallbackSteps(taskRun);
  const parallelGroupCount = getParallelExecutionGroups(taskRun).length;

  return (
    <div className="task-run-summary-strip" data-testid="task-run-summary-strip">
      <span>{taskRun.steps.length} 个步骤</span>
      <span>{producedArtifacts.length} 个产物</span>
      <span>{fallbackStepCount} 个 fallback</span>
      <span>{parallelGroupCount > 0 ? `${parallelGroupCount} 个并发组` : "顺序执行"}</span>
    </div>
  );
}
