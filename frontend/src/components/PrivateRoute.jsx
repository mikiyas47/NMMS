import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = ({ children, role }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  
  // Allow both admin and owner roles for owner routes
  if (role === 'owner' && (user.role === 'owner' || user.role === 'admin')) {
    return children;
  }
  
  // For other specific roles, check exact match
  if (role && user.role !== role) return <Navigate to="/" replace />;
  
  return children;
};

export default PrivateRoute;
