import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { login, ApiError } from "../api/api";

const Login = () => {
  const [loginInput, setLoginInput] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(loginInput, password);
      navigate("/");
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 429
          ? "Слишком много попыток — подождите минуту"
          : "Неверный логин или пароль"
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleSubmit} className="w-80 border border-ink p-8">
        <h1 className="mb-1 text-lg font-bold uppercase tracking-widest">
          Makita-Remont
        </h1>
        <p className="mb-6 text-xs font-semibold uppercase tracking-wider text-gray-500">
          Вход в админку
        </p>

        <label className="field-label" htmlFor="login">
          Логин
        </label>
        <input
          id="login"
          type="text"
          value={loginInput}
          onChange={(e) => setLoginInput(e.target.value)}
          className="field mb-4"
          autoFocus
          autoComplete="username"
        />

        <label className="field-label" htmlFor="password">
          Пароль
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="field mb-6"
          autoComplete="current-password"
        />

        {error && <p className="mb-4 text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={busy || !loginInput || !password}
          className="btn-primary w-full"
        >
          {busy ? "Проверяю…" : "Войти"}
        </button>
      </form>
    </div>
  );
};

export default Login;
