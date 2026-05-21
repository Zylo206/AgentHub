package com.agenthub.application.orchestrator;

import com.agenthub.application.agent.AgentApplicationService;
import com.agenthub.application.agent.AgentExecutorService;
import com.agenthub.application.message.MessageApplicationService;
import com.agenthub.application.task.TaskApplicationService;
import com.agenthub.common.IdGenerator;
import com.agenthub.common.TimeProvider;
import com.agenthub.domain.agent.Agent;
import com.agenthub.domain.agent.AgentId;
import com.agenthub.domain.agent.BuiltInAgentIds;
import com.agenthub.domain.artifact.Artifact;
import com.agenthub.domain.artifact.ArtifactId;
import com.agenthub.domain.artifact.ArtifactRepository;
import com.agenthub.domain.artifact.ArtifactStatus;
import com.agenthub.domain.artifact.ArtifactType;
import com.agenthub.domain.context.ContextRepository;
import com.agenthub.domain.context.ContextSnapshot;
import com.agenthub.domain.context.ContextSnapshotId;
import com.agenthub.domain.context.HandoffSummary;
import com.agenthub.domain.conversation.ConversationId;
import com.agenthub.domain.message.Message;
import com.agenthub.domain.message.MessageId;
import com.agenthub.domain.message.MessageType;
import com.agenthub.domain.task.TaskPlan;
import com.agenthub.domain.task.TaskRepository;
import com.agenthub.domain.task.TaskRun;
import com.agenthub.domain.task.TaskRunId;
import com.agenthub.domain.task.TaskRunStatus;
import com.agenthub.domain.task.TaskSpec;
import com.agenthub.domain.task.TaskSpecId;
import com.agenthub.domain.task.TaskSpecStatus;
import com.agenthub.domain.task.TaskStep;
import com.agenthub.domain.task.TaskStepId;
import com.agenthub.domain.task.TaskStepStatus;
import com.agenthub.infrastructure.adapter.AgentAdapterType;
import com.agenthub.infrastructure.adapter.AgentRequest;
import com.agenthub.infrastructure.adapter.AgentResponse;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.stereotype.Service;

@Service
public class OrchestratorService {

    private final TaskRepository taskRepository;
    private final ArtifactRepository artifactRepository;
    private final ContextRepository contextRepository;
    private final MessageApplicationService messageApplicationService;
    private final AgentApplicationService agentApplicationService;
    private final AgentExecutorService agentExecutorService;
    private final AgentRoutingService agentRoutingService;
    private final IdGenerator idGenerator;
    private final TimeProvider timeProvider;

    public OrchestratorService(
            TaskRepository taskRepository,
            ArtifactRepository artifactRepository,
            ContextRepository contextRepository,
            MessageApplicationService messageApplicationService,
            AgentApplicationService agentApplicationService,
            AgentExecutorService agentExecutorService,
            AgentRoutingService agentRoutingService,
            IdGenerator idGenerator,
            TimeProvider timeProvider) {
        this.taskRepository = taskRepository;
        this.artifactRepository = artifactRepository;
        this.contextRepository = contextRepository;
        this.messageApplicationService = messageApplicationService;
        this.agentApplicationService = agentApplicationService;
        this.agentExecutorService = agentExecutorService;
        this.agentRoutingService = agentRoutingService;
        this.idGenerator = idGenerator;
        this.timeProvider = timeProvider;
    }

    public TaskRun createDemoTaskFromMessage(String conversationId, String messageId, String userInput) {
        return createDemoTaskFromMessage(conversationId, messageId, userInput, null);
    }

    public TaskRun createDemoTaskFromMessage(
            String conversationId,
            String messageId,
            String userInput,
            String selectedAgentId) {
        Instant now = timeProvider.now();
        ConversationId conversationRef = new ConversationId(conversationId);
        MessageId sourceMessageId = new MessageId(messageId);
        Message sourceMessage = messageApplicationService.getMessage(messageId);
        if (!sourceMessage.getConversationId().equals(conversationRef)) {
            throw new IllegalArgumentException("Source message does not belong to the provided conversation.");
        }

        SelectedAgentResolution selectedAgentResolution = resolveSelectedAgent(selectedAgentId, sourceMessage);
        Agent selectedAgent = selectedAgentResolution.agent();
        String selectedAgentSummary = buildSelectedAgentSummary(selectedAgentResolution);
        AgentAdapterType selectedAgentPreferredAdapter = selectedAgent == null
                ? agentRoutingService.resolvePreferredAdapterForStep(
                        BuiltInAgentIds.FRONTEND_BUILDER,
                        "Generate the React login page and the initial README draft.")
                : agentRoutingService.resolvePreferredAdapterForAgent(selectedAgent);

        TaskSpec taskSpec = new TaskSpec(
                new TaskSpecId(idGenerator.nextId("spec")),
                conversationRef,
                sourceMessageId,
                "React Login Page Demo",
                "Build a React login page with documentation and a final review report.",
                userInput,
                List.of(
                        "Build a login page with email login and verification code login",
                        "Provide a README for page usage and structure",
                        "Generate an API contract artifact for the login flow",
                        "Produce a final review report based on acceptance criteria"),
                List.of(
                        "Real LLM execution",
                        "Real deployment",
                        "Real database persistence",
                        "Real third-party agent adapter invocation"),
                List.of(
                        "Support email login and verification code login",
                        "Provide README with usage notes and extension points",
                        "Provide an API contract artifact for backend collaboration",
                        "Provide a review report with issues, suggestions, and risk level",
                        selectedAgent == null
                                ? "Allow the built-in specialist agent chain to complete the demo task"
                                : "Route the first specialist step through the selected agent configuration"),
                List.of("frontend-builder", "backend-worker", "reviewer"),
                List.of("CODE", "MARKDOWN", "API_CONTRACT", "REVIEW_REPORT"),
                TaskSpecStatus.APPROVED,
                now,
                now);
        taskRepository.saveTaskSpec(taskSpec);

        TaskRunId taskRunId = new TaskRunId(idGenerator.nextId("run"));

        Artifact codeArtifact = createArtifact(
                conversationRef,
                taskRunId,
                "LoginPage.tsx",
                ArtifactType.CODE,
                "tsx",
                staticLoginPageContent(),
                now);
        Artifact readmeArtifact = createArtifact(
                conversationRef,
                taskRunId,
                "README.md",
                ArtifactType.MARKDOWN,
                "md",
                staticReadmeContent(),
                now);
        Artifact apiContractArtifact = createArtifact(
                conversationRef,
                taskRunId,
                "login-api-contract.json",
                ArtifactType.API_CONTRACT,
                "json",
                staticApiContractContent(),
                now);
        Artifact reviewArtifact = createArtifact(
                conversationRef,
                taskRunId,
                "Review Report",
                ArtifactType.REVIEW_REPORT,
                "md",
                staticReviewReportContent(),
                now);

        artifactRepository.save(codeArtifact);
        artifactRepository.save(readmeArtifact);
        artifactRepository.save(apiContractArtifact);
        artifactRepository.save(reviewArtifact);

        TaskStep frontendStep = createAgentExecutedStep(
                conversationId,
                taskRunId,
                1,
                selectedAgent == null ? BuiltInAgentIds.FRONTEND_BUILDER : selectedAgent.getId().value(),
                selectedAgent == null ? "Frontend Builder" : selectedAgent.getName(),
                userInput,
                selectedAgent == null
                        ? "You are responsible for frontend implementation in the AgentHub demo."
                        : selectedAgent.getSystemPrompt(),
                selectedAgent == null
                        ? "Generate the React login page and the initial README draft."
                        : "Selected Agent executes frontend artifact generation.",
                selectedAgent == null
                        ? "Task Spec requires a dual-mode login page with artifact-first iteration."
                        : "Task Spec requires a dual-mode login page with artifact-first iteration. "
                                + buildSelectedAgentInputContext(selectedAgent, selectedAgentResolution),
                "Generated LoginPage.tsx and README.md for the workspace.",
                List.of(
                        "TaskSpec: React Login Page Demo",
                        "Need email login and verification code login",
                        "Artifact-centered iteration is enabled",
                        selectedAgentResolution.sourceDescription(),
                        selectedAgentSummary),
                List.of("LoginPage.tsx", "README.md"),
                List.of(codeArtifact.getId(), readmeArtifact.getId()),
                selectedAgentPreferredAdapter,
                now);

        TaskStep backendStep = createAgentExecutedStep(
                conversationId,
                taskRunId,
                2,
                BuiltInAgentIds.BACKEND_WORKER,
                "Backend Worker",
                userInput,
                "You are responsible for API contract and backend structure in the AgentHub demo.",
                "Generate the login API contract based on the page fields and task scope.",
                "Use the login page inputs as contract inputs and keep the API compatible with future iteration.",
                "Generated login-api-contract.json for downstream review.",
                List.of(
                        "TaskSpec: React Login Page Demo",
                        "Frontend artifacts are available for field reference",
                        "Keep the API contract ready for later integration"),
                List.of("LoginPage.tsx", "README.md"),
                List.of(apiContractArtifact.getId()),
                agentRoutingService.resolvePreferredAdapterForStep(
                        BuiltInAgentIds.BACKEND_WORKER,
                        "Generate the login API contract based on the page fields and task scope."),
                now);

        TaskStep reviewStep = createAgentExecutedStep(
                conversationId,
                taskRunId,
                3,
                BuiltInAgentIds.REVIEWER,
                "Reviewer",
                userInput,
                "You are responsible for review and acceptance checks in the AgentHub demo.",
                "Review the generated page, README, API contract, and acceptance criteria.",
                "Review Task Spec, code artifact, README artifact, and API contract artifact together.",
                "Generated a structured review report with pass/fail basis and risk level.",
                List.of(
                        "TaskSpec acceptance criteria are the review baseline",
                        "Review code, README, and API contract together",
                        "Document issues, suggestions, and risk level"),
                List.of("LoginPage.tsx", "README.md", "login-api-contract.json"),
                List.of(reviewArtifact.getId()),
                agentRoutingService.resolvePreferredAdapterForStep(
                        BuiltInAgentIds.REVIEWER,
                        "Review the generated page, README, API contract, and acceptance criteria."),
                now);

        TaskPlan taskPlan = new TaskPlan(
                "Generate login page, docs, API contract, and review artifacts.",
                List.of(frontendStep, backendStep, reviewStep));

        TaskRun taskRun = new TaskRun(
                taskRunId,
                conversationRef,
                taskSpec.getId(),
                TaskRunStatus.COMPLETED,
                taskPlan,
                List.of(frontendStep, backendStep, reviewStep),
                "Static demo task completed with code, docs, API contract, review report, and context handoff records. "
                        + selectedAgentResolution.sourceDescription() + " "
                        + selectedAgentSummary,
                now,
                now);
        taskRepository.saveTaskRun(taskRun);

        ContextSnapshot contextSnapshot = new ContextSnapshot(
                new ContextSnapshotId(idGenerator.nextId("ctx")),
                conversationRef,
                taskRunId,
                List.of(sourceMessageId),
                List.of(
                        codeArtifact.getId(),
                        readmeArtifact.getId(),
                        apiContractArtifact.getId(),
                        reviewArtifact.getId()),
                List.of(
                        "Demo goal: build a React login page with README and review report",
                        "Artifact-centered iteration is enabled",
                        "Reviewer must check acceptance criteria before closing the loop",
                        selectedAgentResolution.sourceDescription(),
                        selectedAgentSummary),
                "This snapshot contains the original user request, the generated Task Spec, three task steps, and the LoginPage.tsx, README.md, login-api-contract.json, and Review Report artifacts. "
                        + selectedAgentResolution.sourceDescription() + " "
                        + selectedAgentSummary,
                now);
        contextRepository.saveContextSnapshot(contextSnapshot);

        HandoffSummary frontendToBackend = new HandoffSummary(
                idGenerator.nextId("handoff"),
                taskRunId,
                frontendStep.getId(),
                backendStep.getId(),
                selectedAgent == null ? BuiltInAgentIds.FRONTEND_BUILDER : selectedAgent.getId().value(),
                BuiltInAgentIds.BACKEND_WORKER,
                List.of(codeArtifact.getId(), readmeArtifact.getId()),
                List.of(
                        selectedAgent == null
                                ? "Frontend Builder finalized the page fields for email and verification code login"
                                : "Selected Agent finalized the page fields for email and verification code login",
                        selectedAgentResolution.sourceDescription(),
                        "README draft already documents component structure and extension points",
                        selectedAgentSummary),
                List.of(
                        "The login API still needs an explicit request/response contract",
                        "Error handling and validation states are not yet implemented"),
                (selectedAgent == null
                                ? "Frontend Builder hands off the page structure and README so Backend Worker can derive a stable API contract and data model assumptions. "
                                : "Selected Agent hands off the page structure and README so Backend Worker can derive a stable API contract and data model assumptions. ")
                        + selectedAgentSummary,
                now);

        HandoffSummary backendToReviewer = new HandoffSummary(
                idGenerator.nextId("handoff"),
                taskRunId,
                backendStep.getId(),
                reviewStep.getId(),
                BuiltInAgentIds.BACKEND_WORKER,
                BuiltInAgentIds.REVIEWER,
                List.of(codeArtifact.getId(), readmeArtifact.getId(), apiContractArtifact.getId()),
                List.of(
                        "Backend Worker defined the login request payload and success/error response schema",
                        "Reviewer should evaluate code artifact, README, and API contract against Task Spec acceptance criteria"),
                List.of(
                        "Frontend code still lacks form validation and API integration",
                        "README does not yet describe real deployment or persistence behavior"),
                "Backend Worker hands off the API contract and artifact chain so Reviewer can validate the end-to-end acceptance criteria and identify remaining risks.",
                now);

        contextRepository.saveHandoffSummary(frontendToBackend);
        contextRepository.saveHandoffSummary(backendToReviewer);

        messageApplicationService.appendSystemMessage(
                conversationId,
                MessageType.TASK_SPEC,
                "Task Spec created: React Login Page Demo",
                List.of());
        messageApplicationService.appendSystemMessage(
                conversationId,
                MessageType.TASK_STATUS,
                "TaskRun completed with 3 TaskStep items and 4 artifacts.",
                List.of());
        messageApplicationService.appendSystemMessage(
                conversationId,
                MessageType.ARTIFACT_CARD,
                "Artifact created: LoginPage.tsx",
                List.of(codeArtifact.getId()));
        messageApplicationService.appendSystemMessage(
                conversationId,
                MessageType.ARTIFACT_CARD,
                "Artifact created: README.md",
                List.of(readmeArtifact.getId()));
        messageApplicationService.appendSystemMessage(
                conversationId,
                MessageType.ARTIFACT_CARD,
                "Artifact created: login-api-contract.json",
                List.of(apiContractArtifact.getId()));
        messageApplicationService.appendSystemMessage(
                conversationId,
                MessageType.ARTIFACT_CARD,
                "Artifact created: Review Report",
                List.of(reviewArtifact.getId()));

        return taskRun;
    }

    public TaskApplicationService.ArtifactRevisionResult createDemoArtifactRevision(
            String conversationId,
            String artifactId,
            String revisionInstruction) {
        if (revisionInstruction == null || revisionInstruction.isBlank()) {
            throw new IllegalArgumentException("Revision instruction cannot be blank.");
        }

        ConversationId conversationRef = new ConversationId(conversationId);
        Artifact originalArtifact = artifactRepository.findById(new ArtifactId(artifactId))
                .orElseThrow(() -> new NoSuchElementException("Artifact not found: " + artifactId));

        if (!originalArtifact.getConversationId().equals(conversationRef)) {
            throw new IllegalArgumentException("Artifact does not belong to the provided conversation.");
        }

        if (originalArtifact.getType() != ArtifactType.CODE) {
            throw new IllegalArgumentException("Static demo revision currently supports CODE artifacts only.");
        }

        Instant now = timeProvider.now();
        Message revisionMessage = messageApplicationService.sendUserMessage(conversationId, revisionInstruction);

        TaskSpec taskSpec = new TaskSpec(
                new TaskSpecId(idGenerator.nextId("spec")),
                conversationRef,
                revisionMessage.getId(),
                "Revise " + originalArtifact.getTitle(),
                "Revise the selected artifact based on a follow-up instruction while preserving artifact-centered iteration.",
                revisionInstruction,
                List.of(
                        "Update the selected artifact based on the revision instruction",
                        "Generate a new artifact version without overwriting the previous version",
                        "Generate a fresh review report for the revised artifact"),
                List.of(
                        "Real code execution",
                        "Real LLM reasoning",
                        "Automated visual diff generation"),
                List.of(
                        "The revised artifact reflects the requested button color update",
                        "The revised artifact includes a visible loading state",
                        "A new review report explains whether the revision satisfies the request"),
                List.of("frontend-builder", "reviewer"),
                List.of("CODE", "REVIEW_REPORT"),
                TaskSpecStatus.APPROVED,
                now,
                now);
        taskRepository.saveTaskSpec(taskSpec);

        TaskRunId taskRunId = new TaskRunId(idGenerator.nextId("run"));

        Artifact revisedArtifact = new Artifact(
                new ArtifactId(idGenerator.nextId("artifact")),
                conversationRef,
                taskRunId,
                originalArtifact.getId().value(),
                revisionInstruction,
                originalArtifact.getTitle(),
                ArtifactType.CODE,
                ArtifactStatus.UPDATED,
                "tsx",
                staticRevisedLoginPageContent(),
                originalArtifact.getVersion() + 1,
                now,
                now);
        artifactRepository.save(revisedArtifact);

        Artifact reviewArtifact = new Artifact(
                new ArtifactId(idGenerator.nextId("artifact")),
                conversationRef,
                taskRunId,
                revisedArtifact.getId().value(),
                revisionInstruction,
                "Review Report - " + originalArtifact.getTitle() + " v" + revisedArtifact.getVersion(),
                ArtifactType.REVIEW_REPORT,
                ArtifactStatus.ACCEPTED,
                "md",
                staticRevisionReviewReportContent(originalArtifact, revisedArtifact, revisionInstruction),
                1,
                now,
                now);
        artifactRepository.save(reviewArtifact);

        TaskStep frontendRevisionStep = createAgentExecutedStep(
                conversationId,
                taskRunId,
                1,
                BuiltInAgentIds.FRONTEND_BUILDER,
                "Frontend Builder",
                revisionInstruction,
                "You are responsible for frontend revision in the AgentHub demo.",
                "Revise the selected artifact according to the follow-up instruction.",
                "Use the original artifact as the base context and apply the requested UI change.",
                "Generated a revised LoginPage.tsx with a blue button and a clearer loading state.",
                List.of(
                        "Original artifact: " + originalArtifact.getTitle() + " v" + originalArtifact.getVersion(),
                        "Revision instruction: " + revisionInstruction,
                        "Preserve artifact-centered iteration"),
                List.of(originalArtifact.getTitle()),
                List.of(revisedArtifact.getId()),
                agentRoutingService.resolvePreferredAdapterForStep(
                        BuiltInAgentIds.FRONTEND_BUILDER,
                        "Revise the selected artifact according to the follow-up instruction."),
                now);

        TaskStep reviewerStep = createAgentExecutedStep(
                conversationId,
                taskRunId,
                2,
                BuiltInAgentIds.REVIEWER,
                "Reviewer",
                revisionInstruction,
                "You are responsible for revision review in the AgentHub demo.",
                "Review whether the revised artifact satisfies the revision instruction and acceptance criteria.",
                "Check the revised artifact, the original artifact, and the revision instruction together.",
                "Generated a revision review report with pass/fail basis, issues, and suggestions.",
                List.of(
                        "Original artifact: " + originalArtifact.getTitle() + " v" + originalArtifact.getVersion(),
                        "Revised artifact: " + revisedArtifact.getTitle() + " v" + revisedArtifact.getVersion(),
                        "Check the instruction against the revised artifact"),
                List.of(originalArtifact.getTitle(), revisedArtifact.getTitle()),
                List.of(reviewArtifact.getId()),
                agentRoutingService.resolvePreferredAdapterForStep(
                        BuiltInAgentIds.REVIEWER,
                        "Review whether the revised artifact satisfies the revision instruction and acceptance criteria."),
                now);

        TaskPlan revisionPlan = new TaskPlan(
                "Revise the selected artifact and review the new version.",
                List.of(frontendRevisionStep, reviewerStep));

        TaskRun taskRun = new TaskRun(
                taskRunId,
                conversationRef,
                taskSpec.getId(),
                TaskRunStatus.COMPLETED,
                revisionPlan,
                List.of(frontendRevisionStep, reviewerStep),
                "Artifact-centered revision completed with a new code version and a follow-up review report.",
                now,
                now);
        taskRepository.saveTaskRun(taskRun);

        ContextSnapshot contextSnapshot = new ContextSnapshot(
                new ContextSnapshotId(idGenerator.nextId("ctx")),
                conversationRef,
                taskRunId,
                List.of(revisionMessage.getId()),
                List.of(originalArtifact.getId(), revisedArtifact.getId(), reviewArtifact.getId()),
                List.of(
                        "Artifact-centered iteration is enabled for the selected artifact",
                        "Revision instruction: " + revisionInstruction,
                        "Original artifact version: v" + originalArtifact.getVersion(),
                        "Revised artifact version: v" + revisedArtifact.getVersion()),
                "This revision snapshot links the original artifact, the revision instruction, the revised artifact, and the new review report to demonstrate a second-pass artifact-centered iteration.",
                now);
        contextRepository.saveContextSnapshot(contextSnapshot);

        HandoffSummary handoffSummary = new HandoffSummary(
                idGenerator.nextId("handoff"),
                taskRunId,
                frontendRevisionStep.getId(),
                reviewerStep.getId(),
                BuiltInAgentIds.FRONTEND_BUILDER,
                BuiltInAgentIds.REVIEWER,
                List.of(revisedArtifact.getId()),
                List.of(
                        "button style changed to blue",
                        "loading state added"),
                List.of(
                        "The revised page is still a static UI mock and not connected to a backend API",
                        "Form validation and success/error feedback can be refined in the next iteration"),
                "Frontend Builder hands the revised LoginPage.tsx to Reviewer so the second-pass artifact can be checked against the follow-up instruction.",
                now);
        contextRepository.saveHandoffSummary(handoffSummary);

        messageApplicationService.appendSystemMessage(
                conversationId,
                MessageType.TASK_SPEC,
                "Revision Task Spec created: Revise " + originalArtifact.getTitle(),
                List.of());
        messageApplicationService.appendAgentMessage(
                conversationId,
                BuiltInAgentIds.FRONTEND_BUILDER,
                "Frontend Builder updated " + originalArtifact.getTitle()
                        + " to v" + revisedArtifact.getVersion()
                        + " based on the revision instruction.");
        messageApplicationService.appendAgentMessage(
                conversationId,
                BuiltInAgentIds.REVIEWER,
                "Reviewer completed the revision check and generated a new review report for the updated artifact.");
        messageApplicationService.appendSystemMessage(
                conversationId,
                MessageType.TASK_STATUS,
                "Revision TaskRun completed with 2 TaskStep items and 2 revision artifacts.",
                List.of());
        messageApplicationService.appendSystemMessage(
                conversationId,
                MessageType.ARTIFACT_CARD,
                "Artifact revised: " + revisedArtifact.getTitle() + " v" + revisedArtifact.getVersion(),
                List.of(revisedArtifact.getId()));
        messageApplicationService.appendSystemMessage(
                conversationId,
                MessageType.ARTIFACT_CARD,
                "Artifact created: " + reviewArtifact.getTitle(),
                List.of(reviewArtifact.getId()));

        return new TaskApplicationService.ArtifactRevisionResult(taskRun, revisedArtifact, reviewArtifact);
    }

    private TaskStep createAgentExecutedStep(
            String conversationId,
            TaskRunId taskRunId,
            int stepOrder,
            String agentId,
            String agentName,
            String userInput,
            String systemPrompt,
            String taskDescription,
            String inputContext,
            String baseOutputContent,
            List<String> contextItems,
            List<String> artifactSummaries,
            List<ArtifactId> producedArtifactIds,
            AgentAdapterType preferredAdapterType,
            Instant now) {
        TaskStepId stepId = new TaskStepId(idGenerator.nextId("step"));
        AgentResponse adapterResponse = agentExecutorService.execute(
                preferredAdapterType,
                new AgentRequest(
                        idGenerator.nextId("adapter_req"),
                        conversationId,
                        taskRunId.value(),
                        stepId.value(),
                        agentId,
                        agentName,
                        userInput,
                        systemPrompt,
                        taskDescription,
                        contextItems,
                        artifactSummaries,
                        Map.of(
                                "stepOrder", stepOrder,
                                "demoMode", true)));

        String adapterSummary = summarizeAdapterResponse(adapterResponse.content());
        String outputContent = baseOutputContent
                + "\n\nAdapter execution:\n"
                + (adapterSummary == null ? "No adapter response recorded." : adapterSummary);

        return new TaskStep(
                stepId,
                taskRunId,
                stepOrder,
                new AgentId(agentId),
                taskDescription,
                TaskStepStatus.COMPLETED,
                inputContext,
                outputContent,
                preferredAdapterType.name(),
                adapterResponse.actualAdapterType() == null ? null : adapterResponse.actualAdapterType().name(),
                adapterResponse.status().name(),
                adapterSummary,
                adapterResponse.errorMessage(),
                producedArtifactIds,
                now,
                now);
    }

    private SelectedAgentResolution resolveSelectedAgent(String explicitSelectedAgentId, Message sourceMessage) {
        String normalizedExplicitSelectedAgentId = normalizeAgentId(explicitSelectedAgentId);
        if (normalizedExplicitSelectedAgentId != null) {
            return new SelectedAgentResolution(
                    agentApplicationService.getAgent(normalizedExplicitSelectedAgentId),
                    "Selected agent was provided by demo-task request.");
        }

        String inferredSelectedAgentId = normalizeAgentId(sourceMessage.getTargetAgentId());
        if (inferredSelectedAgentId != null) {
            return new SelectedAgentResolution(
                    agentApplicationService.getAgent(inferredSelectedAgentId),
                    "Selected agent was inferred from source message targetAgentId.");
        }

        return new SelectedAgentResolution(null, "Selected agent: built-in specialist chain.");
    }

    private String buildSelectedAgentSummary(SelectedAgentResolution selectedAgentResolution) {
        Agent selectedAgent = selectedAgentResolution.agent();
        if (selectedAgent == null) {
            return selectedAgentResolution.sourceDescription();
        }

        String preferredAdapterType = selectedAgent.getPreferredAdapterType() == null
                || selectedAgent.getPreferredAdapterType().isBlank()
                ? AgentAdapterType.MOCK.name()
                : selectedAgent.getPreferredAdapterType();
        return "%s Selected agent: %s (%s, preferred adapter %s).".formatted(
                selectedAgentResolution.sourceDescription(),
                selectedAgent.getName(),
                selectedAgent.getId().value(),
                preferredAdapterType);
    }

    private String buildSelectedAgentInputContext(
            Agent selectedAgent,
            SelectedAgentResolution selectedAgentResolution) {
        if (selectedAgent == null) {
            return selectedAgentResolution.sourceDescription();
        }

        String preferredAdapterType = selectedAgent.getPreferredAdapterType() == null
                || selectedAgent.getPreferredAdapterType().isBlank()
                ? AgentAdapterType.MOCK.name()
                : selectedAgent.getPreferredAdapterType();
        return "%s Selected agent context: name=%s, preferredAdapterType=%s, capabilityTags=%s, systemPrompt=%s".formatted(
                selectedAgentResolution.sourceDescription(),
                selectedAgent.getName(),
                preferredAdapterType,
                selectedAgent.getCapabilityTags(),
                selectedAgent.getSystemPrompt() == null || selectedAgent.getSystemPrompt().isBlank()
                        ? "N/A"
                        : selectedAgent.getSystemPrompt());
    }

    private String normalizeAgentId(String agentId) {
        if (agentId == null) {
            return null;
        }

        String normalized = agentId.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private record SelectedAgentResolution(Agent agent, String sourceDescription) {
    }

    private Artifact createArtifact(
            ConversationId conversationId,
            TaskRunId taskRunId,
            String title,
            ArtifactType artifactType,
            String language,
            String content,
            Instant now) {
        return new Artifact(
                new ArtifactId(idGenerator.nextId("artifact")),
                conversationId,
                taskRunId,
                title,
                artifactType,
                artifactType == ArtifactType.REVIEW_REPORT ? ArtifactStatus.ACCEPTED : ArtifactStatus.CREATED,
                language,
                content,
                1,
                now,
                now);
    }

    private String summarizeAdapterResponse(String responseContent) {
        if (responseContent == null || responseContent.isBlank()) {
            return null;
        }

        String normalized = responseContent.replace("\r", " ").replace("\n", " ").trim();
        if (normalized.length() <= 220) {
            return normalized;
        }

        return normalized.substring(0, 217) + "...";
    }

    private String staticLoginPageContent() {
        return """
                import { useState } from "react";

                export default function LoginPage() {
                  const [email, setEmail] = useState("");
                  const [code, setCode] = useState("");
                  const [loading, setLoading] = useState(false);

                  return (
                    <div className="login-page">
                      <div className="login-card">
                        <h1>Login</h1>
                        <input
                          className="input"
                          placeholder="Email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                        />
                        <input
                          className="input"
                          placeholder="Verification Code"
                          value={code}
                          onChange={(event) => setCode(event.target.value)}
                        />
                        <button
                          className="login-button"
                          disabled={loading}
                          onClick={() => setLoading(true)}
                        >
                          {loading ? "Loading..." : "Login"}
                        </button>
                      </div>
                    </div>
                  );
                }
                """;
    }

    private String staticReadmeContent() {
        return """
                # Login Page Demo

                ## Page Features

                - Supports email input
                - Supports verification code input
                - Includes a loading state on the login button

                ## Usage

                1. Render `LoginPage.tsx`
                2. Enter email and verification code
                3. Click the login button to observe loading feedback

                ## Component Structure

                - `LoginPage`
                - `login-card`
                - `input`
                - `login-button`

                ## Extension Points

                - Add email format validation
                - Add a send-code button and countdown state
                - Connect the page to the generated login API contract
                """;
    }

    private String staticApiContractContent() {
        return """
                {
                  "endpoint": "/api/auth/login",
                  "method": "POST",
                  "request": {
                    "email": "string",
                    "verificationCode": "string"
                  },
                  "successResponse": {
                    "token": "string",
                    "userId": "string",
                    "displayName": "string"
                  },
                  "errorResponse": {
                    "code": "INVALID_CODE",
                    "message": "Verification code is invalid or expired"
                  }
                }
                """;
    }

    private String staticRevisedLoginPageContent() {
        return """
                import { useState } from "react";

                export default function LoginPage() {
                  const [email, setEmail] = useState("");
                  const [code, setCode] = useState("");
                  const [loading, setLoading] = useState(false);

                  async function handleLogin() {
                    setLoading(true);
                    await new Promise((resolve) => setTimeout(resolve, 800));
                    setLoading(false);
                  }

                  return (
                    <div className="login-page">
                      <div className="login-card">
                        <h1>Login</h1>
                        <p className="login-caption">Artifact-centered iteration demo</p>
                        <input
                          className="input"
                          placeholder="Email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                        />
                        <input
                          className="input"
                          placeholder="Verification Code"
                          value={code}
                          onChange={(event) => setCode(event.target.value)}
                        />
                        <button
                          className={`login-button login-button--blue ${loading ? "is-loading" : ""}`}
                          disabled={loading}
                          onClick={handleLogin}
                        >
                          {loading ? "Loading..." : "Login"}
                        </button>
                      </div>
                    </div>
                  );
                }
                """;
    }

    private String staticReviewReportContent() {
        return """
                Passed: true

                Issues:
                - The page currently demonstrates UI flow only and does not call a real backend API
                - Validation and error handling are still missing from the login form

                Suggestions:
                - Add form validation for email format and empty verification code
                - Connect the submit action to the generated API contract
                - Add an error message state and success redirect behavior

                Risk Level:
                MEDIUM
                """;
    }

    private String staticRevisionReviewReportContent(
            Artifact originalArtifact,
            Artifact revisedArtifact,
            String revisionInstruction) {
        return """
                Passed: true

                Revision Instruction:
                %s

                Compared Versions:
                - Original: %s v%s
                - Revised: %s v%s

                Issues:
                - The revised artifact is still a static demo and does not execute a real login request
                - Visual polish, validation, and error messaging can be improved in a future iteration

                Suggestions:
                - Add disabled input styling while loading
                - Add success and failure feedback after the loading state ends
                - Preserve revision metadata so future iterations can show a full history chain

                Risk Level:
                LOW
                """.formatted(
                revisionInstruction,
                originalArtifact.getTitle(),
                originalArtifact.getVersion(),
                revisedArtifact.getTitle(),
                revisedArtifact.getVersion());
    }
}
