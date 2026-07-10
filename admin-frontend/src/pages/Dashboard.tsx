import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { uploadPriceFile, updatePrices } from "../api/api";

type Kind = "result" | "site";

const FILE_NAMES: Record<Kind, string> = {
  result: "result.xlsx",
  site: "makita_site_update.xlsx",
};

const Dashboard = () => {
  const navigate = useNavigate();
  const resultInputRef = useRef<HTMLInputElement | null>(null);
  const siteInputRef = useRef<HTMLInputElement | null>(null);

  const [uploaded, setUploaded] = useState<Record<Kind, boolean>>({
    result: false,
    site: false,
  });
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<string | null>(null);

  const handleFile = async (kind: Kind, file: File | undefined | null) => {
    if (!file) return;
    if (file.name !== FILE_NAMES[kind]) {
      alert(`❌ Неверное имя файла. Ожидается: ${FILE_NAMES[kind]}`);
      return;
    }
    try {
      setBusy(true);
      await uploadPriceFile(file, kind);
      setUploaded((prev) => ({ ...prev, [kind]: true }));
    } catch {
      alert("❌ Ошибка при загрузке файла");
    } finally {
      setBusy(false);
    }
  };

  const handleUpdatePrices = async () => {
    try {
      setBusy(true);
      setReport(null);
      const data = await updatePrices();
      setReport(data.report || data.message);
      // после прогона файлы на сервере уезжают в backups — сбрасываем статусы
      setUploaded({ result: false, site: false });
    } catch (error: unknown) {
      const err = error as { message?: string; report?: string };
      setReport(`ОШИБКА: ${err.message || "неизвестная"}\n${err.report || ""}`);
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const uploadBlock = (
    kind: Kind,
    title: string,
    hint: string,
    // React 18: useRef<T | null>(null) => MutableRefObject<T | null>
    inputRef: React.MutableRefObject<HTMLInputElement | null>
  ) => (
    <div className="flex flex-col items-center border rounded-lg p-4 bg-white shadow-sm w-full">
      <h2 className="text-lg font-semibold mb-1">{title}</h2>
      <p className="text-sm text-gray-500 mb-3">{hint}</p>
      <input
        type="file"
        ref={inputRef}
        hidden
        accept=".xlsx"
        onChange={(e) => {
          handleFile(kind, e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400"
      >
        Выбрать и загрузить {FILE_NAMES[kind]}
      </button>
      {uploaded[kind] && (
        <p className="mt-2 text-green-600 font-medium">✅ Загружен</p>
      )}
    </div>
  );

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
              const res = await fetch(
                `${import.meta.env.VITE_API_URL}/api/backup-db`,
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                  },
                }
              );
              const data = await res.json();
              alert(`✅ ${data.message}`);
            } catch {
              alert("❌ Ошибка при создании бэкапа");
            }
          }}
          className="px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
        >
          Сделать бэкап
        </button>
      </div>

      <div className="w-full max-w-xl space-y-4">
        <h2 className="text-xl font-semibold text-center">
          🛠 Обновление цен и наличия
        </h2>

        {uploadBlock(
          "result",
          "1. Основной файл",
          "result.xlsx — лист «обновление цен и наличия» (обязателен)",
          resultInputRef
        )}

        {uploadBlock(
          "site",
          "2. Выгрузка центрального сайта",
          "makita_site_update.xlsx — применяется поверх (необязателен)",
          siteInputRef
        )}

        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={handleUpdatePrices}
            disabled={!uploaded.result || busy}
            className="px-8 py-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 font-semibold"
          >
            {busy ? "Работаю..." : "3. Обновить базу"}
          </button>
          {!uploaded.result && (
            <p className="mt-1 text-sm text-gray-400">
              Сначала загрузите result.xlsx
            </p>
          )}
        </div>

        {report && (
          <pre className="bg-gray-900 text-green-300 text-sm rounded-lg p-4 whitespace-pre-wrap w-full">
            {report}
          </pre>
        )}
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
