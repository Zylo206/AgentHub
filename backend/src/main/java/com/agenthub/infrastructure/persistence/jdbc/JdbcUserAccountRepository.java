package com.agenthub.infrastructure.persistence.jdbc;

import com.agenthub.domain.user.UserAccount;
import com.agenthub.domain.user.UserAccountRepository;
import com.agenthub.domain.user.UserAccountStatus;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Repository;

@Repository
@ConditionalOnProperty(name = "agenthub.persistence.mode", havingValue = "jdbc")
public class JdbcUserAccountRepository implements UserAccountRepository {

    private final JdbcConnectionFactory connectionFactory;

    public JdbcUserAccountRepository(JdbcConnectionFactory connectionFactory) {
        this.connectionFactory = connectionFactory;
        initSchema();
    }

    @Override
    public UserAccount save(UserAccount userAccount) {
        String sql = """
                REPLACE INTO agenthub_users
                (id, username, email, display_name, password_hash, status, is_admin, primary_org_tag,
                 created_at, updated_at, last_login_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """;
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement(sql)) {
            statement.setString(1, userAccount.id());
            statement.setString(2, userAccount.username());
            statement.setString(3, userAccount.email());
            statement.setString(4, userAccount.displayName());
            statement.setString(5, userAccount.passwordHash());
            statement.setString(6, userAccount.status().name());
            statement.setBoolean(7, userAccount.isAdmin());
            statement.setString(8, userAccount.primaryOrgTag());
            statement.setTimestamp(9, JdbcSerializationSupport.timestamp(userAccount.createdAt()));
            statement.setTimestamp(10, JdbcSerializationSupport.timestamp(userAccount.updatedAt()));
            statement.setTimestamp(11, JdbcSerializationSupport.timestamp(userAccount.lastLoginAt()));
            statement.executeUpdate();
            return userAccount;
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to save user account", exception);
        }
    }

    @Override
    public Optional<UserAccount> findById(String userId) {
        return queryOne("SELECT * FROM agenthub_users WHERE id = ?", userId);
    }

    @Override
    public Optional<UserAccount> findByUsername(String username) {
        return queryOne("SELECT * FROM agenthub_users WHERE lower(username) = lower(?)", username);
    }

    @Override
    public Optional<UserAccount> findByEmail(String email) {
        return queryOne("SELECT * FROM agenthub_users WHERE lower(email) = lower(?)", email);
    }

    @Override
    public List<UserAccount> findAll() {
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement("SELECT * FROM agenthub_users ORDER BY created_at ASC");
                ResultSet resultSet = statement.executeQuery()) {
            ArrayList<UserAccount> users = new ArrayList<>();
            while (resultSet.next()) {
                users.add(map(resultSet));
            }
            return users;
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to list user accounts", exception);
        }
    }

    private Optional<UserAccount> queryOne(String sql, String value) {
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement(sql)) {
            statement.setString(1, value);
            try (ResultSet resultSet = statement.executeQuery()) {
                return resultSet.next() ? Optional.of(map(resultSet)) : Optional.empty();
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to query user account", exception);
        }
    }

    private UserAccount map(ResultSet resultSet) throws SQLException {
        return new UserAccount(
                resultSet.getString("id"),
                resultSet.getString("username"),
                resultSet.getString("email"),
                resultSet.getString("display_name"),
                resultSet.getString("password_hash"),
                UserAccountStatus.valueOf(resultSet.getString("status")),
                resultSet.getBoolean("is_admin"),
                resultSet.getString("primary_org_tag"),
                JdbcSerializationSupport.instant(resultSet.getTimestamp("created_at")),
                JdbcSerializationSupport.instant(resultSet.getTimestamp("updated_at")),
                JdbcSerializationSupport.instant(resultSet.getTimestamp("last_login_at")));
    }

    private void initSchema() {
        try (Connection connection = connectionFactory.open();
                var statement = connection.createStatement()) {
            statement.executeUpdate("""
                    CREATE TABLE IF NOT EXISTS agenthub_users (
                        id VARCHAR(128) PRIMARY KEY,
                        username VARCHAR(128) NOT NULL,
                        email VARCHAR(255) NOT NULL,
                        display_name VARCHAR(255) NOT NULL,
                        password_hash VARCHAR(255) NOT NULL,
                        status VARCHAR(32) NOT NULL,
                        is_admin BOOLEAN DEFAULT FALSE,
                        primary_org_tag VARCHAR(128) DEFAULT 'DEFAULT',
                        created_at TIMESTAMP NULL,
                        updated_at TIMESTAMP NULL,
                        last_login_at TIMESTAMP NULL,
                        UNIQUE KEY uq_agenthub_users_username (username),
                        UNIQUE KEY uq_agenthub_users_email (email)
                    )
                    """);
            ensureColumn(connection, "agenthub_users", "display_name", "VARCHAR(255) NOT NULL DEFAULT 'User'");
            ensureColumn(connection, "agenthub_users", "primary_org_tag", "VARCHAR(128) DEFAULT 'DEFAULT'");
            ensureColumn(connection, "agenthub_users", "last_login_at", "TIMESTAMP NULL");
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to initialize user schema", exception);
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
