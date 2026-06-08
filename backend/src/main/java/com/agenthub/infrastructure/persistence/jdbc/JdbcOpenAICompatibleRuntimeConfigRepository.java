package com.agenthub.infrastructure.persistence.jdbc;

import com.agenthub.application.agent.OpenAICompatibleRuntimeConfigCryptoService;
import com.agenthub.application.agent.OpenAICompatibleRuntimeConfigRepository;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Repository;

@Repository
@ConditionalOnProperty(name = "agenthub.persistence.mode", havingValue = "jdbc")
public class JdbcOpenAICompatibleRuntimeConfigRepository implements OpenAICompatibleRuntimeConfigRepository {

    private final JdbcConnectionFactory connectionFactory;
    private final OpenAICompatibleRuntimeConfigCryptoService cryptoService;

    public JdbcOpenAICompatibleRuntimeConfigRepository(
            JdbcConnectionFactory connectionFactory,
            OpenAICompatibleRuntimeConfigCryptoService cryptoService) {
        this.connectionFactory = connectionFactory;
        this.cryptoService = cryptoService;
        initSchema();
    }

    @Override
    public Optional<PersistedRuntimeConfig> find(String adapterType, String scopeType, String scopeId) {
        List<PersistedRuntimeConfig> configs = queryMany(
                "SELECT * FROM agenthub_adapter_runtime_configs WHERE adapter_type = ? AND scope_type = ? AND scope_id = ?",
                adapterType,
                scopeType,
                scopeId);
        return configs.stream().findFirst();
    }

    @Override
    public PersistedRuntimeConfig save(PersistedRuntimeConfig config) {
        String sql = """
                REPLACE INTO agenthub_adapter_runtime_configs
                (adapter_type, scope_type, scope_id, enabled, provider_name, base_url, api_key_encrypted,
                 model, updated_at, updated_by_user_id, updated_by_role)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """;
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement(sql)) {
            statement.setString(1, config.adapterType());
            statement.setString(2, config.scopeType());
            statement.setString(3, config.scopeId());
            statement.setBoolean(4, config.enabled());
            statement.setString(5, config.providerName());
            statement.setString(6, config.baseUrl());
            statement.setString(7, cryptoService.encryptForJdbc(config.apiKey()));
            statement.setString(8, config.model());
            statement.setTimestamp(9, JdbcSerializationSupport.timestamp(config.updatedAt()));
            statement.setString(10, config.updatedByUserId());
            statement.setString(11, config.updatedByRole());
            statement.executeUpdate();
            return config;
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to save OpenAI-compatible runtime config", exception);
        }
    }

    private List<PersistedRuntimeConfig> queryMany(String sql, String adapterType, String scopeType, String scopeId) {
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement(sql)) {
            statement.setString(1, adapterType);
            statement.setString(2, scopeType);
            statement.setString(3, scopeId);
            try (ResultSet resultSet = statement.executeQuery()) {
                java.util.ArrayList<PersistedRuntimeConfig> configs = new java.util.ArrayList<>();
                while (resultSet.next()) {
                    configs.add(map(resultSet));
                }
                return configs;
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to query OpenAI-compatible runtime config", exception);
        }
    }

    private PersistedRuntimeConfig map(ResultSet resultSet) throws SQLException {
        return new PersistedRuntimeConfig(
                resultSet.getString("adapter_type"),
                resultSet.getString("scope_type"),
                resultSet.getString("scope_id"),
                resultSet.getBoolean("enabled"),
                resultSet.getString("provider_name"),
                resultSet.getString("base_url"),
                cryptoService.decryptFromJdbc(resultSet.getString("api_key_encrypted")),
                resultSet.getString("model"),
                JdbcSerializationSupport.instant(resultSet.getTimestamp("updated_at")),
                resultSet.getString("updated_by_user_id"),
                resultSet.getString("updated_by_role"));
    }

    private void initSchema() {
        try (Connection connection = connectionFactory.open();
                var statement = connection.createStatement()) {
            statement.executeUpdate("""
                    CREATE TABLE IF NOT EXISTS agenthub_adapter_runtime_configs (
                        adapter_type VARCHAR(64) NOT NULL,
                        scope_type VARCHAR(32) NOT NULL,
                        scope_id VARCHAR(128) NOT NULL,
                        enabled BOOLEAN DEFAULT FALSE,
                        provider_name VARCHAR(255),
                        base_url TEXT,
                        api_key_encrypted LONGTEXT,
                        model VARCHAR(255),
                        updated_at TIMESTAMP NULL,
                        updated_by_user_id VARCHAR(128),
                        updated_by_role VARCHAR(64),
                        PRIMARY KEY (adapter_type, scope_type, scope_id)
                    )
                    """);
            ensureColumn(connection, "agenthub_adapter_runtime_configs", "updated_by_user_id", "VARCHAR(128)");
            ensureColumn(connection, "agenthub_adapter_runtime_configs", "updated_by_role", "VARCHAR(64)");
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to initialize OpenAI-compatible runtime config schema", exception);
        }
    }

    private void ensureColumn(Connection connection, String tableName, String columnName, String definition)
            throws SQLException {
        try (var statement = connection.createStatement()) {
            statement.executeUpdate("ALTER TABLE " + tableName + " ADD COLUMN " + columnName + " " + definition);
        } catch (SQLException exception) {
            if (!exception.getMessage().toLowerCase(java.util.Locale.ROOT).contains("duplicate column")) {
                throw exception;
            }
        }
    }
}
