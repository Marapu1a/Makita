import { Link } from "react-router-dom";
import { ShoppingCart, Mail, Phone, User } from "lucide-react";
import { useCart } from "../utils/useCart";

const Header = () => {
  const { cartItems } = useCart();
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <header className="w-full border-b shadow-sm z-10">
      {/* Верхняя панель */}
      <div className="flex justify-between items-center px-6 py-1 text-sm bg-gray-100 text-black">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <Mail size={16} />
            <span>makita-snab@mail.ru</span>
          </div>
          <div className="flex items-center space-x-1">
            <Phone size={16} />
            <span>+7 (495) 215-02-99</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <User size={16} />
          <Link to="/login" className="hover:underline">
            Войти в личный кабинет
          </Link>
        </div>
      </div>

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
                className="hover:text-red-500 transition-all duration-100"
              >
                Инструменты makita-snab.ru
              </a>
            </nav>
          </div>

          {/* Корзина (прижата вправо) */}
          <Link
            to="/cart"
            className="flex items-center space-x-1 hover:text-red-500 transition-all duration-100 z-10 ml-auto"
          >
            <ShoppingCart size={24} />
            <span>В корзине {totalItems} т.</span>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;
