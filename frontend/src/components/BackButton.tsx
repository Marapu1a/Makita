import { useNavigate, useLocation } from "react-router-dom";

interface BackButtonProps {
  className?: string;
  rootPath: string; // Путь, на котором кнопка должна становиться неактивной
}

export default function BackButton({ className, rootPath }: BackButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const isAtRoot = location.pathname === rootPath;

  return (
    <button
      className={`px-4 py-2 mx-4 rounded-sm transition-all duration-100 focus:outline-none focus:ring-2 ${
        isAtRoot
          ? "bg-gray-500 text-gray-300 cursor-not-allowed"
          : "bg-cyan-900 text-white border border-white rounded-sm hover:bg-cyan-600 focus:ring-white"
      } ${className}`}
      onClick={() => !isAtRoot && navigate("/")}
      disabled={isAtRoot}
    >
      Назад к каталогу
    </button>
  );
}
