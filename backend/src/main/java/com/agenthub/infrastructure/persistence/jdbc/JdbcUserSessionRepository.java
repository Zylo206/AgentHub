package com.agenthub.infrastructure.persistence.jdbc;

import com.agenthub.domain.user.UserSession;
import com.agenthub.domain.user.UserSessionRepository;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Locale;
import java.util.Optional;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Repository;

@Repository
@ConditionalOnProperty(name = "agenthub.persistence.mode", havingValue = "jdbc")
public class JdbcUserSessionRepository implements UserSessionRepository {

    private final JdbcConnectionFactory connectionFactory;

    public JdbcUserSessionRepository(JdbcConnectionFactory connectionFactory) {
        this.connectionFactory = connectionFactory;
        initSchema();
    }

    @Override
    public UserSession save(UserSession userSession) {
        String sql = """
                REPLACE INTO agenthub_user_sessions
                (session_id, user_id, access_token_hash, refresh_token_hash, access_expires_at, refresh_expires_at,
                 created_at, updated_at, last_used_at, revoked_at, client_ip, user_agent)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """;
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement(sql)) {
            statement.setString(1, userSession.sessionId());
            statement.setString(2, userSession.userId());
            statement.setString(3, userSession.accessTokenHash());
            statement.setString(4, userSession.refreshTokenHash());
            statement.setTimestamp(5, JdbcSerializationSupport.timestamp(userSession.accessExpiresAt()));
            statement.setTimestamp(6, JdbcSerializationSupport.timestamp(userSession.refreshExpiresAt()));
            statement.setTimestamp(7, JdbcSerializationSupport.timestamp(userSession.createdAt()));
            statement.setTimestamp(8, JdbcSerializationSupport.timestamp(userSession.updatedAt()));
            statement.setTimestamp(9, JdbcSerializationSupport.timestamp(userSession.lastUsedAt()));
            statement.setTimestamp(10, JdbcSerializationSupport.timestamp(userSession.revokedAt()));
            statement.setString(11, userSession.clientIp());
            statement.setString(12, userSession.userAgent());
            statement.executeUpdate();
            return userSession;
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to save user session", exception);
        }
    }

    @Override
    public Optional<UserSession> findByAccessTokenHash(String accessTokenHash) {
        return queryOne("SELECT * FROM agenthub_user_sessions WHERE access_token_hash = ?", accessTokenHash);
    }

    @Override
    public Optional<UserSession> findByRefreshTokenHash(String refreshTokenHash) {
        return queryOne("SELECT * FROM agenthub_user_sessions WHERE refresh_token_hash = ?", refreshTokenHash);
    }

    @Override
    public void revokeBySessionId(String sessionId) {
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement(
                        "UPDATE agenthub_user_sessions SET revoked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE session_id = ?")) {
            statement.setString(1, sessionId);
            statement.executeUpdate();
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to revoke user session", exception);
        }
    }

    private Optional<UserSession> queryOne(String sql, String value) {
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement(sql)) {
            statement.setString(1, value);
            try (ResultSet resultSet = statement.executeQuery()) {
                return resultSet.next() ? Optional.of(map(resultSet)) : Optional.empty();
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to query user session", exception);
        }
    }

    private UserSession map(ResultSet resultSet) throws SQLException {
        return new UserSession(
                resultSet.getString("session_id"),
                resultSet.getString("user_id"),
                resultSet.getString("access_token_hash"),
                resultSet.getString("refresh_token_hash"),
                JdbcSerializationSupport.instant(resultSet.getTimestamp("access_expires_at")),
                JdbcSerializationSupport.instant(resultSet.getTimestamp("refresh_expires_at")),
                JdbcSerializationSupport.instant(resultSet.getTimestamp("created_at")),
                JdbcSerializationSupport.instant(resultSet.getTimestamp("updated_at")),
                JdbcSerializationSupport.instant(resultSet.getTimestamp("last_used_at")),
                JdbcSerializationSupport.instant(resultSet.getTimestamp("revoked_at")),
                resultSet.getString("client_ip"),
                resultSet.getString("user_agent"));
    }

    private void initSchema() {
        try (Connection connection = connectionFactory.open();
                var statement = connection.createStatement()) {
            statement.executeUpdate("""
                    CREATE TABLE IF NOT EXISTS agenthub_user_sessions (
                        session_id VARCHAR(128) PRIMARY KEY,
                        user_id VARCHAR(128) NOT NULL,
                        access_token_hash VARCHAR(128) NOT NULL,
                        refresh_token_hash VARCHAR(128) NOT NULL,
                        access_expires_at TIMESTAMP NULL,
                        refresh_expires_at TIMESTAMP NULL,
                        created_at TIMESTAMP NULL,
                        updated_at TIMESTAMP NULL,
                        last_used_at TIMESTAMP NULL,
                        revoked_at TIMESTAMP NULL,
                        client_ip VARCHAR(128),
                        user_agent VARCHAR(512),
                        UNIQUE KEY uq_agenthub_user_sessions_access (access_token_hash),
                        UNIQUE KEY uq_agenthub_user_sessions_refresh (refresh_token_hash)
                    )
                    """);
            ensureColumn(connection, "agenthub_user_sessions", "client_ip", "VARCHAR(128)");
            ensureColumn(connection, "agenthub_user_sessions", "user_agent", "VARCHAR(512)");
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to initialize user session schema", exception);
        }
    }

    private void ensureColumn(Connection connection, String tableName, String columnName, String definition)
            throws SQLException {
        try (var statement = connection.createStatement()) {
            statement.executeUpdate("ALTER TABLE " + tableName + " ADD COLUMN " + columnName + " " + definition);
        } catch (SQLException exception) {
            if (!exception.getMessage().toLowerCase(Locale.ROOT).contains("duplicate column")) {
                throw exception;
            }
        }
    }
}
