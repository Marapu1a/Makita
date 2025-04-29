import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { fetchCategories, fetchModelsByCategory } from "../utils/api";
import Button from "./Button";

interface Category {
  id: string;
  name: string;
}

interface Model {
  id: string;
  name: string;
  category_id: string;
  category_name: string;
}

export default function SearchBar() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [suggestions, setSuggestions] = useState<Record<string, Model[]>>({});
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadModels = async () => {
      try {
        const fetchedCategories = await fetchCategories();
        setCategories(fetchedCategories);

        const allModels: Model[] = [];
        for (const cat of fetchedCategories) {
          const catModels = await fetchModelsByCategory(cat.id);
          const prepared = catModels.map((m: any) => ({
            id: m.id,
            name: m.name,
            category_id: cat.id,
            category_name: cat.name,
          }));
          allModels.push(...prepared);
        }

        setModels(allModels);
      } catch (error) {
        console.error("Ошибка загрузки моделей:", error);
      }
    };

    loadModels();
  }, []);

  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = models.filter((model) =>
        model.name.toLowerCase().includes(searchTerm.toLowerCase())
      );

      const grouped = filtered.reduce<Record<string, Model[]>>((acc, model) => {
        if (!acc[model.category_name]) acc[model.category_name] = [];
        if (acc[model.category_name].length < 10) {
          acc[model.category_name].push(model);
        }
        return acc;
      }, {});

      setSuggestions(grouped);
    } else {
      setSuggestions({});
    }
  }, [searchTerm, models]);

  const handleSearch = () => {
    const matchedModel = models.find(
      (model) => model.name.toLowerCase() === searchTerm.toLowerCase()
    );
    if (matchedModel) {
      navigate(`/model/${matchedModel.id}`);
    }
    setSuggestions({});
  };

  const handleSelectModel = (model: Model) => {
    setSearchTerm(model.name);
    setSuggestions({});
    navigate(`/model/${model.id}`);
  };

  return (
    <div className="relative p-4 bg-cyan-800 flex items-center">
      <div className="relative w-2/3">
        <input
          ref={inputRef}
          type="text"
          placeholder="Поиск по моделям..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onBlur={() => setTimeout(() => setSuggestions({}), 200)}
          className="p-2 w-full bg-cyan-900 text-white border border-white rounded-sm focus:border-white transition-all duration-100 ease-in-out"
        />
        {Object.keys(suggestions).length > 0 && (
          <ul className="absolute top-full left-0 w-full bg-cyan-800 border border-white shadow-lg max-h-60 overflow-auto rounded-sm">
            {Object.entries(suggestions).map(([categoryName, models]) => (
              <li key={categoryName}>
                <div className="px-3 py-1 text-xs text-gray-300 uppercase bg-cyan-700">
                  {categoryName}
                </div>
                {models.map((model) => (
                  <div
                    key={model.id}
                    className="p-2 hover:bg-cyan-900 hover:text-white cursor-pointer transition-all duration-100 text-sm"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelectModel(model)}
                  >
                    {model.name}
                  </div>
                ))}
              </li>
            ))}
          </ul>
        )}
      </div>
      <Button className="ml-2" onClick={handleSearch}>
        Найти
      </Button>
    </div>
  );
}
