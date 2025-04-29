import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { uploadPriceFile, updatePrices } from "../api/api"; // Импорты под твой api.ts

const Dashboard = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploaded, setIsUploaded] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleChooseFile = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    try {
      setIsUploading(true);
      await uploadPriceFile(file);
      setIsUploaded(true);
      alert("✅ Файл успешно загружен на сервер");
    } catch (error) {
      alert("❌ Ошибка при загрузке файла");
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdatePrices = async () => {
    try {
      setIsUpdating(true);
      await updatePrices();
      alert("✅ Обновление цен завершено");
    } catch (error) {
      alert("❌ Ошибка при обновлении базы");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className="flex flex-col justify-center items-center min-h-screen space-y-8 p-4">
      <h1 className="text-3xl font-bold mb-6">Админ-панель</h1>

      <div className="flex space-x-4 mb-8">
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
        <button
          onClick={async () => {
            try {
              const res = await fetch("http://localhost:5001/api/backup-db", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
              });

              const data = await res.json();
              alert(`✅ ${data.message}`);
            } catch (err) {
              alert("❌ Ошибка при создании бэкапа");
            }
          }}
          className="px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
        >
          Сделать бэкап
        </button>
      </div>

      <div className="w-full max-w-md space-y-6">
        {/* Шаг 1 */}
        <div className="flex flex-col items-center">
          <h2 className="text-xl font-semibold mb-2">
            📄 1. Выберите файл с ценами
          </h2>
          <input
            type="file"
            ref={fileInputRef}
            hidden
            onChange={(e) => {
              const selected = e.target.files?.[0];
              if (!selected) return;

              if (selected.name !== "price.xlsx") {
                alert("❌ Неверное имя файла. Ожидается: price.xlsx");
                setFile(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
                return;
              }

              setFile(selected);
              setIsUploaded(false);
            }}
          />
          <button
            type="button"
            onClick={handleChooseFile}
            disabled={isUploading || isUpdating}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400"
          >
            Выбрать файл
          </button>
          {file && (
            <p className="mt-2 text-green-600 font-medium">
              ✅ Выбран файл: {file.name}
            </p>
          )}
        </div>

        {/* Шаг 2 */}
        <div className="flex flex-col items-center">
          <h2 className="text-xl font-semibold mb-2">
            📤 2. Загрузите файл на сервер
          </h2>
          <form onSubmit={handleUpload}>
            <button
              type="submit"
              disabled={!file || isUploading || isUpdating}
              className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
            >
              {isUploading ? "Загрузка..." : "Загрузить файл"}
            </button>
          </form>
          {isUploaded && (
            <p className="mt-2 text-green-600 font-medium">
              ✅ Файл успешно загружен
            </p>
          )}
        </div>

        {/* Шаг 3 */}
        <div className="flex flex-col items-center">
          <h2 className="text-xl font-semibold mb-2">🛠 3. Обновите базу цен</h2>
          <button
            type="button"
            onClick={handleUpdatePrices}
            disabled={!isUploaded || isUploading || isUpdating}
            className="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400"
          >
            {isUpdating ? "Обновление..." : "Обновить базу"}
          </button>
        </div>
      </div>

      <button
        onClick={handleLogout}
        className="mt-8 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-700"
      >
        Выйти
      </button>
    </div>
  );
};

export default Dashboard;
