import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    const savedRestaurant = localStorage.getItem('restaurant');
    if (token && savedUser) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(JSON.parse(savedUser));
      if (savedRestaurant) setRestaurant(JSON.parse(savedRestaurant));
    }
    setLoading(false);
  }, []);

  const applySession = (data) => {
    const { token, user, restaurant } = data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    if (restaurant) localStorage.setItem('restaurant', JSON.stringify(restaurant));
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(user);
    setRestaurant(restaurant || null);
    return user;
  };

  const login = async (email, password) => {
    const res = await axios.post('/api/auth/login', { email, password });
    return applySession(res.data);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('restaurant');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setRestaurant(null);
  };

  return (
    <AuthContext.Provider value={{ user, restaurant, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
