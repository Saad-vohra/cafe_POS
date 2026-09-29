import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export function SocketProvider({ children, role }) {
  const [socket, setSocket] = useState(null);
  const { restaurant } = useAuth();

  useEffect(() => {
    const s = io(process.env.REACT_APP_API_URL || 'http://localhost:5000');
    setSocket(s);

    s.on('connect', () => {
      if (restaurant?.id) {
        s.emit('join-restaurant', restaurant.id);
        if (role === 'kitchen') s.emit('join-kitchen', restaurant.id);
      }
    });

    return () => s.disconnect();
  }, [role, restaurant]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
