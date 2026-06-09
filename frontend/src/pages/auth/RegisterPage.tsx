import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../../api/agenthubApi";
import { useAuth } from "../../auth/AuthProvider";

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError("两次输入的密码不一致。");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await register(username.trim(), email.trim(), password);
      navigate("/workspace", { replace: true });
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : "注册失败，请重试。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-card">
        <div className="auth-card__header">
          <span className="auth-card__eyebrow">AgentHub 账号</span>
          <h1>注册</h1>
          <p>创建本地账号后即可进入 Workspace 和 Agent 管理。</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            用户名
            <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
          </label>
          <label>
            邮箱
            <input value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
          </label>
          <label>
            密码
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
            />
          </label>
          <label>
            确认密码
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
            />
          </label>
          {error ? <div className="auth-form__error">{error}</div> : null}
          <button
            type="submit"
            className="primary-button"
            disabled={submitting || !username.trim() || !email.trim() || !password || !confirmPassword}
          >
            {submitting ? "注册中..." : "注册"}
          </button>
        </form>

        <div className="auth-card__footer">
          <span>已有账号？</span>
          <Link to="/login">登录</Link>
        </div>
      </section>
    </div>
  );
}
