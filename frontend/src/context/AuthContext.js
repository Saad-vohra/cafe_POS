import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AuthContext = createContext();

const clearStoredSession = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('restaurant');
  delete axios.defaults.headers.common['Authorization'];
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [restaurant, setRestaurantState] = useState(null);
  const [loading, setLoading] = useState(true);

  const setRestaurant = useCallback((r) => {
    setRestaurantState(r);
    if (r) localStorage.setItem('restaurant', JSON.stringify(r));
  }, []);

  const logout = useCallback(() => {
    clearStoredSession();
    setUser(null);
    setRestaurantState(null);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    const savedRestaurant = localStorage.getItem('restaurant');
    if (token && savedUser) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(JSON.parse(savedUser));
      if (savedRestaurant) setRestaurantState(JSON.parse(savedRestaurant));
      // Refresh restaurant details (GST rate, address…) and confirm the session is still valid
      axios.get('/api/auth/me')
        .then(res => {
          if (res.data?.restaurant) setRestaurant(res.data.restaurant);
        })
        .catch(() => {});
    }
    setLoading(false);
  }, [setRestaurant]);

  // When the staff session expires, log out instead of letting every action fail silently.
  useEffect(() => {
    const id = axios.interceptors.response.use(
      res => res,
      err => {
        const status = err.response?.status;
        const isStaffRequest = Boolean(err.config?.headers?.Authorization);
        const isLogin = err.config?.url?.includes('/api/auth/login');
        if (status === 401 && isStaffRequest && !isLogin && localStorage.getItem('token')) {
          logout();
          toast.error('Your session has expired. Please log in again.', { id: 'session-expired' });
          if (!window.location.pathname.startsWith('/login')) window.location.assign('/login');
        }
        return Promise.reject(err);
      }
    );
    return () => axios.interceptors.response.eject(id);
  }, [logout]);

  const applySession = (data) => {
    const { token, user, restaurant } = data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    if (restaurant) localStorage.setItem('restaurant', JSON.stringify(restaurant));
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(user);
    setRestaurantState(restaurant || null);
    return user;
  };

  const login = async (email, password) => {
    const res = await axios.post('/api/auth/login', { email, password });
    return applySession(res.data);
  };

  return (
    <AuthContext.Provider value={{ user, restaurant, setRestaurant, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
