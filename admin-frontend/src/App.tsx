import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Catalog from "./pages/Catalog";
import OrdersPage from "./pages/OrdersPage";

// Функция проверки токена
const isAuthenticated = () => !!localStorage.getItem("token");

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={isAuthenticated() ? <Dashboard /> : <Navigate to="/login" />}
        />
        <Route
          path="/catalog/:categoryId?"
          element={isAuthenticated() ? <Catalog /> : <Navigate to="/login" />}
        />
        <Route
          path="/orders"
          element={
            isAuthenticated() ? <OrdersPage /> : <Navigate to="/login" />
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  );
};

export default App;
