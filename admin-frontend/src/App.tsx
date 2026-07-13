import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import { ToastProvider } from "./components/Toast";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import OrdersPage from "./pages/OrdersPage";
import Catalog from "./pages/Catalog";
import ModelPage from "./pages/ModelPage";

// Гвард как таковой не нужен: каждая страница сразу дергает API,
// клиент на 401 уводит на /login (см. api.ts)
const App = () => (
  <ToastProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/catalog/models/:id" element={<ModelPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  </ToastProvider>
);

export default App;
