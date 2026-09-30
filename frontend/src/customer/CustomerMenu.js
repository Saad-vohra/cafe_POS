import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomer } from './CustomerContext';
import { getFoodImage } from './foodImages';
import FoodDetailModal from './FoodDetailModal';
import axios from 'axios';
import { io } from 'socket.io-client';

const DEFAULT_CATEGORIES = [
  { id: 'all', label: 'All Items', icon: '🍽️' },
  { id: 'Starters', label: 'Starters', icon: '🥟' },
  { id: 'Main Course', label: 'Main Course', icon: '🍲' },
  { id: 'Pizza', label: 'Pizza', icon: '🍕' },
  { id: 'Burgers', label: 'Burgers', icon: '🍔' },
  { id: 'Beverages', label: 'Beverages', icon: '🥤' },
  { id: 'Desserts', label: 'Desserts', icon: '🍰' }
];

export default function CustomerMenu() {
  const navigate = useNavigate();
  const { cart, getItemQuantity, addToCart, updateQuantity } = useCustomer();
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVegOnly, setFilterVegOnly] = useState(false);
  const [activeModalItem, setActiveModalItem] = useState(null);

  const fetchMenu = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/menu');
      if (res.data && res.data.length > 0) {
        setMenuItems(res.data);
      }
    } catch (err) {
      console.warn('Error fetching menu items:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await axios.get('/api/categories');
      if (res.data && res.data.length > 0) {
        const dynamicCats = [
          { id: 'all', label: 'All Items', icon: '🍽️' },
          ...res.data.map(c => ({
            id: c.name,
            label: c.name,
            icon: c.icon || '🍽️'
          }))
        ];
        setCategories(dynamicCats);
      }
    } catch (err) {
      console.warn('Error fetching categories:', err.message);
    }
  };

  useEffect(() => {
    fetchMenu();
    fetchCategories();

    const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
      transports: ['websocket', 'polling']
    });

    socket.on('menu-updated', () => fetchMenu());
    socket.on('categories-updated', () => fetchCategories());

    return () => socket.disconnect();
  }, []);

  const filteredItems = menuItems.filter(item => {
    const isVeg = item.isVegetarian ?? item.isVeg ?? true;

    const matchesCategory =
      selectedCategory === 'all' ||
      (item.category && item.category.toLowerCase() === selectedCategory.toLowerCase());

    const matchesSearch =
      !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesVeg = !filterVegOnly || isVeg;

    return matchesCategory && matchesSearch && matchesVeg;
  });

  return (
    <div className="customer-page-content">
      {/* Search Bar */}
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <span style={{ position: 'absolute', left: 14, top: 12, fontSize: 16 }}>🔍</span>
        <input
          type="text"
          className="input-field"
          style={{ paddingLeft: 40, height: 44, fontSize: '0.92rem' }}
          placeholder="Search dishes, drinks, desserts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            style={{
              position: 'absolute',
              right: 12,
              top: 10,
              background: 'none',
              border: 'none',
              fontSize: 16,
              cursor: 'pointer',
              color: '#94a3b8'
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Dishes Count & Pure Veg Filter as in Image */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
        padding: '0 2px'
      }}>
        <span style={{ fontSize: '0.95rem', color: '#475569', fontWeight: 700 }}>
          {filteredItems.length} {filteredItems.length === 1 ? 'Dish' : 'Dishes'} Available
        </span>

        <button
          onClick={() => setFilterVegOnly(!filterVegOnly)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 14px',
            borderRadius: 22,
            border: filterVegOnly ? '1.5px solid #087F45' : '1.5px solid #CBD5E1',
            background: filterVegOnly ? '#EBF7EE' : '#FFFFFF',
            color: filterVegOnly ? '#087F45' : '#475569',
            fontWeight: 800,
            fontSize: '0.82rem',
            cursor: 'pointer',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            transition: 'all 0.2s'
          }}
        >
          {/* Veg Square Dot Icon */}
          <span style={{
            width: 13,
            height: 13,
            borderRadius: 3,
            border: '2px solid #16A34A',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#FFFFFF'
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#16A34A' }}></span>
          </span>
          Pure Veg
        </button>
      </div>

      {/* Category Horizontal Pills Slider */}
      <div className="category-scroll" style={{ marginBottom: 18 }}>
        {categories.map(cat => {
          const isActive = selectedCategory.toLowerCase() === cat.id.toLowerCase();
          return (
            <div
              key={cat.id}
              className={`cat-pill ${isActive ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </div>
          );
        })}
      </div>

      {/* Menu Item Cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
          <div className="spinner" style={{
            width: 32,
            height: 32,
            border: '3px solid #e2e8f0',
            borderTop: '3px solid var(--primary-green)',
            borderRadius: '50%',
            margin: '0 auto 12px',
            animation: 'spin 0.8s linear infinite'
          }}></div>
          Loading delicious menu...
        </div>
      ) : filteredItems.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px 20px',
          background: '#ffffff',
          borderRadius: 20,
          border: '1px solid #f1f5f9'
        }}>
          <div style={{ fontSize: 42, marginBottom: 12 }}>🍽️</div>
          <h4 style={{ fontWeight: 800, color: '#1e293b', marginBottom: 6 }}>No dishes found</h4>
          <p style={{ color: '#64748b', fontSize: '0.88rem', marginBottom: 16 }}>
            Try selecting another category or turn off the Pure Veg filter.
          </p>
          <button
            className="btn-customer-secondary"
            onClick={() => { setSelectedCategory('all'); setSearchQuery(''); setFilterVegOnly(false); }}
            style={{ width: 'auto', padding: '8px 20px' }}
          >
            Show All Dishes
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filteredItems.map(item => {
            const isVeg = item.isVegetarian ?? item.isVeg ?? true;
            const qty = typeof getItemQuantity === 'function' ? getItemQuantity(item._id) : 0;
            const imageSrc = item.image || getFoodImage(item.name, item.category);

            return (
              <div
                key={item._id}
                style={{
                  display: 'flex',
                  background: '#FFFFFF',
                  borderRadius: 20,
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  padding: 12,
                  gap: 14,
                  alignItems: 'center'
                }}
                onClick={() => setActiveModalItem(item)}
              >
                {/* Image Container with floating Veg/Non-Veg Tag */}
                <div style={{ position: 'relative', width: 110, height: 110, flexShrink: 0 }}>
                  <img
                    src={imageSrc}
                    alt={item.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: 16
                    }}
                    loading="lazy"
                  />

                  {/* Veg / Non-Veg Tag Floating at top-left as shown in image */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 6,
                      left: 6,
                      background: 'rgba(255, 255, 255, 0.96)',
                      backdropFilter: 'blur(4px)',
                      padding: '2px 6px',
                      borderRadius: 6,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      boxShadow: '0 2px 5px rgba(0,0,0,0.18)',
                      border: '1px solid rgba(0,0,0,0.06)'
                    }}
                  >
                    <span style={{
                      width: 11,
                      height: 11,
                      borderRadius: 2,
                      border: `1.5px solid ${isVeg ? '#16A34A' : '#DC2626'}`,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#FFFFFF'
                    }}>
                      <span style={{
                        width: 4,
                        height: 4,
                        borderRadius: '50%',
                        background: isVeg ? '#16A34A' : '#DC2626'
                      }}></span>
                    </span>

                    <span style={{
                      fontSize: '0.62rem',
                      fontWeight: 900,
                      color: isVeg ? '#16A34A' : '#DC2626',
                      letterSpacing: '0.3px',
                      textTransform: 'uppercase'
                    }}>
                      {isVeg ? 'VEG' : 'NON-VEG'}
                    </span>
                  </div>
                </div>

                {/* Dish Info on the Right */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', gap: 6 }}>
                  <div>
                    <h3 style={{
                      fontSize: '1.05rem',
                      fontWeight: 800,
                      color: '#1E293B',
                      margin: '0 0 4px 0',
                      lineHeight: 1.25
                    }}>
                      {item.name}
                    </h3>
                    <p style={{
                      fontSize: '0.82rem',
                      color: '#64748B',
                      margin: 0,
                      lineHeight: 1.35,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {item.description || 'Delicious gourmet chef specialty dish.'}
                    </p>
                  </div>

                  {/* Price & Add Button Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <span style={{
                      fontSize: '1.18rem',
                      fontWeight: 900,
                      color: '#087F45'
                    }}>
                      ₹{item.price}
                    </span>

                    {qty > 0 ? (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          background: '#EBF7EE',
                          border: '1.5px solid #087F45',
                          borderRadius: 20,
                          padding: '4px 10px'
                        }}
                      >
                        <button
                          onClick={() => updateQuantity(item._id, qty - 1)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#087F45',
                            fontWeight: 900,
                            fontSize: '1rem',
                            cursor: 'pointer',
                            padding: '0 4px'
                          }}
                        >
                          −
                        </button>
                        <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#087F45', minWidth: 14, textAlign: 'center' }}>
                          {qty}
                        </span>
                        <button
                          onClick={() => addToCart(item, 1)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#087F45',
                            fontWeight: 900,
                            fontSize: '1rem',
                            cursor: 'pointer',
                            padding: '0 4px'
                          }}
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(item, 1);
                        }}
                        style={{
                          background: '#EBF7EE',
                          border: '1.5px solid #86EFAC',
                          color: '#087F45',
                          borderRadius: 20,
                          padding: '6px 18px',
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          transition: 'all 0.2s'
                        }}
                      >
                        + Add
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal for viewing details and adding note per dish */}
      <FoodDetailModal
        item={activeModalItem}
        onClose={() => setActiveModalItem(null)}
      />
    </div>
  );
}
