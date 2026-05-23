package com.agenthub.application.artifact;

import com.agenthub.application.audit.ActionAuditService;
import com.agenthub.common.IdGenerator;
import com.agenthub.common.TimeProvider;
import com.agenthub.domain.artifact.Artifact;
import com.agenthub.domain.artifact.ArtifactId;
import com.agenthub.domain.artifact.ArtifactRepository;
import com.agenthub.domain.artifact.ArtifactSnapshot;
import com.agenthub.domain.artifact.ArtifactSnapshotRepository;
import com.agenthub.domain.artifact.ArtifactStatus;
import com.agenthub.domain.conversation.ConversationId;
import com.agenthub.domain.task.TaskRunId;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;
import org.springframework.stereotype.Service;

@Service
public class ArtifactApplicationService {

    private final ArtifactRepository artifactRepository;
    private final ArtifactSnapshotRepository artifactSnapshotRepository;
    private final ActionAuditService actionAuditService;
    private final IdGenerator idGenerator;
    private final TimeProvider timeProvider;

    public ArtifactApplicationService(
            ArtifactRepository artifactRepository,
            ArtifactSnapshotRepository artifactSnapshotRepository,
            ActionAuditService actionAuditService,
            IdGenerator idGenerator,
            TimeProvider timeProvider) {
        this.artifactRepository = artifactRepository;
        this.artifactSnapshotRepository = artifactSnapshotRepository;
        this.actionAuditService = actionAuditService;
        this.idGenerator = idGenerator;
        this.timeProvider = timeProvider;
    }

    public List<Artifact> listArtifactsByConversation(String conversationId) {
        return artifactRepository.findByConversationId(new ConversationId(conversationId));
    }

    public List<Artifact> listArtifactsByTaskRun(String taskRunId) {
        return artifactRepository.findByTaskRunId(new TaskRunId(taskRunId));
    }

    public Artifact getArtifact(String artifactId) {
        return artifactRepository.findById(new ArtifactId(artifactId))
                .orElseThrow(() -> new NoSuchElementException("Artifact not found: " + artifactId));
    }

    public List<ArtifactSnapshot> listSnapshotsByArtifact(String artifactId) {
        return artifactSnapshotRepository.findByArtifactId(new ArtifactId(artifactId));
    }

    public ArtifactSnapshot getSnapshot(String snapshotId) {
        return artifactSnapshotRepository.findById(snapshotId)
                .orElseThrow(() -> new NoSuchElementException("Artifact snapshot not found: " + snapshotId));
    }

    public List<ArtifactSnapshot> listSnapshotsByConversation(String conversationId) {
        return artifactSnapshotRepository.findByConversationId(new ConversationId(conversationId));
    }

    public Artifact restoreSnapshot(String snapshotId) {
        ArtifactSnapshot snapshot = getSnapshot(snapshotId);
        Artifact currentArtifact = getArtifact(snapshot.getArtifactId().value());
        createSnapshot(currentArtifact, "RESTORE_BEFORE");
        Instant now = timeProvider.now();
        Artifact restoredArtifact = new Artifact(
                new ArtifactId(idGenerator.nextId("art")),
                snapshot.getConversationId(),
                snapshot.getTaskRunId(),
                snapshot.getArtifactId().value(),
                "Restore from snapshot " + snapshot.getSnapshotId(),
                snapshot.getTitle(),
                snapshot.getType(),
                ArtifactStatus.ACCEPTED,
                snapshot.getLanguage(),
                snapshot.getContent(),
                Math.max(currentArtifact.getVersion(), snapshot.getVersion()) + 1,
                now,
                now);
        artifactRepository.save(restoredArtifact);
        actionAuditService.record(
                snapshot.getConversationId(),
                "RESTORE_SNAPSHOT",
                "ARTIFACT_SNAPSHOT",
                snapshotId,
                "COMPLETED",
                "Restored artifact from snapshot before returning it to Artifact Studio.");
        return restoredArtifact;
    }

    public ApplyDiffResult applyDiff(String artifactId) {
        return applyDiff(artifactId, false);
    }

    public ApplyDiffResult applyDiff(String artifactId, boolean force) {
        Artifact revisionArtifact = getArtifact(artifactId);
        String parentArtifactId = revisionArtifact.getParentArtifactId();
        if (parentArtifactId == null || parentArtifactId.isBlank()) {
            throw new IllegalArgumentException("Only revision artifacts with a parent can be applied.");
        }

        Artifact parentArtifact = getArtifact(parentArtifactId);
        Artifact conflictingArtifact = findLatestAppliedArtifact(revisionArtifact);
        if (!force && conflictingArtifact != null) {
            actionAuditService.record(
                    revisionArtifact.getConversationId(),
                    "APPLY_DIFF",
                    "ARTIFACT",
                    revisionArtifact.getId().value(),
                    "CONFLICT",
                    "Diff apply blocked because a newer accepted artifact exists in this lineage.");
            return ApplyDiffResult.conflict(
                    parentArtifact.getId().value(),
                    revisionArtifact.getId().value(),
                    conflictingArtifact.getId().value(),
                    "A newer applied artifact already exists for this revision lineage. Review the latest accepted artifact or force apply if this older revision should still be materialized.");
        }

        LinePatchResult patchResult = buildAndApplyLinePatch(parentArtifact.getContent(), revisionArtifact.getContent());
        if (!patchResult.appliedContent().equals(revisionArtifact.getContent())) {
            throw new IllegalStateException("Line patch application did not reproduce the revision artifact content.");
        }

        Instant now = timeProvider.now();
        ArtifactSnapshot snapshot = createSnapshot(parentArtifact, force ? "FORCE_APPLY_DIFF" : "APPLY_DIFF");
        Artifact appliedArtifact = new Artifact(
                new ArtifactId(idGenerator.nextId("art")),
                revisionArtifact.getConversationId(),
                revisionArtifact.getTaskRunId(),
                revisionArtifact.getId().value(),
                "Applied diff from " + revisionArtifact.getTitle() + " v" + revisionArtifact.getVersion(),
                revisionArtifact.getTitle(),
                revisionArtifact.getType(),
                ArtifactStatus.ACCEPTED,
                revisionArtifact.getLanguage(),
                patchResult.appliedContent(),
                revisionArtifact.getVersion() + 1,
                now,
                now);

        artifactRepository.save(appliedArtifact);
        actionAuditService.record(
                revisionArtifact.getConversationId(),
                force ? "FORCE_APPLY_DIFF" : "APPLY_DIFF",
                "ARTIFACT",
                revisionArtifact.getId().value(),
                "COMPLETED",
                "Created pre-apply snapshot " + snapshot.getSnapshotId() + " and materialized applied artifact "
                        + appliedArtifact.getId().value() + ".");
        return new ApplyDiffResult(
                appliedArtifact,
                parentArtifact.getId().value(),
                revisionArtifact.getId().value(),
                patchResult.added(),
                patchResult.removed(),
                patchResult.unchanged(),
                patchResult.changed(),
                false,
                null,
                null);
    }

    public ArtifactSnapshot createSnapshot(Artifact artifact, String operationType) {
        ArtifactSnapshot snapshot = new ArtifactSnapshot(
                idGenerator.nextId("snapshot"),
                artifact.getId(),
                artifact.getConversationId(),
                artifact.getTaskRunId(),
                artifact.getTitle(),
                artifact.getType(),
                artifact.getStatus(),
                artifact.getLanguage(),
                artifact.getContent(),
                artifact.getVersion(),
                operationType,
                timeProvider.now());
        return artifactSnapshotRepository.save(snapshot);
    }

    private Artifact findLatestAppliedArtifact(Artifact revisionArtifact) {
        return artifactRepository.findByConversationId(revisionArtifact.getConversationId()).stream()
                .filter(candidate -> candidate.getStatus() == ArtifactStatus.ACCEPTED)
                .filter(candidate -> candidate.getTitle().equals(revisionArtifact.getTitle()))
                .filter(candidate -> !candidate.getId().equals(revisionArtifact.getId()))
                .filter(candidate -> candidate.getVersion() > revisionArtifact.getVersion())
                .max((left, right) -> {
                    int versionComparison = Integer.compare(left.getVersion(), right.getVersion());
                    if (versionComparison != 0) {
                        return versionComparison;
                    }
                    return left.getCreatedAt().compareTo(right.getCreatedAt());
                })
                .orElse(null);
    }

    private LinePatchResult buildAndApplyLinePatch(String baseContent, String targetContent) {
        List<String> baseLines = splitLines(baseContent);
        List<String> targetLines = splitLines(targetContent);
        int[][] table = new int[baseLines.size() + 1][targetLines.size() + 1];

        for (int baseIndex = baseLines.size() - 1; baseIndex >= 0; baseIndex -= 1) {
            for (int targetIndex = targetLines.size() - 1; targetIndex >= 0; targetIndex -= 1) {
                table[baseIndex][targetIndex] = baseLines.get(baseIndex).equals(targetLines.get(targetIndex))
                        ? table[baseIndex + 1][targetIndex + 1] + 1
                        : Math.max(table[baseIndex + 1][targetIndex], table[baseIndex][targetIndex + 1]);
            }
        }

        List<String> appliedLines = new ArrayList<>();
        int added = 0;
        int removed = 0;
        int unchanged = 0;
        int baseIndex = 0;
        int targetIndex = 0;

        while (baseIndex < baseLines.size() && targetIndex < targetLines.size()) {
            if (baseLines.get(baseIndex).equals(targetLines.get(targetIndex))) {
                appliedLines.add(baseLines.get(baseIndex));
                unchanged += 1;
                baseIndex += 1;
                targetIndex += 1;
            } else if (table[baseIndex + 1][targetIndex] >= table[baseIndex][targetIndex + 1]) {
                removed += 1;
                baseIndex += 1;
            } else {
                appliedLines.add(targetLines.get(targetIndex));
                added += 1;
                targetIndex += 1;
            }
        }

        while (baseIndex < baseLines.size()) {
            removed += 1;
            baseIndex += 1;
        }

        while (targetIndex < targetLines.size()) {
            appliedLines.add(targetLines.get(targetIndex));
            added += 1;
            targetIndex += 1;
        }

        return new LinePatchResult(
                joinLines(appliedLines, targetContent),
                added,
                removed,
                unchanged,
                Math.min(added, removed));
    }

    private List<String> splitLines(String content) {
        if (content == null || content.isEmpty()) {
            return List.of();
        }

        return List.of(content.replace("\r\n", "\n").replace('\r', '\n').split("\n", -1));
    }

    private String joinLines(List<String> lines, String targetContent) {
        if (targetContent == null || targetContent.isEmpty()) {
            return "";
        }

        String joined = String.join("\n", lines);
        return targetContent.endsWith("\n") && !joined.endsWith("\n") ? joined + "\n" : joined;
    }

    public record ApplyDiffResult(
            Artifact appliedArtifact,
            String baseArtifactId,
            String revisionArtifactId,
            int addedLines,
            int removedLines,
            int unchangedLines,
            int changedLines,
            boolean conflict,
            String conflictReason,
            String latestAppliedArtifactId) {

        public static ApplyDiffResult conflict(
                String baseArtifactId,
                String revisionArtifactId,
                String latestAppliedArtifactId,
                String conflictReason) {
            return new ApplyDiffResult(
                    null,
                    baseArtifactId,
                    revisionArtifactId,
                    0,
                    0,
                    0,
                    0,
                    true,
                    conflictReason,
                    latestAppliedArtifactId);
        }
    }

    private record LinePatchResult(
            String appliedContent,
            int added,
            int removed,
            int unchanged,
            int changed) {
    }
}
