import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";

type Category = {
  id: string;
  name: string;
};

type CategorySearchProps = {
  categories: Category[];
};

export default function CategorySearch({ categories }: CategorySearchProps) {
  const [query, setQuery] = useState("");
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (query.length > 0) {
      const filtered = categories.filter((cat) =>
        cat.name.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredCategories(filtered);
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  }, [query, categories]);

  const handleSelect = (categoryId: string) => {
    navigate(`/categories/${categoryId}`);
    setQuery("");
    setShowDropdown(false);
  };

  return (
    <div className="relative w-full max-w-lg mx-auto">
      <div className="flex items-center border rounded-md px-3 py-2 shadow-md">
        <Search size={20} className="mr-2 text-gray-500" />
        <input
          type="text"
          className="w-full outline-none"
          placeholder="Поиск по категориям..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {showDropdown && (
        <ul className="absolute z-10 w-full bg-white border rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
          {filteredCategories.length > 0 ? (
            filteredCategories.map((cat) => (
              <li
                key={cat.id}
                className="p-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => handleSelect(cat.id)}
              >
                {cat.name}
              </li>
            ))
          ) : (
            <li className="p-2 text-gray-500">Ничего не найдено</li>
          )}
        </ul>
      )}
    </div>
  );
}
