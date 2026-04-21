import { createContext, useContext, useState, useEffect } from 'react';
import client from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('authUser');
    const token  = localStorage.getItem('authToken');
    if (stored && token) {
      setUser(JSON.parse(stored));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await client.post('/login', { email, password });
    const { access_token: token, user: u } = res.data;

    if (u.role !== 'admin' && u.role !== 'owner') {
      throw new Error('Access denied. Only admins and owners can log in here.');
    }

    localStorage.setItem('authToken', token);
    localStorage.setItem('authUser', JSON.stringify(u));
    setUser(u);
    return u;
  };

  const logout = async () => {
    try { await client.post('/logout'); } catch (_) {}
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
