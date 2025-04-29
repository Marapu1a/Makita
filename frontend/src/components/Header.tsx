import { Link } from "react-router-dom";
import { ShoppingCart, Menu } from "lucide-react";
import { useCart } from "../utils/useCart";
import { useState } from "react";

const Header = () => {
  const { cartItems } = useCart();
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="border-b shadow-lg z-10">
      <div
        className="relative px-4 py-4 bg-cyan-800 text-white min-h-[100px]"
        style={{
          backgroundImage: "url('/images/header2.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center 24%",
        }}
      >
        <div className="absolute inset-0 bg-black/30" />

        <div className="relative z-10 w-full flex flex-col lg:flex-row lg:items-center lg:justify-between">
          {/* Левая часть: лого + меню */}
          <div className="flex items-center justify-between lg:justify-start lg:space-x-6 w-full lg:w-auto">
            {/* Лого */}
            <Link to="/" className="flex items-center">
              <img
                src="/images/logo.webp"
                alt="Makita Logo"
                className="h-12 object-contain mr-4"
              />
            </Link>

            {/* Бургер-кнопка (мобилка) */}
            <button
              className="lg:hidden text-white"
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              <Menu className="w-8 h-8 text-white drop-shadow-sm" size={24} />
            </button>
          </div>

          {/* Навигация */}
          <nav
            className={`${
              menuOpen ? "flex" : "hidden"
            } flex-col lg:flex lg:flex-row lg:items-center lg:space-x-4
     text-base text-white text-center mt-2 lg:mt-0
     lg:bg-transparent bg-cyan-900/90 p-4 lg:p-0 rounded-lg shadow-lg lg:shadow-none`}
          >
            {[
              { to: "/info", label: "Информация" },
              { to: "/", label: "Каталог" },
              { to: "/contacts", label: "Контакты" },
            ].map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className="py-2 px-4 hover:bg-cyan-700 rounded-lg transition-all duration-100"
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </Link>
            ))}

            <a
              href="https://makita-snab.ru/"
              target="_blank"
              rel="noopener noreferrer"
              className="group py-2 px-4 hover:bg-cyan-700 rounded-lg transition-all duration-100"
              onClick={() => setMenuOpen(false)}
            >
              <span className="group-hover:hidden">Инструменты</span>
              <span className="hidden group-hover:inline">makita-snab.ru</span>
            </a>
          </nav>

          {/* Корзина (всегда справа) */}
          <div className="mt-2 lg:mt-0 lg:ml-auto">
            <Link
              to="/cart"
              className="flex items-center space-x-2 border border-white bg-black/20 px-3 py-2 rounded hover:bg-black/30 transition"
            >
              <ShoppingCart size={20} />
              <span>В корзине {totalItems} т.</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
