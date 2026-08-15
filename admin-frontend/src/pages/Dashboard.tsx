import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchPricesStatus,
  fetchSummary,
  runBackup,
  runPricesUpdate,
  uploadPriceFile,
  ApiError,
} from "../api/api";
import type { PricesStatus, Summary } from "../api/api";
import { useToast } from "../components/Toast";

const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const fmtSize = (bytes: number | null) =>
  bytes === null ? "" : `${(bytes / 1024 / 1024).toFixed(1)} МБ`;

const StatCard = ({
  label,
  value,
  to,
  accent,
}: {
  label: string;
  value: string | number;
  to: string;
  accent?: boolean;
}) => (
  <Link
    to={to}
    className="group border border-gray-200 p-4 transition-colors hover:border-makita hover:bg-makita/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-makita"
  >
    <div className={`text-2xl font-bold ${accent ? "text-makita" : ""}`}>{value}</div>
    <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-gray-500 group-hover:text-makita">
      {label}
    </div>
  </Link>
);

const formatDateParam = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const UPLOAD_META = {
  result: {
    title: "1. Основной файл — result.xlsx",
    hint: "Лист «обновление цен и наличия», колонка «цена для физлиц», обязателен",
  },
} as const;

const Dashboard = () => {
  const toast = useToast();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [prices, setPrices] = useState<PricesStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  // React 18: useRef<T | null>(null) => MutableRefObject<T | null>
  const resultRef = useRef<HTMLInputElement | null>(null);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const reload = useCallback(async () => {
    try {
      const [s, p] = await Promise.all([fetchSummary(), fetchPricesStatus()]);
      setSummary(s.data);
      setPrices(p.data);
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 401)) {
        toast("error", "Не удалось загрузить сводку");
      }
    }
  }, [toast]);

  useEffect(() => {
    reload();
  }, [reload]);

  const handleFile = async (file: File | undefined | null) => {
    if (!file) return;
    setBusy(true);
    try {
      await uploadPriceFile(file);
      toast("success", `Файл ${file.name} загружен`);
      await reload();
    } catch (e) {
      toast("error", e instanceof ApiError ? e.message : "Ошибка загрузки файла");
    } finally {
      setBusy(false);
    }
  };

  const handleRun = async () => {
    setBusy(true);
    setReport(null);
    try {
      const { report } = await runPricesUpdate();
      setReport(report);
      toast("success", "Цены обновлены");
      await reload();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Ошибка обновления";
      setReport(msg);
      toast("error", msg);
    } finally {
      setBusy(false);
    }
  };

  const handleBackup = async () => {
    setBusy(true);
    try {
      const { message } = await runBackup();
      toast("success", message);
      await reload();
    } catch (e) {
      toast("error", e instanceof ApiError ? e.message : "Ошибка бэкапа");
    } finally {
      setBusy(false);
    }
  };

  const uploadBlock = (inputRef: React.MutableRefObject<HTMLInputElement | null>) => {
    const file = prices?.files.result;
    return (
      <div className="flex items-center justify-between border border-gray-200 p-4">
        <div>
          <div className="text-sm font-semibold">{UPLOAD_META.result.title}</div>
          <div className="mt-0.5 text-xs text-gray-500">{UPLOAD_META.result.hint}</div>
          {file?.uploaded && (
            <div className="mt-1 text-xs font-semibold text-makita">
              Загружен {fmtDate(file.uploadedAt)} · {fmtSize(file.size)}
            </div>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          hidden
          accept=".xlsx"
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <button onClick={() => inputRef.current?.click()} disabled={busy} className="btn-ghost shrink-0">
          {file?.uploaded ? "Заменить" : "Загрузить"}
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-10">
      <section>
        <h1 className="mb-4 text-2xl font-bold">Дашборд</h1>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <StatCard
            label="Новые заказы"
            value={summary?.newOrders ?? "…"}
            to="/orders?status=%D0%9D%D0%BE%D0%B2%D1%8B%D0%B9"
            accent={(summary?.newOrders ?? 0) > 0}
          />
          <StatCard
            label="Заказы за 7 дней"
            value={summary?.ordersWeek ?? "…"}
            to={`/orders?from=${formatDateParam(weekAgo)}`}
          />
          <StatCard
            label="Моделей"
            value={summary?.modelsTotal?.toLocaleString("ru-RU") ?? "…"}
            to="/catalog?view=models&sort=name&order=asc"
          />
          <StatCard
            label="Деталей"
            value={summary?.partsTotal?.toLocaleString("ru-RU") ?? "…"}
            to="/catalog?view=parts&sort=partNumber&order=asc"
          />
          <StatCard
            label="Без цены"
            value={summary?.partsNoPrice?.toLocaleString("ru-RU") ?? "…"}
            to="/catalog?view=parts&price=missing&sort=partNumber&order=asc"
          />
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-lg font-bold">Обновление цен и наличия</h2>
        <p className="mb-4 text-sm text-gray-500">
          Последний прогон: <span className="font-semibold text-ink">{fmtDate(summary?.lastPriceRunAt ?? null)}</span>
        </p>
        <div className="space-y-3">
          {uploadBlock(resultRef)}
          <div className="flex items-center gap-4">
            <button
              onClick={handleRun}
              disabled={busy || !prices?.files.result.uploaded}
              className="btn-primary"
            >
              {busy ? "Работаю…" : "2. Обновить базу"}
            </button>
            {!prices?.files.result.uploaded && (
              <span className="text-sm text-gray-400">Сначала загрузите result.xlsx</span>
            )}
          </div>
          {report && (
            <pre className="whitespace-pre-wrap border border-gray-200 bg-gray-50 p-4 text-sm">{report}</pre>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-lg font-bold">Резервная копия БД</h2>
        <p className="mb-4 text-sm text-gray-500">
          Последний бэкап:{" "}
          <span className="font-semibold text-ink">
            {fmtDate(summary?.lastBackupAt ?? null)}
            {summary?.lastBackupName ? ` (${summary.lastBackupName})` : ""}
          </span>
        </p>
        <button onClick={handleBackup} disabled={busy} className="btn-ghost">
          {busy ? "Работаю…" : "Сделать бэкап"}
        </button>
      </section>
    </div>
  );
};

export default Dashboard;
