import { useState } from "react";
import { login } from "../api/api";

const Login = () => {
  const [loginInput, setLoginInput] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    try {
      const token = await login(loginInput, password);
      localStorage.setItem("token", token); // Сохраняем токен
      window.location.href = "/dashboard"; // Редирект в админку
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      setError("Неверный логин или пароль");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-2xl font-bold">Вход в админку</h1>
      {error && <p className="text-red-500">{error}</p>}
      <input
        type="text"
        placeholder="Логин"
        value={loginInput}
        onChange={(e) => setLoginInput(e.target.value)}
        className="border p-2 mt-4"
      />
      <input
        type="password"
        placeholder="Пароль"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="border p-2 mt-2"
      />
      <button onClick={handleLogin} className="bg-blue-500 text-white p-2 mt-4">
        Войти
      </button>
    </div>
  );
};

export default Login;
