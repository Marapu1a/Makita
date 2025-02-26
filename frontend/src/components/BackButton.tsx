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
      className={`px-4 py-2 rounded ${
        isAtRoot ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500 text-white"
      } ${className}`}
      onClick={() => !isAtRoot && navigate(-1)}
      disabled={isAtRoot}
    >
      Назад
    </button>
  );
}
