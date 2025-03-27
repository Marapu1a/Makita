import { useNavigate, useLocation } from "react-router-dom";

export default function BackButton() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleClick = () => {
    if (location.pathname === "/catalog") {
      navigate("/dashboard");
    } else {
      navigate("/catalog");
    }
  };

  return (
    <button
      className="px-4 py-2 transition-all duration-100 focus:outline-none focus:ring-2 bg-cyan-900 text-white border
       border-white rounded-sm hover:bg-cyan-600 focus:ring-white"
      onClick={handleClick}
    >
      Назад
    </button>
  );
}
