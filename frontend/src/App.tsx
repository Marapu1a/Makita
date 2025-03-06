import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Header from "./components/Header";
import CategoryGrid from "./components/CategoryGrid";
import PartsIntro from "./pages/PartsIntro";
import CatalogSite from "./pages/CatalogSite";
import Catalog from "./pages/Catalog";
import CartPage from "./pages/CartPage";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import UnifiedModelDetails from "./pages/UnifiedModelDetails";
import Contacts from "./pages/Contacts";

import "./index.css";

export default function App() {
  return (
    <Router>
      <Header />
      <Routes>
        <Route path="/" element={<CatalogSite />}>
          <Route index element={<Catalog />} /> {/* Главная — каталог */}
          <Route path="categories/:categoryId" element={<CategoryGrid />} />
          <Route path="model/:modelId" element={<UnifiedModelDetails />} />
        </Route>
        <Route path="/cart" element={<CartPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/info" element={<PartsIntro />} />
        <Route path="/contacts" element={<Contacts />} />
      </Routes>
    </Router>
  );
}
