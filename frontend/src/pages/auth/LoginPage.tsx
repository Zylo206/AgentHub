import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ApiError } from "../../api/agenthubApi";
import { useAuth } from "../../auth/AuthProvider";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectTo =
    typeof location.state === "object" && location.state && "from" in location.state
      ? String((location.state as { from?: string }).from || "/workspace")
      : "/workspace";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(username.trim(), password);
      navigate(redirectTo, { replace: true });
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : "登录失败，请重试。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-card">
        <div className="auth-card__header">
          <span className="auth-card__eyebrow">AgentHub 账号</span>
          <h1>登录</h1>
          <p>使用用户名或邮箱登录本地 AgentHub。</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            用户名 / 邮箱
            <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
          </label>
          <label>
            密码
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </label>
          {error ? <div className="auth-form__error">{error}</div> : null}
          <button type="submit" className="primary-button" disabled={submitting || !username.trim() || !password}>
            {submitting ? "登录中..." : "登录"}
          </button>
        </form>

        <div className="auth-card__footer">
          <span>没有账号？</span>
          <Link to="/register">注册</Link>
        </div>
      </section>
    </div>
  );
}
