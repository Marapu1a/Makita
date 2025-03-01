import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { fetchCategories } from "../utils/api";
import Button from "./Button";

interface Category {
  id: string;
  name: string;
}

export default function SearchBar() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [suggestions, setSuggestions] = useState<Category[]>([]);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(console.error);
  }, []);

  useEffect(() => {
    setSuggestions(
      searchTerm.trim()
        ? categories
            .filter((category) =>
              category.name.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .slice(0, 5)
        : []
    );
  }, [searchTerm, categories]);

  const handleSearch = () => {
    const matchedCategory = categories.find(
      (category) => category.name.toLowerCase() === searchTerm.toLowerCase()
    );
    if (matchedCategory) navigate(`/categories/${matchedCategory.id}`);
    setSuggestions([]);
  };

  const handleSelectCategory = (category: Category) => {
    setSearchTerm(category.name);
    setSuggestions([]);
    navigate(`/categories/${category.id}`);
  };

  return (
    <div className="relative p-4 bg-gray-100 flex items-center">
      <div className="relative w-2/3">
        <input
          ref={inputRef}
          type="text"
          placeholder="Поиск по категориям..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onBlur={() => setTimeout(() => setSuggestions([]), 200)}
          className="border p-2 w-full"
        />
        {suggestions.length > 0 && (
          <ul className="absolute top-full left-0 w-full bg-white border shadow-md max-h-40 overflow-auto">
            {suggestions.map((category) => (
              <li
                key={category.id}
                className="p-2 hover:bg-gray-200 cursor-pointer"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelectCategory(category)}
              >
                {category.name}
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
