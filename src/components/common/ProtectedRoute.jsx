import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";


  //Wraps routes that require an authenticated.The API must independently
 //re-check the user's role on every request.
 
export default function ProtectedRoute({ children, allowedRoles }) {
  const { currentUser, isCheckingSession } = useAuth();
  const location = useLocation();

  if (isCheckingSession) {
    return null; // avoid a flash-redirect while the session is loading
  }

  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
