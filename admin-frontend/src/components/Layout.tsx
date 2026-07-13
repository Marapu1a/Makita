import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { logout } from "../api/api";
import { useToast } from "./Toast";

const navItems = [
  { to: "/", label: "Дашборд" },
  { to: "/orders", label: "Заказы" },
  { to: "/catalog", label: "Каталог" },
];

export default function Layout() {
  const navigate = useNavigate();
  const toast = useToast();

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // даже если API недоступен — уводим на логин, кука истечёт сама
      toast("error", "API недоступен, сессия на сервере не закрыта");
    }
    navigate("/login");
  };

  return (
    <div className="min-h-screen">
      <header className="bg-makita text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-8">
            <span className="py-3 text-sm font-bold uppercase tracking-widest">
              Makita-Remont · Админка
            </span>
            <nav className="flex">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) =>
                    `px-4 py-3 text-sm font-semibold uppercase tracking-wider transition-colors ${
                      isActive
                        ? "bg-white text-makita"
                        : "text-white hover:bg-makita-dark"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <button
            onClick={handleLogout}
            className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white/80 hover:text-white"
          >
            Выйти
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
