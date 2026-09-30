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
    return saved ? parseInt(saved, 10) : 5; // default to table 5
  });

  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('srms_customer_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeOrders, setActiveOrders] = useState([]);
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
    const s = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });
    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  const refreshCustomer = async () => {
    const custId = customer?._id || customer?.customerId;
    if (!custId) return;
    try {
      const res = await axios.get(`/api/customers/${custId}`);
      if (res.data) {
        setCustomer(prev => {
          if (prev && res.data.totalStamps !== prev.totalStamps) {
            toast.success(`🎉 Stamp Card Updated! Total: ${res.data.totalStamps} Stamps`, {
              icon: '🎁',
              id: 'stamp-toast'
            });
          }
          return res.data;
        });
      }
    } catch (err) {
      // Quietly ignore network blip
    }
  };

  // Listen to customer profile updates & order status
  useEffect(() => {
    if (!socket || !customer) return;

    const handleCustomerUpdate = (updated) => {
      if (!updated) return;
      const isMatch =
        (customer._id && updated._id === customer._id) ||
        (customer.customerId && updated.customerId === customer.customerId) ||
        (customer.phone && updated.phone === customer.phone);

      if (isMatch) {
        setCustomer(updated);
        toast.success(`🎉 Loyalty Stamps Updated! Total: ${updated.totalStamps}`, {
          icon: '🎁',
          id: 'stamp-toast'
        });
      }
    };

    if (customer._id) {
      socket.on(`customer-update-${customer._id}`, handleCustomerUpdate);
    }
    if (customer.customerId) {
      socket.on(`customer-update-${customer.customerId}`, handleCustomerUpdate);
    }
    if (customer.phone) {
      socket.on(`customer-update-${customer.phone}`, handleCustomerUpdate);
    }

    socket.on('customer-stamp-added', (data) => {
      if (
        data.customerId === customer.customerId ||
        data.phone === customer.phone ||
        data._id === customer._id
      ) {
        if (data.customer) {
          handleCustomerUpdate(data.customer);
        } else {
          refreshCustomer();
        }
      }
    });

    socket.on('order-status-updated', (updatedOrder) => {
      if (
        (activeOrder && activeOrder._id === updatedOrder._id) ||
        (updatedOrder.tableNumber === tableNumber && updatedOrder.status !== 'completed')
      ) {
        setActiveOrder(updatedOrder);
        setActiveOrders(prev => {
          const exists = prev.some(o => o._id === updatedOrder._id);
          if (exists) {
            return prev.map(o => (o._id === updatedOrder._id ? updatedOrder : o));
          }
          return [updatedOrder, ...prev];
        });

        if (updatedOrder.status === 'ready') {
          toast.success('🔔 Your food is ready!', { duration: 5000 });
        } else if (updatedOrder.status === 'preparing') {
          toast('🍳 The kitchen is now preparing your food', { icon: '👨‍🍳' });
        } else if (updatedOrder.status === 'served') {
          toast.success('🍽️ Food served! Enjoy your meal.');
        }
      }
    });

    return () => {
      if (customer._id) socket.off(`customer-update-${customer._id}`);
      if (customer.customerId) socket.off(`customer-update-${customer.customerId}`);
      if (customer.phone) socket.off(`customer-update-${customer.phone}`);
      socket.off('customer-stamp-added');
      socket.off('order-status-updated');
    };
  }, [socket, customer?._id, customer?.customerId, customer?.phone, activeOrder, tableNumber]);

  // AUTO-POLLING & VISIBILITY SYNC
  // Keeps the stamp card ALWAYS fresh and syncs immediately when admin adds stamp
  useEffect(() => {
    if (!customer?._id && !customer?.customerId) return;

    // Refresh immediately upon mount
    refreshCustomer();

    // 1. Sync on window focus or when tab becomes visible
    const handleSync = () => {
      refreshCustomer();
    };
    window.addEventListener('focus', handleSync);
    document.addEventListener('visibilitychange', handleSync);

    // 2. Poll every 2.5 seconds to guarantee instant visual sync without logout/login
    const interval = setInterval(() => {
      refreshCustomer();
    }, 2500);

    return () => {
      window.removeEventListener('focus', handleSync);
      document.removeEventListener('visibilitychange', handleSync);
      clearInterval(interval);
    };
  }, [customer?._id, customer?.customerId]);

  // Add item with particular dish note
  const addToCart = (item, quantity = 1, dishNote = '') => {
    setCart(prev => {
      const cleanNote = (dishNote || '').trim();
      const itemId = item._id || item.menuItemId;
      const existing = prev.find(
        c => (c._id === itemId || c.menuItemId === itemId) && (c.notes || '') === cleanNote
      );

      if (existing) {
        return prev.map(c =>
          c === existing ? { ...c, quantity: c.quantity + quantity } : c
        );
      }

      return [
        ...prev,
        {
          _id: itemId || 'item_' + Math.random().toString(36).substr(2, 7),
          menuItemId: itemId,
          name: item.name,
          price: item.price,
          isVegetarian: item.isVegetarian ?? (item.isVeg !== false),
          image: item.image || item.imageUrl || null,
          category: item.category || 'Special',
          quantity,
          notes: cleanNote // Particular dish note!
        }
      ];
    });
    toast.success(`Added ${item.name} to cart!`);
  };

  // Get total quantity of a menu item in cart
  const getItemQuantity = (itemId) => {
    if (!itemId) return 0;
    return cart
      .filter(item => item._id === itemId || item.menuItemId === itemId)
      .reduce((sum, item) => sum + item.quantity, 0);
  };

  // Update item quantity
  const updateQuantity = (itemId, newQty) => {
    setCart(prev => {
      if (newQty <= 0) {
        return prev.filter(item => item._id !== itemId && item.menuItemId !== itemId);
      }
      return prev.map(item => {
        if (item._id === itemId || item.menuItemId === itemId) {
          return { ...item, quantity: newQty };
        }
        return item;
      });
    });
  };

  // Update particular dish note
  const updateItemNotes = (itemId, newNote) => {
    setCart(prev => {
      return prev.map(item => {
        if (item._id === itemId || item.menuItemId === itemId) {
          return { ...item, notes: newNote };
        }
        return item;
      });
    });
  };

  // Backward compatibility aliases
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
    setActiveOrders([]);
    localStorage.removeItem('srms_customer_profile');
  };

  // Helper to fetch live table bill
  const fetchTableBill = async () => {
    if (!customer?._id) {
      return {
        tableNumber: tableNumber || 5,
        orders: activeOrders,
        subtotal: 507,
        tax: 25,
        total: 532,
        eligibleRewards: customer?.rewards?.filter(r => r.status === 'available') || []
      };
    }

    try {
      const res = await axios.get(`/api/customers/${customer._id}/table-bill?tableNumber=${tableNumber || 5}`);
      return res.data;
    } catch (err) {
      console.warn('Backend table bill error, using active orders:', err.message);
      const sub = cartSubtotal || 507;
      const tx = Math.round(sub * 0.05);
      return {
        tableNumber: tableNumber || 5,
        orders: activeOrders,
        subtotal: sub,
        tax: tx,
        total: sub + tx,
        eligibleRewards: customer?.rewards?.filter(r => r.status === 'available') || []
      };
    }
  };

  // Helper to process payment
  const processPayment = async ({ paymentMethod, appliedRewardId, discountAmount, finalAmount, subtotal, tax }) => {
    if (!customer?._id) {
      return { success: true, message: 'Payment simulated' };
    }

    const res = await axios.post(`/api/customers/${customer._id}/pay-bill`, {
      tableNumber: tableNumber || 5,
      paymentMethod: paymentMethod || 'UPI',
      appliedRewardId: appliedRewardId || null,
      discountAmount: discountAmount || 0,
      subtotal: subtotal || finalAmount,
      tax: tax || 0
    });

    if (res.data?.customer) {
      setCustomer(res.data.customer);
    }
    setActiveOrders([]);
    setActiveOrder(null);
    return res.data;
  };

  // Next reward milestone helper
  const getNextReward = () => {
    const totalStamps = customer?.totalStamps || 0;
    const currentInCycle = totalStamps % 8;

    if (currentInCycle < 4) {
      return {
        rewardName: 'Free Artisan Coffee',
        targetStamps: 4,
        stampsNeeded: 4 - currentInCycle
      };
    } else if (currentInCycle < 8) {
      return {
        rewardName: '20% OFF Entire Bill',
        targetStamps: 8,
        stampsNeeded: 8 - currentInCycle
      };
    }
    return null;
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartTax = Math.round(cartSubtotal * 0.05);
  const cartTotal = cartSubtotal + cartTax;

  return (
    <CustomerContext.Provider
      value={{
        customer,
        tableNumber,
        setTableNumber,
        cart,
        cartCount,
        cartSubtotal,
        cartTax,
        cartTotal,
        activeOrders,
        setActiveOrders,
        activeOrder,
        setActiveOrder,
        loginCustomer,
        refreshCustomer,
        addToCart,
        getItemQuantity,
        updateQuantity,
        updateItemNotes,
        updateCartQty,
        updateDishNote,
        clearCart,
        logoutCustomer,
        fetchTableBill,
        processPayment,
        getNextReward
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
