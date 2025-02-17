import { useState, useEffect } from "react";
import CategoryGrid from "../components/CategoryGrid";
import { fetchCategories } from "../utils/api";

type Category = {
  id: string;
  name: string;
  img: string;
};

export default function Catalog() {
  const [categoriesWithImages, setCategoriesWithImages] = useState<Category[]>(
    []
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCategories = async () => {
      const data = await fetchCategories();
      setCategoriesWithImages(data);
      setLoading(false);
    };

    loadCategories();
  }, []);

  if (loading) return <p className="text-center py-6">Загрузка...</p>;

  return (
    <div className="container mx-auto flex gap-6 py-6">
      <CategoryGrid />
    </div>
  );
}
