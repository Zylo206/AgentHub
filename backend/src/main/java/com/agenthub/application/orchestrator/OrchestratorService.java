package com.agenthub.application.orchestrator;

import com.agenthub.application.agent.AgentApplicationService;
import com.agenthub.application.agent.AgentExecutorService;
import com.agenthub.application.conversation.ConversationApplicationService;
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
import com.agenthub.domain.context.PinnedContext;
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
import java.util.ArrayList;
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
    private final ConversationApplicationService conversationApplicationService;
    private final AgentApplicationService agentApplicationService;
    private final AgentExecutorService agentExecutorService;
    private final AgentRoutingService agentRoutingService;
    private final TaskPlanner taskPlanner;
    private final AgentRouter agentRouter;
    private final AgentStepExecutor agentStepExecutor;
    private final ResultAggregator resultAggregator;
    private final IdGenerator idGenerator;
    private final TimeProvider timeProvider;

    public OrchestratorService(
            TaskRepository taskRepository,
            ArtifactRepository artifactRepository,
            ContextRepository contextRepository,
            MessageApplicationService messageApplicationService,
            ConversationApplicationService conversationApplicationService,
            AgentApplicationService agentApplicationService,
            AgentExecutorService agentExecutorService,
            AgentRoutingService agentRoutingService,
            TaskPlanner taskPlanner,
            AgentRouter agentRouter,
            AgentStepExecutor agentStepExecutor,
            ResultAggregator resultAggregator,
            IdGenerator idGenerator,
            TimeProvider timeProvider) {
        this.taskRepository = taskRepository;
        this.artifactRepository = artifactRepository;
        this.contextRepository = contextRepository;
        this.messageApplicationService = messageApplicationService;
        this.conversationApplicationService = conversationApplicationService;
        this.agentApplicationService = agentApplicationService;
        this.agentExecutorService = agentExecutorService;
        this.agentRoutingService = agentRoutingService;
        this.taskPlanner = taskPlanner;
        this.agentRouter = agentRouter;
        this.agentStepExecutor = agentStepExecutor;
        this.resultAggregator = resultAggregator;
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
        List<PinnedContext> pinnedContexts = contextRepository.findPinnedContextsByConversationId(conversationRef);
        List<String> pinnedContextItems = buildPinnedContextItems(pinnedContexts);
        String pinnedInputContext = buildPinnedInputContext(pinnedContextItems);

        SelectedAgentResolution selectedAgentResolution = resolveSelectedAgent(selectedAgentId, sourceMessage);
        Agent selectedAgent = selectedAgentResolution.agent();
        String selectedAgentSummary = buildSelectedAgentSummary(selectedAgentResolution);
        OrchestratorPlan orchestratorPlan = taskPlanner.planDemoTask(userInput, selectedAgent);
        OrchestratorStepPlan frontendStepPlan = findStepPlan(orchestratorPlan, 1);
        OrchestratorStepPlan backendStepPlan = findStepPlan(orchestratorPlan, 2);
        OrchestratorStepPlan reviewStepPlan = findStepPlan(orchestratorPlan, 3);
        AgentRouter.RoutedAgent frontendRoute = agentRouter.route(frontendStepPlan, selectedAgent);
        AgentRouter.RoutedAgent backendRoute = agentRouter.route(backendStepPlan, selectedAgent);
        AgentRouter.RoutedAgent reviewRoute = agentRouter.route(reviewStepPlan, selectedAgent);
        conversationApplicationService.addParticipantAgents(
                conversationId,
                List.of(
                        BuiltInAgentIds.ORCHESTRATOR,
                        frontendRoute.agentId(),
                        backendRoute.agentId(),
                        reviewRoute.agentId()));
        AgentAdapterType selectedAgentPreferredAdapter = selectedAgent == null
                ? agentRoutingService.resolvePreferredAdapterForStep(
                        BuiltInAgentIds.FRONTEND_BUILDER,
                        "生成 React 登录页面和初始 README 草案。")
                : agentRoutingService.resolvePreferredAdapterForAgent(selectedAgent);

        TaskSpec taskSpec = new TaskSpec(
                new TaskSpecId(idGenerator.nextId("spec")),
                conversationRef,
                sourceMessageId,
                "React 登录页 Demo",
                "生成一个 React 登录页面，并配套 README、API 契约和最终评审报告。",
                userInput,
                List.of(
                        "构建支持邮箱登录和验证码登录的登录页面",
                        "提供 README，说明页面用法和组件结构",
                        "为登录流程生成 API 契约产物",
                        "基于验收标准生成最终评审报告"),
                List.of(
                        "真实 LLM 执行",
                        "真实部署发布",
                        "真实数据库持久化",
                        "真实第三方 Agent 平台调用"),
                List.of(
                        "支持邮箱登录和验证码登录",
                        "README 包含使用说明和扩展点",
                        "提供用于后端协作的 API 契约产物",
                        "评审报告包含问题、建议和风险等级",
                        selectedAgent == null
                                ? "允许内置 Specialist Agent 链路完成 Demo 任务"
                                : "第一个 Specialist Step 使用用户选择的 Agent 配置执行"),
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
                "评审报告",
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
                selectedAgent == null ? "前端构建 Agent" : selectedAgent.getName(),
                userInput,
                selectedAgent == null
                        ? "你负责 AgentHub Demo 中的前端实现。"
                        : selectedAgent.getSystemPrompt(),
                selectedAgent == null
                        ? "生成 React 登录页面和初始 README 草案。"
                        : "由用户选择的 Agent 执行前端产物生成。",
                (selectedAgent == null
                        ? "Task Spec 要求生成双模式登录页，并支持以 Artifact 为中心的迭代。"
                        : "Task Spec 要求生成双模式登录页，并支持以 Artifact 为中心的迭代。"
                                + buildSelectedAgentInputContext(selectedAgent, selectedAgentResolution))
                        + pinnedInputContext,
                "已为工作台生成 LoginPage.tsx 和 README.md。",
                List.of(
                        "TaskSpec：React 登录页 Demo",
                        "需要支持邮箱登录和验证码登录",
                        "已启用以 Artifact 为中心的迭代",
                        selectedAgentResolution.sourceDescription(),
                        selectedAgentSummary),
                List.of("LoginPage.tsx", "README.md"),
                List.of(codeArtifact.getId(), readmeArtifact.getId()),
                frontendRoute.preferredAdapterType(),
                now);

        TaskStep backendStep = createAgentExecutedStep(
                conversationId,
                taskRunId,
                2,
                BuiltInAgentIds.BACKEND_WORKER,
                "后端协作 Agent",
                userInput,
                "你负责 AgentHub Demo 中的 API 契约和后端结构说明。",
                "根据页面字段和任务范围生成登录 API 契约。",
                "使用登录页输入作为契约输入，并保持 API 便于后续迭代。",
                "已生成 login-api-contract.json，供后续评审使用。",
                List.of(
                        "TaskSpec：React 登录页 Demo",
                        "前端产物可作为字段参考",
                        "API 契约需要为后续集成预留空间"),
                List.of("LoginPage.tsx", "README.md"),
                List.of(apiContractArtifact.getId()),
                agentRoutingService.resolvePreferredAdapterForStep(
                        BuiltInAgentIds.BACKEND_WORKER,
                        "根据页面字段和任务范围生成登录 API 契约。"),
                now);

        TaskStep reviewStep = createAgentExecutedStep(
                conversationId,
                taskRunId,
                3,
                BuiltInAgentIds.REVIEWER,
                "评审 Agent",
                userInput,
                "你负责 AgentHub Demo 中的评审和验收检查。",
                "检查生成的页面、README、API 契约和验收标准。",
                "结合 Task Spec、代码产物、README 产物和 API 契约产物一起评审。",
                "已生成结构化评审报告，包含通过依据和风险等级。",
                List.of(
                        "TaskSpec 验收标准是评审基线",
                        "需要同时检查代码、README 和 API 契约",
                        "记录问题、建议和风险等级"),
                List.of("LoginPage.tsx", "README.md", "login-api-contract.json"),
                List.of(reviewArtifact.getId()),
                agentRoutingService.resolvePreferredAdapterForStep(
                        BuiltInAgentIds.REVIEWER,
                        "检查生成的页面、README、API 契约和验收标准。"),
                now);

        TaskPlan taskPlan = new TaskPlan(
                "生成登录页、说明文档、API 契约和评审产物。",
                List.of(frontendStep, backendStep, reviewStep));
        List<TaskStep> demoSteps = List.of(frontendStep, backendStep, reviewStep);
        List<Artifact> demoArtifacts = artifactRepository.findByTaskRunId(taskRunId);
        String resultSummary = resultAggregator.summarizeDemoTask(
                taskSpec,
                orchestratorPlan,
                demoSteps,
                demoArtifacts,
                selectedAgentResolution.sourceDescription(),
                selectedAgentSummary);

        TaskRun taskRun = new TaskRun(
                taskRunId,
                conversationRef,
                taskSpec.getId(),
                TaskRunStatus.COMPLETED,
                taskPlan,
                demoSteps,
                "静态 Demo 任务已完成，产出代码、文档、API 契约、评审报告和上下文交接记录。"
                        + selectedAgentResolution.sourceDescription() + " "
                        + selectedAgentSummary + " " + resultSummary,
                now,
                now);
        taskRepository.saveTaskRun(taskRun);

        ContextSnapshot contextSnapshot = new ContextSnapshot(
                new ContextSnapshotId(idGenerator.nextId("ctx")),
                conversationRef,
                taskRunId,
                buildIncludedMessageIds(sourceMessageId, pinnedContexts),
                artifactIdsOf(demoArtifacts),
                mergePinnedContextItems(List.of(
                        "Demo 目标：生成 React 登录页、README 和评审报告",
                        "已启用以 Artifact 为中心的迭代",
                        "Reviewer 必须基于验收标准完成闭环检查",
                        selectedAgentResolution.sourceDescription(),
                        selectedAgentSummary), pinnedContextItems),
                "该快照包含原始用户请求、生成的 Task Spec、三个 TaskStep，以及 LoginPage.tsx、README.md、login-api-contract.json 和评审报告产物。"
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
                                ? "前端构建 Agent 已确定邮箱登录和验证码登录所需页面字段"
                                : "用户选择的 Agent 已确定邮箱登录和验证码登录所需页面字段",
                        selectedAgentResolution.sourceDescription(),
                        "README 草案已记录组件结构和扩展点",
                        selectedAgentSummary),
                List.of(
                        "登录 API 仍需要明确请求和响应契约",
                        "错误处理和表单校验状态尚未实现"),
                (selectedAgent == null
                        ? "前端构建 Agent 交接页面结构和 README，后端协作 Agent 可据此推导稳定 API 契约和数据模型假设。"
                        : "用户选择的 Agent 交接页面结构和 README，后端协作 Agent 可据此推导稳定 API 契约和数据模型假设。")
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
                        "后端协作 Agent 已定义登录请求 payload 和成功/失败响应结构",
                        "评审 Agent 应根据 Task Spec 验收标准检查代码产物、README 和 API 契约"),
                List.of(
                        "前端代码仍缺少表单校验和 API 集成",
                        "README 尚未描述真实部署或持久化行为"),
                "后端协作 Agent 交接 API 契约和产物链路，评审 Agent 可据此验证端到端验收标准并识别剩余风险。",
                now);

        contextRepository.saveHandoffSummary(frontendToBackend);
        contextRepository.saveHandoffSummary(backendToReviewer);

        appendDemoGroupChatMessages(
                conversationId,
                selectedAgent == null ? BuiltInAgentIds.FRONTEND_BUILDER : selectedAgent.getId().value(),
                selectedAgent == null ? "Frontend Builder" : selectedAgent.getName(),
                selectedAgentResolution.sourceDescription(),
                selectedAgentSummary,
                frontendStep,
                backendStep,
                reviewStep,
                codeArtifact,
                readmeArtifact,
                apiContractArtifact,
                reviewArtifact);

        messageApplicationService.appendSystemMessage(
                conversationId,
                MessageType.TASK_SPEC,
                "已创建 Task Spec：React 登录页 Demo",
                List.of());
        messageApplicationService.appendSystemMessage(
                conversationId,
                MessageType.TASK_STATUS,
                "TaskRun 已完成：3 个 TaskStep，" + demoArtifacts.size() + " 个产物。",
                List.of());
        messageApplicationService.appendSystemMessage(
                conversationId,
                MessageType.ARTIFACT_CARD,
                "已创建产物：LoginPage.tsx",
                List.of(codeArtifact.getId()));
        messageApplicationService.appendSystemMessage(
                conversationId,
                MessageType.ARTIFACT_CARD,
                "已创建产物：README.md",
                List.of(readmeArtifact.getId()));
        messageApplicationService.appendSystemMessage(
                conversationId,
                MessageType.ARTIFACT_CARD,
                "已创建产物：login-api-contract.json",
                List.of(apiContractArtifact.getId()));
        messageApplicationService.appendSystemMessage(
                conversationId,
                MessageType.ARTIFACT_CARD,
                "已创建产物：评审报告",
                List.of(reviewArtifact.getId()));
        appendAdapterOutputArtifactMessages(
                conversationId,
                demoArtifacts,
                List.of(codeArtifact.getId(), readmeArtifact.getId(), apiContractArtifact.getId(), reviewArtifact.getId()));

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
                "修改 " + originalArtifact.getTitle(),
                "根据用户追问指令修改选中产物，并保留 Artifact-centered iteration 链路。",
                revisionInstruction,
                List.of(
                        "根据 revision 指令更新选中产物",
                        "生成新的产物版本，不覆盖上一版",
                        "为修改后的产物生成新的评审报告"),
                List.of(
                        "真实代码执行",
                        "真实 LLM 推理",
                        "自动化视觉 diff 生成"),
                List.of(
                        "修改后的产物体现按钮颜色调整",
                        "修改后的产物包含可见 loading 状态",
                        "新的评审报告说明 revision 是否满足请求"),
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
                "评审报告 - " + originalArtifact.getTitle() + " v" + revisedArtifact.getVersion(),
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
                "前端构建 Agent",
                revisionInstruction,
                "你负责 AgentHub Demo 中的前端二次修改。",
                "根据追问指令修改选中的产物。",
                "以上一版产物为基础上下文，应用用户请求的 UI 修改。",
                "已生成修改后的 LoginPage.tsx，主按钮变为蓝色并具备更清晰的 loading 状态。",
                List.of(
                        "原始产物：" + originalArtifact.getTitle() + " v" + originalArtifact.getVersion(),
                        "修改指令：" + revisionInstruction,
                        "保留以 Artifact 为中心的迭代链路"),
                List.of(originalArtifact.getTitle()),
                List.of(revisedArtifact.getId()),
                agentRoutingService.resolvePreferredAdapterForStep(
                        BuiltInAgentIds.FRONTEND_BUILDER,
                        "根据追问指令修改选中的产物。"),
                now);

        TaskStep reviewerStep = createAgentExecutedStep(
                conversationId,
                taskRunId,
                2,
                BuiltInAgentIds.REVIEWER,
                "评审 Agent",
                revisionInstruction,
                "你负责 AgentHub Demo 中的 revision 评审。",
                "检查修改后的产物是否满足 revision 指令和验收标准。",
                "同时检查修改后产物、原始产物和 revision 指令。",
                "已生成 revision 评审报告，包含通过依据、问题和建议。",
                List.of(
                        "原始产物：" + originalArtifact.getTitle() + " v" + originalArtifact.getVersion(),
                        "修改后产物：" + revisedArtifact.getTitle() + " v" + revisedArtifact.getVersion(),
                        "根据修改后产物检查 revision 指令是否被满足"),
                List.of(originalArtifact.getTitle(), revisedArtifact.getTitle()),
                List.of(reviewArtifact.getId()),
                agentRoutingService.resolvePreferredAdapterForStep(
                        BuiltInAgentIds.REVIEWER,
                        "检查修改后的产物是否满足 revision 指令和验收标准。"),
                now);

        TaskPlan revisionPlan = new TaskPlan(
                "修改选中产物并评审新版本。",
                List.of(frontendRevisionStep, reviewerStep));

        TaskRun taskRun = new TaskRun(
                taskRunId,
                conversationRef,
                taskSpec.getId(),
                TaskRunStatus.COMPLETED,
                revisionPlan,
                List.of(frontendRevisionStep, reviewerStep),
                "Artifact-centered revision 已完成，产出新的代码版本和后续评审报告。",
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
                        "已为选中产物启用 Artifact-centered iteration",
                        "修改指令：" + revisionInstruction,
                        "原始产物版本：v" + originalArtifact.getVersion(),
                        "修改后产物版本：v" + revisedArtifact.getVersion()),
                "该 revision 快照关联原始产物、修改指令、修改后产物和新评审报告，用于展示第二轮以 Artifact 为中心的迭代。",
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
                        "按钮样式已改为蓝色",
                        "已增加 loading 状态"),
                List.of(
                        "修改后的页面仍是静态 UI mock，尚未连接真实后端 API",
                        "表单校验、成功/失败反馈可在下一轮继续完善"),
                "前端构建 Agent 将修改后的 LoginPage.tsx 交接给评审 Agent，便于检查第二轮产物是否满足追问指令。",
                now);
        contextRepository.saveHandoffSummary(handoffSummary);

        messageApplicationService.appendSystemMessage(
                conversationId,
                MessageType.TASK_SPEC,
                "已创建 Revision Task Spec：修改 " + originalArtifact.getTitle(),
                List.of());
        messageApplicationService.appendAgentMessage(
                conversationId,
                BuiltInAgentIds.FRONTEND_BUILDER,
                "前端构建 Agent 已根据 revision 指令将 " + originalArtifact.getTitle()
                        + " 更新到 v" + revisedArtifact.getVersion() + "。");
        messageApplicationService.appendAgentMessage(
                conversationId,
                BuiltInAgentIds.REVIEWER,
                "评审 Agent 已完成 revision 检查，并为更新后的产物生成新的评审报告。");
        messageApplicationService.appendSystemMessage(
                conversationId,
                MessageType.TASK_STATUS,
                "Revision TaskRun 已完成：2 个 TaskStep，2 个 revision 产物。",
                List.of());
        messageApplicationService.appendSystemMessage(
                conversationId,
                MessageType.ARTIFACT_CARD,
                "产物已修改：" + revisedArtifact.getTitle() + " v" + revisedArtifact.getVersion(),
                List.of(revisedArtifact.getId()));
        messageApplicationService.appendSystemMessage(
                conversationId,
                MessageType.ARTIFACT_CARD,
                "已创建产物：" + reviewArtifact.getTitle(),
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
        if (agentStepExecutor != null) {
            return agentStepExecutor.execute(new AgentStepExecutor.StepExecutionCommand(
                    conversationId,
                    taskRunId,
                    stepOrder,
                    agentId,
                    agentName,
                    userInput,
                    systemPrompt,
                    taskDescription,
                    "DEMO_STEP",
                    inputContext,
                    baseOutputContent,
                    contextItems,
                    artifactSummaries,
                    producedArtifactIds,
                    preferredAdapterType,
                    now));
        }

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
                + "\n\nAdapter 执行信息：\n"
                + (adapterSummary == null ? "未记录 Adapter 响应。" : adapterSummary);

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

    private OrchestratorStepPlan findStepPlan(OrchestratorPlan plan, int stepOrder) {
        return plan.steps().stream()
                .filter(step -> step.stepOrder() == stepOrder)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Orchestrator step plan not found: " + stepOrder));
    }

    private void appendDemoGroupChatMessages(
            String conversationId,
            String frontendAgentId,
            String frontendAgentName,
            String selectedAgentSource,
            String selectedAgentSummary,
            TaskStep frontendStep,
            TaskStep backendStep,
            TaskStep reviewStep,
            Artifact codeArtifact,
            Artifact readmeArtifact,
            Artifact apiContractArtifact,
            Artifact reviewArtifact) {
        messageApplicationService.appendAgentMessage(
                conversationId,
                BuiltInAgentIds.ORCHESTRATOR,
                "群聊协作已启动：Orchestrator 已将用户目标拆成 3 个 Agent Step，并按 Frontend -> Backend -> Reviewer 顺序协调执行。"
                        + " 关联 TaskStep：步骤 1 / 2 / 3。"
                        + " " + selectedAgentSource);
        messageApplicationService.appendAgentMessage(
                conversationId,
                frontendAgentId,
                "TaskStep 1 / Frontend："
                        + frontendAgentName
                        + " 已完成前端产物生成。assignedAgentId="
                        + frontendStep.getAssignedAgentId().value()
                        + "。产出："
                        + artifactTitle(codeArtifact)
                        + "、"
                        + artifactTitle(readmeArtifact)
                        + "。"
                        + buildAdapterSummary(frontendStep),
                List.of(codeArtifact.getId(), readmeArtifact.getId()));
        messageApplicationService.appendAgentMessage(
                conversationId,
                BuiltInAgentIds.BACKEND_WORKER,
                "TaskStep 2 / Backend：Backend Worker 已根据前端页面字段补齐登录 API 契约。assignedAgentId="
                        + backendStep.getAssignedAgentId().value()
                        + "。产出："
                        + artifactTitle(apiContractArtifact)
                        + "。"
                        + buildAdapterSummary(backendStep),
                List.of(apiContractArtifact.getId()));
        messageApplicationService.appendAgentMessage(
                conversationId,
                BuiltInAgentIds.REVIEWER,
                "TaskStep 3 / Reviewer：Reviewer 已完成质量检查和验收建议。assignedAgentId="
                        + reviewStep.getAssignedAgentId().value()
                        + "。产出："
                        + artifactTitle(reviewArtifact)
                        + "。"
                        + buildAdapterSummary(reviewStep),
                List.of(reviewArtifact.getId()));
        messageApplicationService.appendAgentMessage(
                conversationId,
                BuiltInAgentIds.ORCHESTRATOR,
                "群聊协作汇总：Orchestrator 已聚合 Frontend / Backend / Reviewer 产出，当前 TaskRun 生成 4 个核心 Artifact。"
                        + " selectedAgentContext="
                        + selectedAgentSummary
                        + " fallbackSummary="
                        + buildFallbackSummary(List.of(frontendStep, backendStep, reviewStep))
                        + "。");
    }

    private String buildAdapterSummary(TaskStep step) {
        return " Adapter：preferred=" + step.getPreferredAdapterType()
                + "，actual=" + step.getActualAdapterType()
                + "，status=" + step.getAdapterStatus()
                + (isFallbackStep(step) ? "，fallbackUsed=true" : "")
                + "。";
    }

    private String buildFallbackSummary(List<TaskStep> steps) {
        long fallbackCount = steps.stream().filter(this::isFallbackStep).count();
        if (fallbackCount == 0) {
            return "no fallback";
        }

        return fallbackCount + " step(s) used fallback";
    }

    private boolean isFallbackStep(TaskStep step) {
        return "FALLBACK_USED".equals(step.getAdapterStatus());
    }

    private String artifactTitle(Artifact artifact) {
        return artifact.getTitle() + "(" + artifact.getId().value() + ")";
    }

    private List<String> buildPinnedContextItems(List<PinnedContext> pinnedContexts) {
        return pinnedContexts.stream()
                .map(pinnedContext -> "Pinned context from message "
                        + pinnedContext.getSourceId()
                        + ": "
                        + pinnedContext.getContent())
                .toList();
    }

    private List<MessageId> buildIncludedMessageIds(MessageId sourceMessageId, List<PinnedContext> pinnedContexts) {
        List<MessageId> includedMessageIds = new ArrayList<>();
        includedMessageIds.add(sourceMessageId);
        pinnedContexts.stream()
                .filter(pinnedContext -> "MESSAGE".equals(pinnedContext.getSourceType()))
                .map(PinnedContext::getSourceId)
                .filter(sourceId -> sourceId != null && !sourceId.isBlank())
                .map(MessageId::new)
                .filter(messageId -> !includedMessageIds.contains(messageId))
                .forEach(includedMessageIds::add);
        return includedMessageIds;
    }

    private String buildPinnedInputContext(List<String> pinnedContextItems) {
        if (pinnedContextItems.isEmpty()) {
            return "";
        }

        return " User pinned context for this run: " + String.join(" | ", pinnedContextItems);
    }

    private List<String> mergePinnedContextItems(List<String> baseItems, List<String> pinnedContextItems) {
        List<String> mergedItems = new ArrayList<>(baseItems);
        mergedItems.addAll(pinnedContextItems);
        return mergedItems;
    }

    private List<ArtifactId> artifactIdsOf(List<Artifact> artifacts) {
        return artifacts.stream().map(Artifact::getId).toList();
    }

    private void appendAdapterOutputArtifactMessages(
            String conversationId,
            List<Artifact> artifacts,
            List<ArtifactId> staticArtifactIds) {
        artifacts.stream()
                .filter(artifact -> !containsArtifactId(staticArtifactIds, artifact.getId()))
                .forEach(artifact -> messageApplicationService.appendSystemMessage(
                        conversationId,
                        MessageType.ARTIFACT_CARD,
                        "已创建 Adapter 输出产物：" + artifact.getTitle(),
                        List.of(artifact.getId())));
    }

    private boolean containsArtifactId(List<ArtifactId> artifactIds, ArtifactId targetArtifactId) {
        return artifactIds.stream().anyMatch(artifactId -> artifactId.equals(targetArtifactId));
    }

    private SelectedAgentResolution resolveSelectedAgent(String explicitSelectedAgentId, Message sourceMessage) {
        String normalizedExplicitSelectedAgentId = normalizeAgentId(explicitSelectedAgentId);
        if (normalizedExplicitSelectedAgentId != null) {
            return new SelectedAgentResolution(
                    agentApplicationService.getAgent(normalizedExplicitSelectedAgentId),
                    "Selected Agent 来源：demo-task 请求显式传入。");
        }

        String inferredSelectedAgentId = normalizeAgentId(sourceMessage.getTargetAgentId());
        if (inferredSelectedAgentId != null) {
            return new SelectedAgentResolution(
                    agentApplicationService.getAgent(inferredSelectedAgentId),
                    "Selected Agent 来源：从源消息 targetAgentId 推断。");
        }

        return new SelectedAgentResolution(null, "Selected Agent：使用内置 Specialist Agent 链路。");
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
        return "%s Selected Agent：%s（%s，首选 Adapter：%s）。".formatted(
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
        return "%s Selected Agent 上下文：name=%s，preferredAdapterType=%s，capabilityTags=%s，systemPrompt=%s".formatted(
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
                        <h1>登录</h1>
                        <input
                          className="input"
                          placeholder="邮箱"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                        />
                        <input
                          className="input"
                          placeholder="验证码"
                          value={code}
                          onChange={(event) => setCode(event.target.value)}
                        />
                        <button
                          className="login-button"
                          disabled={loading}
                          onClick={() => setLoading(true)}
                        >
                          {loading ? "登录中..." : "登录"}
                        </button>
                      </div>
                    </div>
                  );
                }
                """;
    }

    private String staticReadmeContent() {
        return """
                # 登录页 Demo

                ## 页面能力

                - 支持邮箱输入
                - 支持验证码输入
                - 登录按钮包含 loading 状态

                ## 使用方式

                1. 渲染 `LoginPage.tsx`
                2. 输入邮箱和验证码
                3. 点击登录按钮，观察 loading 反馈

                ## 组件结构

                - `LoginPage`
                - `login-card`
                - `input`
                - `login-button`

                ## 后续扩展点

                - 增加邮箱格式校验
                - 增加发送验证码按钮和倒计时状态
                - 将页面提交动作连接到生成的登录 API 契约
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
                    "message": "验证码无效或已过期"
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
                        <h1>登录</h1>
                        <p className="login-caption">Artifact-centered iteration 演示</p>
                        <input
                          className="input"
                          placeholder="邮箱"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                        />
                        <input
                          className="input"
                          placeholder="验证码"
                          value={code}
                          onChange={(event) => setCode(event.target.value)}
                        />
                        <button
                          className={`login-button login-button--blue ${loading ? "is-loading" : ""}`}
                          disabled={loading}
                          onClick={handleLogin}
                        >
                          {loading ? "登录中..." : "登录"}
                        </button>
                      </div>
                    </div>
                  );
                }
                """;
    }

    private String staticReviewReportContent() {
        return """
                通过：是

                问题：
                - 当前页面只演示 UI 流程，尚未调用真实后端 API
                - 登录表单仍缺少校验和错误处理

                建议：
                - 增加邮箱格式和空验证码校验
                - 将提交动作连接到生成的 API 契约
                - 增加错误消息状态和成功跳转行为

                风险等级：
                中
                """;
    }

    private String staticRevisionReviewReportContent(
            Artifact originalArtifact,
            Artifact revisedArtifact,
            String revisionInstruction) {
        return """
                通过：是

                修改指令：
                %s

                对比版本：
                - 原始版本：%s v%s
                - 修改后版本：%s v%s

                问题：
                - 修改后产物仍是静态 Demo，不会执行真实登录请求
                - 视觉细节、校验和错误提示仍可在后续迭代中增强

                建议：
                - loading 期间增加输入框禁用态样式
                - loading 结束后补充成功和失败反馈
                - 保留 revision 元数据，便于后续展示完整版本链路

                风险等级：
                低
                """.formatted(
                revisionInstruction,
                originalArtifact.getTitle(),
                originalArtifact.getVersion(),
                revisedArtifact.getTitle(),
                revisedArtifact.getVersion());
    }
}
