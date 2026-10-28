import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AuthContext = createContext();

const SESSION_EXPIRED_MESSAGE = 'Session expired. Please log in again.';

const clearStoredSession = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('restaurant');
  delete axios.defaults.headers.common['Authorization'];
};

// Axios may store the header as "Authorization" or "authorization" (AxiosHeaders), so check all forms.
const hasStaffAuthHeader = (config) => {
  const headers = config?.headers;
  if (!headers) return false;
  const value = headers.Authorization
    || headers.authorization
    || (typeof headers.get === 'function' && headers.get('authorization'));
  return Boolean(value);
};

// True when the server says the staff login itself is no longer valid:
// any 401, or a 403 for a deactivated account / inactive restaurant.
// A plain 403 such as "Admin access required" is a permission error, not a dead session.
const isDeadSession = (err) => {
  const status = err.response?.status;
  return status === 401 || (status === 403 && err.response?.data?.code === 'SESSION_INVALID');
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

  // Log out, tell the user why, and send them to the login page.
  const expireSession = useCallback(() => {
    logout();
    toast.error(SESSION_EXPIRED_MESSAGE, { id: 'session-expired' });
    if (!window.location.pathname.startsWith('/login')) window.location.assign('/login');
  }, [logout]);

  // Registered before the startup check below: Axios attaches interceptors when a request
  // starts, so this must exist before /api/auth/me is sent.
  // Whenever a staff request is rejected because the login is no longer valid, log out
  // instead of leaving a dashboard on screen whose buttons all fail ("ghost UI").
  useEffect(() => {
    const id = axios.interceptors.response.use(
      res => res,
      err => {
        const isLogin = err.config?.url?.includes('/api/auth/login');
        if (isDeadSession(err) && hasStaffAuthHeader(err.config) && !isLogin && localStorage.getItem('token')) {
          expireSession();
        }
        return Promise.reject(err);
      }
    );
    return () => axios.interceptors.response.eject(id);
  }, [expireSession]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    const savedRestaurant = localStorage.getItem('restaurant');
    if (token && savedUser) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(JSON.parse(savedUser));
      if (savedRestaurant) setRestaurantState(JSON.parse(savedRestaurant));
      // Confirm the saved login is still valid and refresh restaurant details (GST rate, address…).
      axios.get('/api/auth/me')
        .then(res => {
          if (res.data?.restaurant) setRestaurant(res.data.restaurant);
        })
        .catch(err => {
          // Expired / invalid login → log out now. A network error (Wi-Fi blip, server
          // waking up) is not a reason to log the terminal out, so it is ignored.
          if (isDeadSession(err)) expireSession();
        });
    }
    setLoading(false);
  }, [setRestaurant, expireSession]);

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
