import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { fetchPart, updatePart, ApiError } from "../api/api";
import type { PartDetail } from "../api/api";
import { useToast } from "./Toast";

interface PartEditorProps {
  partId: number;
  onClose: () => void;
  onSaved?: () => void;
}

const PartEditor = ({ partId, onClose, onSaved }: PartEditorProps) => {
  const toast = useToast();
  const [part, setPart] = useState<PartDetail | null>(null);
  const [partNumber, setPartNumber] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [availability, setAvailability] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPart(partId)
      .then(({ data }) => {
        setPart(data);
        setPartNumber(data.partNumber);
        setName(data.name ?? "");
        setPrice(String(Math.round(data.price)));
        setAvailability(data.availability);
      })
      .catch(() => {
        toast("error", "Не удалось загрузить деталь");
        onClose();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partId]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const priceNum = price.trim() === "" ? 0 : Number(price);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      toast("error", "Некорректная цена");
      return;
    }
    setSaving(true);
    try {
      await updatePart(partId, {
        partNumber: partNumber.trim(),
        name: name.trim(),
        price: priceNum,
        availability,
      });
      toast("success", `Деталь ${partNumber.trim()} сохранена`);
      onSaved?.();
      onClose();
    } catch (err) {
      toast("error", err instanceof ApiError ? err.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto border border-ink bg-paper p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {!part ? (
          <p className="text-sm text-gray-400">Загружаю…</p>
        ) : (
          <form onSubmit={handleSave}>
            <h3 className="mb-4 text-lg font-bold">Деталь {part.partNumber}</h3>

            <div className="space-y-4">
              <div>
                <label className="field-label">Артикул</label>
                <input type="text" value={partNumber} onChange={(e) => setPartNumber(e.target.value)} className="field" />
              </div>
              <div>
                <label className="field-label">Название</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="field" />
              </div>
              <div>
                <label className="field-label">Цена, ₽</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="field"
                />
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={availability}
                  onChange={(e) => setAvailability(e.target.checked)}
                  className="accent-[#008290]"
                />
                В наличии
              </label>
            </div>

            {part.usedIn.length > 0 && (
              <div className="mt-6">
                <div className="field-label">Используется в моделях</div>
                <div className="flex flex-wrap gap-1.5">
                  {part.usedIn.map((u) => (
                    <Link
                      key={u.modelId}
                      to={`/catalog/models/${u.modelId}`}
                      onClick={onClose}
                      className="border border-gray-300 px-2 py-0.5 text-xs hover:border-makita hover:text-makita"
                      title={u.category}
                    >
                      {u.modelName}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button type="submit" disabled={saving || !partNumber.trim()} className="btn-primary">
                {saving ? "Сохраняю…" : "Сохранить"}
              </button>
              <button type="button" onClick={onClose} className="btn-ghost">
                Отмена
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default PartEditor;
