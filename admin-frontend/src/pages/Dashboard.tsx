import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col justify-center items-center h-screen space-y-6">
      <h1 className="text-2xl font-bold">Админ-панель</h1>
      <div className="flex space-x-4">
        <button
          onClick={() => navigate("/catalog")}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-700"
        >
          Каталог
        </button>
        <button
          onClick={() => navigate("/orders")}
          className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-700"
        >
          Заказы
        </button>
      </div>
      <button
        onClick={() => {
          localStorage.removeItem("token");
          navigate("/login");
        }}
        className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-700"
      >
        Выйти
      </button>
    </div>
  );
};

export default Dashboard;
