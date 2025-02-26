import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Header from "./components/Header";
import CategoryGrid from "./components/CategoryGrid";
import { CartProvider } from "./components/CartContext";
import CatalogSite from "./pages/CatalogSite";
import Catalog from "./pages/Catalog";
import UnifiedModelDetails from "./pages/UnifiedModelDetails";

import "./index.css";

export default function App() {
  return (
    <CartProvider>
      <Router>
        <Header />
        <Routes>
          <Route path="/" element={<CatalogSite />}>
            <Route index element={<Catalog />} /> {/* Главная — каталог */}
            <Route path="categories/:categoryId" element={<CategoryGrid />} />
            <Route path="model/:modelId" element={<UnifiedModelDetails />} />
          </Route>
        </Routes>
      </Router>
    </CartProvider>
  );
}
