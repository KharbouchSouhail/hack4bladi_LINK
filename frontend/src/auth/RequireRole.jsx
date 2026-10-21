import { Navigate } from "react-router-dom";
import { getSession, HOME_BY_ROLE } from "./auth.js";

export default function RequireRole({ role, children }) {
  const session = getSession();

  if (!session) {
    return <Navigate to="/login" replace />;
  } else if (session.role !== role) {
    return <Navigate to={HOME_BY_ROLE[session.role]} replace />;
  } else {
    return children;
  }
}
