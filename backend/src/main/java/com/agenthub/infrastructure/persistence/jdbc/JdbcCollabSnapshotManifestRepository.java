package com.agenthub.infrastructure.persistence.jdbc;

import com.agenthub.application.collab.CollabSnapshotManifestRepository;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Locale;
import java.util.Optional;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Repository;

@Repository
@ConditionalOnProperty(name = "agenthub.persistence.mode", havingValue = "jdbc")
public class JdbcCollabSnapshotManifestRepository implements CollabSnapshotManifestRepository {

    private final JdbcConnectionFactory connectionFactory;

    public JdbcCollabSnapshotManifestRepository(JdbcConnectionFactory connectionFactory) {
        this.connectionFactory = connectionFactory;
        initSchema();
    }

    @Override
    public Optional<CollabSnapshotManifest> findByArtifactId(String artifactId) {
        String sql = "SELECT * FROM agenthub_collab_snapshot_manifests WHERE artifact_id = ?";
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement(sql)) {
            statement.setString(1, artifactId);
            try (ResultSet resultSet = statement.executeQuery()) {
                if (!resultSet.next()) {
                    return Optional.empty();
                }
                return Optional.of(map(resultSet));
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to query collaboration snapshot manifest", exception);
        }
    }

    @Override
    public CollabSnapshotManifest save(CollabSnapshotManifest manifest) {
        String sql = """
                REPLACE INTO agenthub_collab_snapshot_manifests
                (artifact_id, conversation_id, room_id, protocol, room_version, storage_provider, storage_bucket,
                 storage_key, checksum_sha256, snapshot_size_bytes, updated_by_user_id, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """;
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement(sql)) {
            statement.setString(1, manifest.artifactId());
            statement.setString(2, manifest.conversationId());
            statement.setString(3, manifest.roomId());
            statement.setString(4, manifest.protocol());
            statement.setInt(5, manifest.roomVersion());
            statement.setString(6, manifest.storageProvider());
            statement.setString(7, manifest.storageBucket());
            statement.setString(8, manifest.storageKey());
            statement.setString(9, manifest.checksumSha256());
            statement.setLong(10, manifest.snapshotSizeBytes());
            statement.setString(11, manifest.updatedByUserId());
            statement.setTimestamp(12, JdbcSerializationSupport.timestamp(manifest.updatedAt()));
            statement.executeUpdate();
            return manifest;
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to save collaboration snapshot manifest", exception);
        }
    }

    private CollabSnapshotManifest map(ResultSet resultSet) throws SQLException {
        return new CollabSnapshotManifest(
                resultSet.getString("artifact_id"),
                resultSet.getString("conversation_id"),
                resultSet.getString("room_id"),
                resultSet.getString("protocol"),
                resultSet.getInt("room_version"),
                resultSet.getString("storage_provider"),
                resultSet.getString("storage_bucket"),
                resultSet.getString("storage_key"),
                resultSet.getString("checksum_sha256"),
                resultSet.getLong("snapshot_size_bytes"),
                resultSet.getString("updated_by_user_id"),
                JdbcSerializationSupport.instant(resultSet.getTimestamp("updated_at")));
    }

    private void initSchema() {
        try (Connection connection = connectionFactory.open();
                var statement = connection.createStatement()) {
            statement.executeUpdate("""
                    CREATE TABLE IF NOT EXISTS agenthub_collab_snapshot_manifests (
                        artifact_id VARCHAR(128) PRIMARY KEY,
                        conversation_id VARCHAR(128) NOT NULL,
                        room_id VARCHAR(255) NOT NULL,
                        protocol VARCHAR(64) NOT NULL,
                        room_version INT NOT NULL,
                        storage_provider VARCHAR(64) NOT NULL,
                        storage_bucket VARCHAR(255) NOT NULL,
                        storage_key TEXT NOT NULL,
                        checksum_sha256 VARCHAR(128) NOT NULL,
                        snapshot_size_bytes BIGINT NOT NULL,
                        updated_by_user_id VARCHAR(128) NOT NULL,
                        updated_at TIMESTAMP NULL
                    )
                    """);
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to initialize collaboration snapshot manifest schema", exception);
        }
    }
}
