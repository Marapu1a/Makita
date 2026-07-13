import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchCategories,
  fetchCategoryModels,
  searchCatalog,
  ApiError,
} from "../api/api";
import type { CategoryNode, ModelRow, SearchResult } from "../api/api";
import PartEditor from "../components/PartEditor";
import { useToast } from "../components/Toast";

const fmtPrice = (v: number) => `${Math.round(v).toLocaleString("ru-RU")} ₽`;

const Catalog = () => {
  const toast = useToast();
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [activeCategory, setActiveCategory] = useState<CategoryNode | null>(null);
  const [models, setModels] = useState<ModelRow[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [editPartId, setEditPartId] = useState<number | null>(null);

  useEffect(() => {
    fetchCategories()
      .then((res) => setCategories(res.data))
      .catch((e) => {
        if (!(e instanceof ApiError && e.status === 401)) toast("error", "Не удалось загрузить категории");
      });
  }, [toast]);

  // поиск с дебаунсом
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await searchCatalog(q);
        setResults(res.data);
      } catch {
        setResults(null);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const openCategory = async (cat: CategoryNode) => {
    setActiveCategory(cat);
    setModels([]);
    setModelsLoading(true);
    try {
      const res = await fetchCategoryModels(cat.id);
      setModels(res.data);
    } catch {
      toast("error", "Не удалось загрузить модели");
    } finally {
      setModelsLoading(false);
    }
  };

  // категории у нас плоские (parent_id не используется), сортируем по имени
  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.name.localeCompare(b.name, "ru")),
    [categories]
  );

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Каталог</h1>

      <div className="mb-8">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск: артикул, название детали или модель…"
          className="field max-w-xl text-base"
          autoFocus
        />

        {query.trim().length >= 2 && (
          <div className="mt-4 max-w-3xl space-y-6">
            {searching && <p className="text-sm text-gray-400">Ищу…</p>}

            {results && results.models.length > 0 && (
              <div>
                <h2 className="field-label">Модели</h2>
                <div className="flex flex-wrap gap-2">
                  {results.models.map((m) => (
                    <Link
                      key={m.id}
                      to={`/catalog/models/${m.id}`}
                      className="border border-gray-300 px-3 py-2 text-sm hover:border-makita hover:text-makita"
                    >
                      <span className="font-semibold">{m.name}</span>
                      <span className="ml-2 text-xs text-gray-400">{m.category}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {results && results.parts.length > 0 && (
              <div>
                <h2 className="field-label">Детали</h2>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Артикул</th>
                      <th>Название</th>
                      <th className="text-right">Цена</th>
                      <th>Наличие</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.parts.map((p) => (
                      <tr
                        key={p.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => setEditPartId(p.id)}
                      >
                        <td className="font-semibold">{p.partNumber}</td>
                        <td>{p.name || "Без названия"}</td>
                        <td className="text-right whitespace-nowrap">{p.price > 0 ? fmtPrice(p.price) : "—"}</td>
                        <td>{p.availability ? "В наличии" : "Нет"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {results && !searching && results.models.length === 0 && results.parts.length === 0 && (
              <p className="text-sm text-gray-400">Ничего не найдено</p>
            )}
          </div>
        )}
      </div>

      {query.trim().length < 2 && (
        <div className="flex items-start gap-8">
          <div className="w-72 shrink-0">
            <h2 className="field-label">Категории</h2>
            <ul className="border-t border-gray-200">
              {sortedCategories.map((cat) => (
                <li key={cat.id}>
                  <button
                    onClick={() => openCategory(cat)}
                    className={`flex w-full items-center justify-between border-b border-gray-200 px-2 py-1.5 text-left text-sm transition-colors ${
                      activeCategory?.id === cat.id ? "bg-makita text-white" : "hover:bg-gray-50"
                    }`}
                  >
                    <span>{cat.name}</span>
                    <span className={activeCategory?.id === cat.id ? "text-white/70" : "text-gray-400"}>
                      {cat.modelsCount}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="min-w-0 flex-1">
            {activeCategory && (
              <>
                <h2 className="field-label">{activeCategory.name}</h2>
                {modelsLoading && <p className="text-sm text-gray-400">Загружаю…</p>}
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
                  {models.map((m) => (
                    <Link
                      key={m.id}
                      to={`/catalog/models/${m.id}`}
                      className="border border-gray-300 px-3 py-2 hover:border-makita hover:text-makita"
                    >
                      <div className="text-sm font-semibold">{m.name}</div>
                      <div className="text-xs text-gray-400">{m.partsCount} поз.</div>
                    </Link>
                  ))}
                </div>
              </>
            )}
            {!activeCategory && (
              <p className="pt-6 text-sm text-gray-400">
                Выберите категорию слева или воспользуйтесь поиском
              </p>
            )}
          </div>
        </div>
      )}

      {editPartId !== null && <PartEditor partId={editPartId} onClose={() => setEditPartId(null)} />}
    </div>
  );
};

export default Catalog;
