import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchCategories, fetchModelsByCategory } from "../utils/api";

import pdfIndex from "../pdf-index.json";

type Category = {
  id: string;
  name: string;
  img?: string;
  children?: Category[];
};

type Model = {
  id: string;
  name: string;
  img: string;
};

type PdfModel = {
  name: string;
  path: string;
  category: string;
};

const sanitizeFileName = (name: string) =>
  name.replace(/\s+/g, "_").replace(/[\/\\]/g, "_");

const addImagesToCategories = (categories: Category[]): Category[] => {
  return categories.map((category) => ({
    ...category,
    img: `/images/categories/${sanitizeFileName(category.name)}.jpg`,
    children: category.children ? addImagesToCategories(category.children) : [],
  }));
};

export default function CategoryGrid() {
  const { categoryId } = useParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [models, setModels] = useState<Model[] | null>(null);
  const [pdfModels, setPdfModels] = useState<PdfModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryName, setCategoryName] = useState<string>("");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      const subCategories = await fetchCategories(categoryId || null);
      const allCategories = await fetchCategories(null);

      const found = allCategories.find(
        (cat: { id: any }) => String(cat.id) === String(categoryId)
      );
      if (found) setCategoryName(found.name);

      if (subCategories.length > 0) {
        setCategories(subCategories);
        setModels(null);
      } else {
        const modelsData = await fetchModelsByCategory(categoryId || "");
        setModels(modelsData);
        setCategories([]);
      }

      // Используем локальный импорт
      setPdfModels(pdfIndex);
      setLoading(false);
    };

    loadData();
  }, [categoryId]);

  if (loading) return <div>Загрузка...</div>;

  const filteredPdfModels = pdfModels.filter(
    (pdf) => pdf.category === categoryName
  );

  return (
    <div className="flex flex-col items-center px-4">
      {models ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 w-full max-w-screen-lg">
          {models.map((model) => (
            <Link key={model.id} to={`/model/${model.id}`}>
              <div className="bg-white p-4 rounded-md shadow-md hover:shadow-lg transition flex flex-col items-center">
                <p className="text-sm font-semibold text-center break-words line-clamp-2">
                  {model.name}
                </p>
              </div>
            </Link>
          ))}
          {filteredPdfModels.map((model) => (
            <a
              key={model.name}
              href={model.path}
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="bg-white p-4 rounded-md shadow-md hover:bg-gray-100 flex flex-col items-center">
                <p className="text-sm font-semibold text-blue-600 underline text-center break-words line-clamp-2">
                  {model.name}
                </p>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 w-full max-w-screen-lg">
          {categories.map((category) => (
            <Link key={category.id} to={`/categories/${category.id}`}>
              <div className="bg-white p-4 rounded-md shadow-md hover:shadow-lg transition flex flex-col items-center">
                <img
                  src={category.img}
                  alt={category.name}
                  loading="lazy"
                  className="h-24 sm:h-28 lg:h-32 object-contain mb-2"
                />
                <p className="text-sm font-semibold text-center break-words line-clamp-2">
                  {category.name}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
