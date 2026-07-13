import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchModel, updateModel, ApiError } from "../api/api";
import type { ModelDetail } from "../api/api";
import PartEditor from "../components/PartEditor";
import { useToast } from "../components/Toast";

const fmtPrice = (v: number) => `${Math.round(v).toLocaleString("ru-RU")} ₽`;

interface SeoForm {
  seoTitle: string;
  seoDescription: string;
  h1: string;
  content: string;
  isIndexable: boolean;
}

const ModelPage = () => {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [model, setModel] = useState<ModelDetail | null>(null);
  const [seo, setSeo] = useState<SeoForm | null>(null);
  const [seoOpen, setSeoOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editPartId, setEditPartId] = useState<number | null>(null);

  const load = async (modelId: number) => {
    try {
      const { data } = await fetchModel(modelId);
      setModel(data);
      setSeo({
        seoTitle: data.seoTitle ?? "",
        seoDescription: data.seoDescription ?? "",
        h1: data.h1 ?? "",
        content: data.content ?? "",
        isIndexable: data.isIndexable,
      });
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 401)) toast("error", "Не удалось загрузить модель");
    }
  };

  useEffect(() => {
    if (id) load(parseInt(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSeoSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!model || !seo) return;
    setSaving(true);
    try {
      await updateModel(model.id, seo);
      toast("success", "SEO-поля сохранены");
    } catch (err) {
      toast("error", err instanceof ApiError ? err.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  if (!model || !seo) return <p className="text-sm text-gray-400">Загружаю…</p>;

  const siteUrl =
    model.category.slug && model.slug ? `https://makita-remont.ru/${model.category.slug}/${model.slug}` : null;

  return (
    <div>
      <nav className="mb-2 text-sm text-gray-500">
        <Link to="/catalog" className="hover:text-makita">
          Каталог
        </Link>
        <span className="mx-1">/</span>
        {model.category.name}
      </nav>

      <div className="mb-6 flex items-start justify-between">
        <h1 className="text-2xl font-bold">{model.name}</h1>
        {siteUrl && (
          <a href={siteUrl} target="_blank" rel="noreferrer" className="btn-ghost">
            Открыть на сайте
          </a>
        )}
      </div>

      <section className="mb-8 border border-gray-200">
        <button
          onClick={() => setSeoOpen(!seoOpen)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold uppercase tracking-wider hover:bg-gray-50"
        >
          SEO-поля
          <span className="text-gray-400">{seoOpen ? "−" : "+"}</span>
        </button>

        {seoOpen && (
          <form onSubmit={handleSeoSave} className="space-y-4 border-t border-gray-200 p-4">
            <div>
              <label className="field-label">Title</label>
              <input
                type="text"
                value={seo.seoTitle}
                onChange={(e) => setSeo({ ...seo, seoTitle: e.target.value })}
                className="field"
              />
            </div>
            <div>
              <label className="field-label">Description</label>
              <textarea
                value={seo.seoDescription}
                onChange={(e) => setSeo({ ...seo, seoDescription: e.target.value })}
                className="field h-20"
              />
            </div>
            <div>
              <label className="field-label">H1</label>
              <input
                type="text"
                value={seo.h1}
                onChange={(e) => setSeo({ ...seo, h1: e.target.value })}
                className="field"
              />
            </div>
            <div>
              <label className="field-label">SEO-текст (внизу страницы)</label>
              <textarea
                value={seo.content}
                onChange={(e) => setSeo({ ...seo, content: e.target.value })}
                className="field h-40"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={seo.isIndexable}
                  onChange={(e) => setSeo({ ...seo, isIndexable: e.target.checked })}
                  className="accent-[#008290]"
                />
                Индексировать страницу
              </label>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? "Сохраняю…" : "Сохранить"}
              </button>
            </div>
          </form>
        )}
      </section>

      <section>
        <h2 className="field-label">Детали — {model.parts.length} поз.</h2>
        <table className="tbl">
          <thead>
            <tr>
              <th>№</th>
              <th>Артикул</th>
              <th>Название</th>
              <th className="text-right">Цена</th>
              <th>Наличие</th>
            </tr>
          </thead>
          <tbody>
            {model.parts.map((p) => (
              <tr
                key={`${p.number}-${p.id}`}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => setEditPartId(p.id)}
              >
                <td className="text-gray-500">{p.number}</td>
                <td className="font-semibold">{p.partNumber}</td>
                <td>{p.name || "Без названия"}</td>
                <td className="text-right whitespace-nowrap">{p.price > 0 ? fmtPrice(p.price) : "—"}</td>
                <td>
                  {p.availability ? (
                    <span className="text-makita">В наличии</span>
                  ) : (
                    <span className="text-gray-400">Нет</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {editPartId !== null && (
        <PartEditor
          partId={editPartId}
          onClose={() => setEditPartId(null)}
          onSaved={() => load(model.id)}
        />
      )}
    </div>
  );
};

export default ModelPage;
