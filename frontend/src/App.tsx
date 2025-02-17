import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Catalog from "./pages/Catalog";
import CategoryGrid from "./components/CategoryGrid";
import ModelDetails from "./pages/ModelDetails";
import "./index.css";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Catalog />} />
        <Route path="/categories/:categoryId" element={<CategoryGrid />} />
        <Route path="/model/:modelId" element={<ModelDetails />} />
      </Routes>
    </Router>
  );
}

export default App;
