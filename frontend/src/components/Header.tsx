import { Link } from "react-router-dom";
import { ShoppingCart, Mail, Phone, User } from "lucide-react";
import { useCart } from "../utils/useCart";

const Header = () => {
  const { cartItems } = useCart();
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <header className="w-full border-b shadow-sm z-10">
      {/* Верхняя панель */}
      <div className="flex justify-between items-center px-4 py-1 text-sm bg-gray-100">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <Mail size={16} />
            <span>zakaz@servismakita.ru</span>
          </div>
          <div className="flex items-center space-x-1">
            <Phone size={16} />
            <span>+7 (495) 530-70-07</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <User size={16} />
          <Link to="/login" className="hover:underline">
            Войти в личный кабинет
          </Link>
        </div>
      </div>

      {/* Основной хедер */}
      <div className="flex justify-between items-center px-4 py-3 bg-white">
        {/* Логотип */}
        <Link to="/" className="text-2xl font-bold text-red-600">
          Makita
        </Link>

        {/* Навигация */}
        <nav className="flex space-x-6 text-lg">
          <Link to="/" className="hover:text-red-600">
            Каталог
          </Link>
          <Link to="/contacts" className="hover:text-red-600">
            Контакты
          </Link>
          <a
            href="https://makita-remont.ru"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-red-600"
          >
            Инструменты makita-remont.ru
          </a>
        </nav>

        {/* Корзина */}
        <Link
          to="/cart"
          className="flex items-center space-x-1 hover:text-red-600"
        >
          <ShoppingCart size={24} />
          <span>В корзине {totalItems} т.</span>
        </Link>
      </div>
    </header>
  );
};

export default Header;
