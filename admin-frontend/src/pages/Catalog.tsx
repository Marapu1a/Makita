import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  fetchCategories,
  fetchCatalogModels,
  fetchCatalogParts,
  fetchCategoryModels,
  searchCatalog,
  ApiError,
} from "../api/api";
import type {
  CatalogModelRow,
  CatalogPartRow,
  CategoryNode,
  ModelRow,
  SearchResult,
} from "../api/api";
import PartEditor from "../components/PartEditor";
import { useToast } from "../components/Toast";

const fmtPrice = (v: number) => `${Math.round(v).toLocaleString("ru-RU")} ₽`;
const LIST_SIZE = 50;

const Catalog = () => {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedView = searchParams.get("view");
  const view = requestedView === "models" || requestedView === "parts" ? requestedView : "categories";
  const listPage = Math.max(1, Number(searchParams.get("page")) || 1);
  const listSort = searchParams.get("sort") || (view === "models" ? "name" : "partNumber");
  const listOrder = searchParams.get("order") === "desc" ? "desc" : "asc";
  const priceFilter = searchParams.get("price") === "missing" ? "missing" : "";

  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [activeCategory, setActiveCategory] = useState<CategoryNode | null>(null);
  const [models, setModels] = useState<ModelRow[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [catalogModels, setCatalogModels] = useState<CatalogModelRow[]>([]);
  const [catalogParts, setCatalogParts] = useState<CatalogPartRow[]>([]);
  const [listTotal, setListTotal] = useState(0);
  const [listLoading, setListLoading] = useState(false);

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

  useEffect(() => {
    if (view === "categories") return;

    setListLoading(true);
    if (view === "models") setCatalogModels([]);
    else setCatalogParts([]);
    const request =
      view === "models"
        ? fetchCatalogModels({
            page: listPage,
            limit: LIST_SIZE,
            sort: listSort,
            order: listOrder,
          })
        : fetchCatalogParts({
            page: listPage,
            limit: LIST_SIZE,
            price: priceFilter,
            sort: listSort,
            order: listOrder,
          });

    request
      .then((res) => {
        setListTotal(res.total);
        if (view === "models") {
          setCatalogModels(res.data as CatalogModelRow[]);
        } else {
          setCatalogParts(res.data as CatalogPartRow[]);
        }
      })
      .catch((e) => {
        if (!(e instanceof ApiError && e.status === 401)) toast("error", "Не удалось загрузить список");
      })
      .finally(() => setListLoading(false));
  }, [view, listPage, listSort, listOrder, priceFilter, toast]);

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

  const updateListParams = (changes: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    setSearchParams(params);
  };

  const listPages = Math.max(1, Math.ceil(listTotal / LIST_SIZE));

  const listPager = listPages > 1 && (
    <div className="mt-4 flex items-center justify-center gap-2">
      <button
        onClick={() => updateListParams({ page: String(listPage - 1) })}
        disabled={listPage <= 1}
        className="btn-ghost px-3 py-1"
      >
        ←
      </button>
      <span className="px-2 text-sm">
        {listPage} / {listPages}
      </span>
      <button
        onClick={() => updateListParams({ page: String(listPage + 1) })}
        disabled={listPage >= listPages}
        className="btn-ghost px-3 py-1"
      >
        →
      </button>
    </div>
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
        <div>
          <div className="mb-5 flex flex-wrap gap-2">
            <Link
              to="/catalog"
              className={view === "categories" ? "btn-primary" : "btn-ghost"}
            >
              Категории
            </Link>
            <Link
              to="/catalog?view=models&sort=name&order=asc"
              className={view === "models" ? "btn-primary" : "btn-ghost"}
            >
              Все модели
            </Link>
            <Link
              to="/catalog?view=parts&sort=partNumber&order=asc"
              className={view === "parts" && !priceFilter ? "btn-primary" : "btn-ghost"}
            >
              Все детали
            </Link>
            <Link
              to="/catalog?view=parts&price=missing&sort=partNumber&order=asc"
              className={view === "parts" && priceFilter === "missing" ? "btn-primary" : "btn-ghost"}
            >
              Без цены
            </Link>
          </div>

          {view === "categories" && (
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

          {view === "models" && (
            <div>
              <div className="mb-3 flex items-end justify-between gap-4">
                <h2 className="text-lg font-bold">Все модели</h2>
                <label>
                  <span className="field-label">Сортировка</span>
                  <select
                    className="field w-48"
                    value={`${listSort}:${listOrder}`}
                    onChange={(e) => {
                      const [sort, order] = e.target.value.split(":");
                      updateListParams({ sort, order, page: null });
                    }}
                  >
                    <option value="name:asc">По названию А–Я</option>
                    <option value="name:desc">По названию Я–А</option>
                    <option value="id:desc">Сначала новые</option>
                  </select>
                </label>
              </div>
              <div className="mb-2 text-sm text-gray-500">
                Всего: <span className="font-semibold text-ink">{listTotal.toLocaleString("ru-RU")}</span>
              </div>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Модель</th>
                    <th>Категория</th>
                    <th className="text-right">Позиций</th>
                  </tr>
                </thead>
                <tbody>
                  {catalogModels.map((model) => (
                    <tr key={model.id} className="hover:bg-gray-50">
                      <td>
                        <Link to={`/catalog/models/${model.id}`} className="font-semibold hover:text-makita">
                          {model.name}
                        </Link>
                      </td>
                      <td>{model.category}</td>
                      <td className="text-right">{model.partsCount}</td>
                    </tr>
                  ))}
                  {!listLoading && catalogModels.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-gray-400">Моделей не найдено</td>
                    </tr>
                  )}
                </tbody>
              </table>
              {listPager}
            </div>
          )}

          {view === "parts" && (
            <div>
              <div className="mb-3 flex items-end justify-between gap-4">
                <h2 className="text-lg font-bold">{priceFilter === "missing" ? "Детали без цены" : "Все детали"}</h2>
                <label>
                  <span className="field-label">Сортировка</span>
                  <select
                    className="field w-52"
                    value={`${listSort}:${listOrder}`}
                    onChange={(e) => {
                      const [sort, order] = e.target.value.split(":");
                      updateListParams({ sort, order, page: null });
                    }}
                  >
                    <option value="partNumber:asc">По артикулу А–Я</option>
                    <option value="partNumber:desc">По артикулу Я–А</option>
                    <option value="name:asc">По названию А–Я</option>
                    <option value="price:asc">Сначала дешёвые</option>
                    <option value="price:desc">Сначала дорогие</option>
                  </select>
                </label>
              </div>
              <div className="mb-2 text-sm text-gray-500">
                Всего: <span className="font-semibold text-ink">{listTotal.toLocaleString("ru-RU")}</span>
              </div>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Артикул</th>
                    <th>Название</th>
                    <th className="text-right">Цена</th>
                    <th>Наличие</th>
                    <th className="text-right">Моделей</th>
                  </tr>
                </thead>
                <tbody>
                  {catalogParts.map((part) => (
                    <tr
                      key={part.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => setEditPartId(part.id)}
                    >
                      <td className="font-semibold">{part.partNumber}</td>
                      <td>{part.name || "Без названия"}</td>
                      <td className="text-right whitespace-nowrap">{part.price > 0 ? fmtPrice(part.price) : "—"}</td>
                      <td>{part.availability ? "В наличии" : "Нет"}</td>
                      <td className="text-right">{part.modelsCount}</td>
                    </tr>
                  ))}
                  {!listLoading && catalogParts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400">Деталей не найдено</td>
                    </tr>
                  )}
                </tbody>
              </table>
              {listPager}
            </div>
          )}
        </div>
      )}

      {editPartId !== null && <PartEditor partId={editPartId} onClose={() => setEditPartId(null)} />}
    </div>
  );
};

export default Catalog;
