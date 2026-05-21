import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = ({ children, role }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  
  // Check if user has the required role
  if (role && user.role !== role) {
    // Redirect to their appropriate dashboard
    if (user.role === 'owner') return <Navigate to="/owner" replace />;
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

export default PrivateRoute;
