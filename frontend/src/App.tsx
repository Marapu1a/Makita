import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Header from "./components/Header";
// import Footer from "./components/Footer";
// import Sidebar from "./components/Sidebar";
import CategorySearch from "./components/CategorySearch";
import Catalog from "./pages/Catalog";
import CategoryGrid from "./components/CategoryGrid";
import UnifiedModelDetails from "./pages/UnifiedModelDetails";
import "./index.css";

const categories = [];

export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        {/* Хедер */}
        <Header />

        {/* Основной контент */}
        <div className="flex flex-grow">
          {/* Сайдбар */}
          {/* <Sidebar /> */}

          {/* Контентная часть */}
          <div className="flex-grow p-4">
            {/* Поиск */}
            <CategorySearch categories={categories} />

            {/* Роуты */}
            <Routes>
              <Route path="/" element={<Catalog />} /> {/* Главная — каталог */}
              <Route
                path="/categories/:categoryId"
                element={<CategoryGrid />}
              />
              <Route path="/model/:modelId" element={<UnifiedModelDetails />} />
            </Routes>
          </div>
        </div>

        {/* Футер */}
        {/* <Footer /> */}
      </div>
    </Router>
  );
}
