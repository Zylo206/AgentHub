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
        long adapterOutputArtifactCount = artifacts.stream()
                .filter(this::isAdapterOutputArtifact)
                .count();
        String adapterOutputSummary = adapterOutputArtifactCount == 0
                ? "未生成真实 Adapter 输出产物。"
                : "真实 / 半真实 Adapter 输出产物数：" + adapterOutputArtifactCount + "。";
        String plannerSummary = plan.plannerReasoningSummary() == null || plan.plannerReasoningSummary().isBlank()
                ? ""
                : "Planner 说明：" + plan.plannerReasoningSummary() + " ";
        String plannerFallbackSummary = plan.fallbackReason() == null || plan.fallbackReason().isBlank()
                ? ""
                : "Planner fallback 原因：" + plan.fallbackReason() + " ";

        return "静态 Demo 任务已完成，规划模式：" + plan.planningMode()
                + "，TaskSpec：" + taskSpec.getTitle()
                + "，Step 数：" + steps.size()
                + "，Artifact 数：" + artifacts.size()
                + "。"
                + plannerSummary
                + plannerFallbackSummary
                + selectedAgentSource + " "
                + selectedAgentSummary + " "
                + fallbackSummary
                + adapterOutputSummary;
    }

    public String summarizeRevision(TaskSpec taskSpec, List<TaskStep> steps, List<Artifact> artifacts) {
        return "Artifact-centered revision 已完成，TaskSpec：" + taskSpec.getTitle()
                + "，Step 数：" + steps.size()
                + "，Artifact 数：" + artifacts.size()
                + "。";
    }

    private boolean isAdapterOutputArtifact(Artifact artifact) {
        return artifact.getSourceKind() != null && "REAL_ADAPTER".equals(artifact.getSourceKind().name());
    }
}
