import { Link } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { useCart } from "../utils/useCart";

const Header = () => {
  const { cartItems } = useCart();
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <header className="w-full border-b shadow-sm z-10">
      {/* Основной хедер с фоном */}
      <div
        className="relative flex items-center px-6 py-4 bg-cyan-800 text-white min-h-[120px]"
        style={{
          backgroundImage: "url('/images/header2.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center 24%",
        }}
      >
        {/* Тёмный слой для контраста */}
        <div className="absolute inset-0 bg-black/30"></div>

        {/* Контент */}
        <div className="relative flex items-center w-full">
          {/* Логотип + Навигация */}
          <div className="flex items-center">
            {/* Логотип */}
            <Link to="/" className="flex items-center">
              <img
                src="/images/logo.webp"
                alt="Makita Logo"
                className="h-12 object-contain"
              />
            </Link>

            {/* Навигация (прижата к логотипу) */}
            <nav className="flex space-x-4 text-lg z-10 ml-6">
              <Link
                to={"/info"}
                className="hover:text-red-500 transition-all duration-100"
              >
                Информация
              </Link>

              <Link
                to="/"
                className="hover:text-red-500 transition-all duration-100"
              >
                Каталог
              </Link>
              <Link
                to="/contacts"
                className="hover:text-red-500 transition-all duration-100"
              >
                Контакты
              </Link>
              <a
                href="https://makita-snab.ru/"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative hover:text-red-500 transition-all duration-100"
              >
                <span className="group-hover:hidden">Инструменты</span>
                <span className="hidden group-hover:inline">
                  makita-snab.ru
                </span>
              </a>
            </nav>
          </div>

          <Link to="/cart" className="cart-button">
            <ShoppingCart size={24} />
            <span>В корзине {totalItems} т.</span>
            <span className="cart-glow"></span>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;
