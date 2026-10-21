import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import RequireRole from "./auth/RequireRole.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import RoleHome from "./pages/RoleHome.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/candidate"
          element={
            <RequireRole role="candidate">
              <RoleHome />
            </RequireRole>
          }
        />
        <Route
          path="/company"
          element={
            <RequireRole role="company">
              <RoleHome />
            </RequireRole>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireRole role="admin">
              <RoleHome />
            </RequireRole>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
