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
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadCategories = async () => {
      const data = await fetchCategories();
      setCategories(data);
    };
    loadCategories();
  }, []);

  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = categories.filter((category) =>
        category.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setSuggestions(filtered.slice(0, 5));
    } else {
      setSuggestions([]);
    }
  }, [searchTerm, categories]);

  const handleSearch = () => {
    const matchedCategory = categories.find(
      (category) => category.name.toLowerCase() === searchTerm.toLowerCase()
    );
    if (matchedCategory) {
      navigate(`/categories/${matchedCategory.id}`);
    }
    setSuggestions([]);
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(event.target as Node)
    ) {
      setSuggestions([]);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative bg-gray-100 flex items-center" ref={dropdownRef}>
      <div className="relative w-2/3">
        <input
          type="text"
          placeholder="Поиск по категориям..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border p-2 w-full"
        />
        {suggestions.length > 0 && (
          <ul className="absolute top-full left-0 w-full bg-white border shadow-md max-h-40 overflow-auto">
            {suggestions.map((category) => (
              <li
                key={category.id}
                className="p-2 hover:bg-gray-200 cursor-pointer"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setSearchTerm(category.name);
                  setSuggestions([]);
                }}
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
