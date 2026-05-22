package com.agenthub.application.orchestrator;

import com.agenthub.domain.artifact.Artifact;
import com.agenthub.domain.task.TaskSpec;
import com.agenthub.domain.task.TaskStep;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ResultAggregator {

    public String summarizeDemoTask(
            TaskSpec taskSpec,
            OrchestratorPlan plan,
            List<TaskStep> steps,
            List<Artifact> artifacts,
            String selectedAgentSource,
            String selectedAgentSummary) {
        long fallbackCount = steps.stream()
                .filter(step -> "FALLBACK_USED".equals(step.getAdapterStatus()))
                .count();

        String fallbackSummary = fallbackCount == 0
                ? "Adapter 未发生 fallback。"
                : "Adapter fallback 次数：" + fallbackCount + "。";

        return "静态 Demo 任务已完成，规划模式：" + plan.planningMode()
                + "，TaskSpec：" + taskSpec.getTitle()
                + "，Step 数：" + steps.size()
                + "，Artifact 数：" + artifacts.size()
                + "。"
                + selectedAgentSource + " "
                + selectedAgentSummary + " "
                + fallbackSummary;
    }

    public String summarizeRevision(TaskSpec taskSpec, List<TaskStep> steps, List<Artifact> artifacts) {
        return "Artifact-centered revision 已完成，TaskSpec：" + taskSpec.getTitle()
                + "，Step 数：" + steps.size()
                + "，Artifact 数：" + artifacts.size()
                + "。";
    }
}
