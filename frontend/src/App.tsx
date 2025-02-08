import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Catalog from "./pages/Catalog";
import ModelPage from "./pages/ModelPage";
import "./index.css";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Catalog />} />
        <Route path="/model/:modelId" element={<ModelPage />} />
      </Routes>
    </Router>
  );
}

export default App;
