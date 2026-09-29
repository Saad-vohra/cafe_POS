import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomer } from './CustomerContext';
import { getFoodImage } from './foodImages';
import FoodDetailModal from './FoodDetailModal';
import axios from 'axios';

const CATEGORIES = [
  { id: 'all', label: 'All Items', icon: '🍽️' },
  { id: 'Starters', label: 'Starters', icon: '🥟' },
  { id: 'Main Course', label: 'Main Course', icon: '🍛' },
  { id: 'Pizza', label: 'Pizza', icon: '🍕' },
  { id: 'Burgers', label: 'Burgers', icon: '🍔' },
  { id: 'Beverages', label: 'Beverages', icon: '🥤' },
  { id: 'Desserts', label: 'Desserts', icon: '🍰' }
];

// Fallback high quality dishes if backend menu is empty
const DEFAULT_MENU_ITEMS = [
  {
    _id: 'def_p1',
    name: 'Margherita Pizza',
    category: 'Pizza',
    price: 249,
    description: 'Classic stone-baked pizza with San Marzano tomatoes, fresh buffalo mozzarella, and aromatic basil.',
    isVegetarian: true,
    isAvailable: true
  },
  {
    _id: 'def_p2',
    name: 'Farmhouse Supreme Pizza',
    category: 'Pizza',
    price: 329,
    description: 'Crisp capsicum, sweet corn, button mushrooms, black olives, and melted double cheese.',
    isVegetarian: true,
    isAvailable: true
  },
  {
    _id: 'def_b1',
    name: 'Veg Burger',
    category: 'Burgers',
    price: 179,
    description: 'Crispy herb potato patty topped with sliced vine tomatoes, gherkins, and house special sauce.',
    isVegetarian: true,
    isAvailable: true
  },
  {
    _id: 'def_b2',
    name: 'Double Cheese Crunch Burger',
    category: 'Burgers',
    price: 229,
    description: 'Double crunchy patty layered with sharp cheddar cheese, caramelized onions, and smoky aioli.',
    isVegetarian: true,
    isAvailable: true
  },
  {
    _id: 'def_m1',
    name: 'Pasta Alfredo',
    category: 'Main Course',
    price: 229,
    description: 'Fettuccine pasta tossed in a velvety garlic and Parmesan white cream sauce, finished with parsley.',
    isVegetarian: true,
    isAvailable: true
  },
  {
    _id: 'def_m2',
    name: 'Paneer Butter Masala',
    category: 'Main Course',
    price: 289,
    description: 'Tender cottage cheese cubes simmered in a silky, mildly spiced tomato and cashew butter gravy.',
    isVegetarian: true,
    isAvailable: true
  },
  {
    _id: 'def_s1',
    name: 'Crispy Veg Spring Rolls',
    category: 'Starters',
    price: 189,
    description: 'Golden rolls packed with shredded wok-tossed cabbage, carrots, and glass noodles with sweet chili dip.',
    isVegetarian: true,
    isAvailable: true
  },
  {
    _id: 'def_s2',
    name: 'Chilli Paneer Dry',
    category: 'Starters',
    price: 249,
    description: 'Wok-tossed paneer cubes with bell peppers, spring onions, green chilies, and tangy soy glaze.',
    isVegetarian: true,
    isAvailable: true
  },
  {
    _id: 'def_bev1',
    name: 'Fresh Mint Mojito',
    category: 'Beverages',
    price: 149,
    description: 'Refreshing crushed fresh mint leaves, zesty lime wedges, sparkling soda, and cane sugar.',
    isVegetarian: true,
    isAvailable: true
  },
  {
    _id: 'def_bev2',
    name: 'Cold Coffee with Ice Cream',
    category: 'Beverages',
    price: 169,
    description: 'Rich blended espresso, chilled whole milk, topped with a luscious scoop of vanilla bean ice cream.',
    isVegetarian: true,
    isAvailable: true
  },
  {
    _id: 'def_d1',
    name: 'Sizzling Chocolate Brownie',
    category: 'Desserts',
    price: 199,
    description: 'Warm fudgy Belgian chocolate brownie served with hot chocolate fudge and vanilla ice cream.',
    isVegetarian: true,
    isAvailable: true
  },
  {
    _id: 'def_d2',
    name: 'Gulab Jamun with Rabdi',
    category: 'Desserts',
    price: 159,
    description: 'Golden fried milk dumplings steeped in saffron cardamom syrup served on chilled thickened rabdi.',
    isVegetarian: true,
    isAvailable: true
  }
];

const CustomerMenu = () => {
  const navigate = useNavigate();
  const { cart, getItemQuantity, addToCart } = useCustomer();
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVegOnly, setFilterVegOnly] = useState(false);
  const [activeModalItem, setActiveModalItem] = useState(null);

  useEffect(() => {
    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/menu');
      if (res.data && res.data.length > 0) {
        setMenuItems(res.data);
      } else {
        setMenuItems(DEFAULT_MENU_ITEMS);
      }
    } catch (err) {
      console.warn('Using default menu items:', err.message);
      setMenuItems(DEFAULT_MENU_ITEMS);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = menuItems.filter(item => {
    const matchesCategory =
      selectedCategory === 'all' ||
      (item.category && item.category.toLowerCase() === selectedCategory.toLowerCase());

    const matchesSearch =
      !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesVeg = !filterVegOnly || item.isVegetarian;

    return matchesCategory && matchesSearch && matchesVeg;
  });

  return (
    <div className="customer-page-content">
      {/* Search & Veg Filter */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <span style={{ position: 'absolute', left: 14, top: 12, fontSize: 16 }}>🔍</span>
          <input
            type="text"
            className="input-field"
            style={{ paddingLeft: 40, height: 44, fontSize: '0.92rem' }}
            placeholder="Search pizza, pasta, burger, coffee..."
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

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
            {filteredItems.length} {filteredItems.length === 1 ? 'Dish' : 'Dishes'} Available
          </span>
          <button
            onClick={() => setFilterVegOnly(!filterVegOnly)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 20,
              border: filterVegOnly ? '1.5px solid var(--primary-green)' : '1px solid #e2e8f0',
              background: filterVegOnly ? 'var(--light-green)' : '#ffffff',
              color: filterVegOnly ? 'var(--primary-green)' : '#64748b',
              fontWeight: 700,
              fontSize: '0.78rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <span style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              border: '2px solid #16a34a',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#16a34a' }}></span>
            </span>
            Pure Veg
          </button>
        </div>
      </div>

      {/* Category Pills Slider */}
      <div className="category-scroll">
        {CATEGORIES.map(cat => {
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
          Loading gourmet menu...
        </div>
      ) : filteredItems.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px 20px',
          background: '#ffffff',
          borderRadius: 18,
          border: '1px solid #f1f5f9'
        }}>
          <div style={{ fontSize: 42, marginBottom: 12 }}>🍽️</div>
          <h4 style={{ fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>No dishes found</h4>
          <p style={{ color: '#64748b', fontSize: '0.88rem', marginBottom: 16 }}>
            Try searching for something else or reset filters
          </p>
          <button
            className="btn-customer-secondary"
            onClick={() => { setSelectedCategory('all'); setSearchQuery(''); setFilterVegOnly(false); }}
            style={{ width: 'auto', padding: '8px 18px' }}
          >
            Show All Dishes
          </button>
        </div>
      ) : (
        <div className="menu-grid">
          {filteredItems.map(item => {
            const qty = getItemQuantity(item._id);
            const imageSrc = getFoodImage(item.name, item.category);

            return (
              <div
                key={item._id}
                className="food-card"
                onClick={() => setActiveModalItem(item)}
              >
                <div style={{ position: 'relative' }}>
                  <img
                    src={imageSrc}
                    alt={item.name}
                    className="food-card-img"
                    loading="lazy"
                  />
                  {/* Veg indicator badge */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 10,
                      left: 10,
                      background: 'rgba(255,255,255,0.92)',
                      backdropFilter: 'blur(4px)',
                      padding: '3px 6px',
                      borderRadius: 6,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: item.isVegetarian ? '#15803d' : '#b91c1c',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  >
                    <span style={{
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      border: `1.5px solid ${item.isVegetarian ? '#16a34a' : '#ef4444'}`,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <span style={{
                        width: 4,
                        height: 4,
                        borderRadius: '50%',
                        background: item.isVegetarian ? '#16a34a' : '#ef4444'
                      }}></span>
                    </span>
                    {item.isVegetarian ? 'VEG' : 'NON-VEG'}
                  </div>

                  {/* Quantity badge if in cart */}
                  {qty > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: 10,
                      right: 10,
                      background: 'var(--primary-green)',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '0.75rem',
                      padding: '3px 8px',
                      borderRadius: 12,
                      boxShadow: '0 2px 6px rgba(8,127,69,0.3)'
                    }}>
                      {qty} in cart
                    </div>
                  )}
                </div>

                <div className="food-card-body">
                  <div className="food-title">{item.name}</div>
                  <div className="food-desc">
                    {item.description || 'Delicious freshly prepared dish with premium restaurant ingredients.'}
                  </div>

                  <div className="food-footer">
                    <div className="food-price">₹{item.price}</div>

                    <button
                      className="btn-add-food"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveModalItem(item);
                      }}
                    >
                      {qty > 0 ? `Edit (${qty})` : '+ Add'}
                    </button>
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
};

export default CustomerMenu;
