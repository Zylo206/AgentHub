import { useEffect, useState } from "react";
import {
  ApiError,
  createAdminUser,
  getAdminUsers,
  resetAdminUserPassword,
  updateAdminUserAdminFlag,
  updateAdminUserStatus,
  type AdminUser
} from "../../api/agenthubApi";

const STATUS_OPTIONS = ["ACTIVE", "DISABLED", "LOCKED"] as const;

export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    username: "",
    email: "",
    password: "",
    primaryOrgTag: "DEFAULT",
    isAdmin: false
  });
  const [resetPasswords, setResetPasswords] = useState<Record<string, string>>({});

  async function loadUsers() {
    setLoading(true);
    setError(null);
    try {
      setUsers(await getAdminUsers());
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : "加载用户失败。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createAdminUser(createForm);
      setCreateForm({
        username: "",
        email: "",
        password: "",
        primaryOrgTag: "DEFAULT",
        isAdmin: false
      });
      await loadUsers();
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : "创建用户失败。");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatus(userId: string, status: (typeof STATUS_OPTIONS)[number]) {
    setSaving(true);
    setError(null);
    try {
      await updateAdminUserStatus(userId, status);
      await loadUsers();
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : "更新状态失败。");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleAdmin(userId: string, isAdmin: boolean) {
    setSaving(true);
    setError(null);
    try {
      await updateAdminUserAdminFlag(userId, isAdmin);
      await loadUsers();
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : "更新管理员权限失败。");
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword(userId: string) {
    const password = resetPasswords[userId]?.trim();
    if (!password) {
      setError("请输入新密码。");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await resetAdminUserPassword(userId, password);
      setResetPasswords((current) => ({ ...current, [userId]: "" }));
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : "重置密码失败。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-users-page">
      <section className="admin-users-page__hero">
        <div>
          <span className="admin-users-page__eyebrow">管理后台</span>
          <h1>用户管理</h1>
          <p>创建用户、控制启用状态、重置密码和设置管理员权限。</p>
        </div>
      </section>

      <div className="admin-users-page__grid">
        <section className="admin-users-card">
          <h2>创建用户</h2>
          <form className="admin-users-form" onSubmit={handleCreate}>
            <label>
              用户名
              <input
                value={createForm.username}
                onChange={(event) => setCreateForm((current) => ({ ...current, username: event.target.value }))}
              />
            </label>
            <label>
              邮箱
              <input
                value={createForm.email}
                onChange={(event) => setCreateForm((current) => ({ ...current, email: event.target.value }))}
              />
            </label>
            <label>
              初始密码
              <input
                type="password"
                value={createForm.password}
                onChange={(event) => setCreateForm((current) => ({ ...current, password: event.target.value }))}
              />
            </label>
            <label>
              组织标签
              <input
                value={createForm.primaryOrgTag}
                onChange={(event) => setCreateForm((current) => ({ ...current, primaryOrgTag: event.target.value }))}
              />
            </label>
            <label className="admin-users-form__checkbox">
              <input
                type="checkbox"
                checked={createForm.isAdmin}
                onChange={(event) => setCreateForm((current) => ({ ...current, isAdmin: event.target.checked }))}
              />
              管理员
            </label>
            <button type="submit" className="primary-button" disabled={saving}>
              创建用户
            </button>
          </form>
        </section>

        <section className="admin-users-card">
          <div className="admin-users-card__header">
            <h2>用户列表</h2>
            <button type="button" className="secondary-button" onClick={() => void loadUsers()} disabled={loading || saving}>
              刷新
            </button>
          </div>
          {error ? <div className="admin-users-card__error">{error}</div> : null}
          {loading ? <div className="panel-empty">加载中...</div> : null}
          {!loading ? (
            <div className="admin-users-table">
              {users.map((user) => (
                <article key={user.id} className="admin-users-row">
                  <div className="admin-users-row__summary">
                    <strong>{user.displayName}</strong>
                    <span>{user.username}</span>
                    <span>{user.email}</span>
                    <span>{user.primaryOrgTag}</span>
                  </div>
                  <div className="admin-users-row__controls">
                    <select
                      value={user.status}
                      disabled={saving}
                      onChange={(event) =>
                        void handleStatus(user.id, event.target.value as (typeof STATUS_OPTIONS)[number])
                      }
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={saving}
                      onClick={() => void handleToggleAdmin(user.id, !user.isAdmin)}
                    >
                      {user.isAdmin ? "取消管理员" : "设为管理员"}
                    </button>
                  </div>
                  <div className="admin-users-row__password">
                    <input
                      type="password"
                      placeholder="新密码"
                      value={resetPasswords[user.id] ?? ""}
                      onChange={(event) =>
                        setResetPasswords((current) => ({ ...current, [user.id]: event.target.value }))
                      }
                    />
                    <button type="button" className="secondary-button" disabled={saving} onClick={() => void handleResetPassword(user.id)}>
                      重置密码
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
