import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

const CustomerContext = createContext(null);

export function CustomerProvider({ children }) {
  const [customer, setCustomer] = useState(() => {
    try {
      const saved = localStorage.getItem('srms_customer_profile');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [tableNumber, setTableNumber] = useState(() => {
    // Check URL search param first
    const params = new URLSearchParams(window.location.search);
    const tbl = params.get('table');
    if (tbl) {
      localStorage.setItem('srms_customer_table', tbl);
      return parseInt(tbl, 10);
    }
    const saved = localStorage.getItem('srms_customer_table');
    return saved ? parseInt(saved, 10) : 5; // default to table 5 if demo
  });

  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('srms_customer_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeOrder, setActiveOrder] = useState(null);
  const [socket, setSocket] = useState(null);

  // Sync cart to localStorage
  useEffect(() => {
    localStorage.setItem('srms_customer_cart', JSON.stringify(cart));
  }, [cart]);

  // Sync customer to localStorage
  useEffect(() => {
    if (customer) {
      localStorage.setItem('srms_customer_profile', JSON.stringify(customer));
    } else {
      localStorage.removeItem('srms_customer_profile');
    }
  }, [customer]);

  // Socket connection for live updates
  useEffect(() => {
    const s = io(process.env.REACT_APP_API_URL || 'http://localhost:5000');
    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  // Listen to customer profile updates & order status
  useEffect(() => {
    if (!socket || !customer?._id) return;

    // Live update when staff scans QR and adds stamp or payments happen
    socket.on(`customer-update-${customer._id}`, (updated) => {
      setCustomer(updated);
      toast.success('🎉 Your loyalty stamps have been updated!', { icon: '🎁' });
    });

    socket.on('order-status-updated', (updatedOrder) => {
      if (
        (activeOrder && activeOrder._id === updatedOrder._id) ||
        (updatedOrder.tableNumber === tableNumber && updatedOrder.status !== 'completed')
      ) {
        setActiveOrder(updatedOrder);
        if (updatedOrder.status === 'ready') {
          toast.success('🔔 Your food is ready!', { duration: 5000 });
        } else if (updatedOrder.status === 'preparing') {
          toast('🍳 The kitchen is now preparing your food', { icon: '👨‍🍳' });
        }
      }
    });

    return () => {
      socket.off(`customer-update-${customer._id}`);
      socket.off('order-status-updated');
    };
  }, [socket, customer?._id, activeOrder, tableNumber]);

  // Load existing active order for current table
  useEffect(() => {
    if (tableNumber) {
      axios.get(`/api/orders?tableNumber=${tableNumber}&active=true`)
        .then(res => {
          if (res.data && res.data.length > 0) {
            setActiveOrder(res.data[0]);
          } else {
            setActiveOrder(null);
          }
        })
        .catch(() => {});
    }
  }, [tableNumber]);

  // Login / Session creation: Returning users enter name & phone without being blocked
  const loginCustomer = async (name, phone, tbl) => {
    try {
      const targetTable = tbl || tableNumber || 5;
      const res = await axios.post('/api/customers/session', {
        name,
        phone,
        tableNumber: targetTable
      });
      setCustomer(res.data.customer);
      setTableNumber(targetTable);
      localStorage.setItem('srms_customer_table', targetTable.toString());
      return res.data.customer;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
      throw err;
    }
  };

  const refreshCustomer = async () => {
    if (!customer?._id) return;
    try {
      const res = await axios.get(`/api/customers/${customer._id}`);
      setCustomer(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Add item with particular dish note
  const addToCart = (item, quantity = 1, dishNote = '') => {
    setCart(prev => {
      // Find item with matching id and matching notes
      const cleanNote = (dishNote || '').trim();
      const existing = prev.find(c => c.menuItemId === (item._id || item.menuItemId) && (c.notes || '') === cleanNote);

      if (existing) {
        return prev.map(c =>
          c === existing ? { ...c, quantity: c.quantity + quantity } : c
        );
      }

      return [
        ...prev,
        {
          menuItemId: item._id || item.menuItemId,
          name: item.name,
          price: item.price,
          isVeg: item.isVeg !== false,
          image: item.image || item.imageUrl || null,
          category: item.category || 'Special',
          quantity,
          notes: cleanNote // Particular dish note!
        }
      ];
    });
    toast.success(`Added ${item.name} to cart!`);
  };

  const updateCartQty = (index, delta) => {
    setCart(prev => {
      const updated = prev.map((item, i) => {
        if (i === index) {
          return { ...item, quantity: item.quantity + delta };
        }
        return item;
      });
      return updated.filter(item => item.quantity > 0);
    });
  };

  const updateDishNote = (index, note) => {
    setCart(prev => {
      return prev.map((item, i) => (i === index ? { ...item, notes: note } : item));
    });
  };

  const clearCart = () => setCart([]);

  const logoutCustomer = () => {
    setCustomer(null);
    clearCart();
    setActiveOrder(null);
    localStorage.removeItem('srms_customer_profile');
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CustomerContext.Provider
      value={{
        customer,
        tableNumber,
        setTableNumber,
        cart,
        cartCount,
        cartSubtotal,
        activeOrder,
        setActiveOrder,
        loginCustomer,
        refreshCustomer,
        addToCart,
        updateCartQty,
        updateDishNote,
        clearCart,
        logoutCustomer
      }}
    >
      {children}
    </CustomerContext.Provider>
  );
}

export function useCustomer() {
  const ctx = useContext(CustomerContext);
  if (!ctx) throw new Error('useCustomer must be used within a CustomerProvider');
  return ctx;
}
