# 🍽️ SRMS — Smart Restaurant Management System (Single-Client Build)

A full-stack restaurant management platform built for one restaurant: tables, menu, orders,
kitchen display, billing, staff, and reports.

For step-by-step deployment instructions (Vercel + Render + MongoDB Atlas), see **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

---

## 🚀 Features

| Module | Features |
|--------|----------|
| **Authentication** | Role-based login (Admin / Waiter / Kitchen), JWT-based |
| **Admin Dashboard** | Revenue stats, table overview, order tracking, charts |
| **Table Management** | Visual layout, status tracking, add/remove tables |
| **Menu Management** | Add/edit/delete items, categories, availability toggle |
| **Digital Ordering** | Full menu with cart, item customization notes |
| **Kitchen Display** | Live order feed (per-restaurant Socket.io rooms), status flow |
| **Billing System** | Auto bill generation, GST calculation, payment modes |
| **Reports** | Daily & monthly revenue, top items, payment breakdown |
| **Staff Management** | Add/edit/deactivate staff accounts (scoped to your restaurant) |
| **Mobile friendly** | Responsive layout with a collapsible mobile nav drawer |

---

## 🛠️ Tech Stack

- **Frontend:** React.js, React Router, Recharts, Socket.io-client, React Hot Toast
- **Backend:** Node.js, Express.js, Socket.io, Mongoose
- **Database:** MongoDB (designed for MongoDB Atlas)
- **Auth:** JWT + bcryptjs

---

## 🏢 How data is scoped

This started as a multi-tenant SaaS product; it's now set up for a single restaurant, but the
data model was left as-is to avoid touching every route:

- There is exactly one `Restaurant` document, created once via the seed script below.
- Every `User`, `Table`, `MenuItem`, `Order`, and `Bill` document is still tagged with a
  `restaurantId` pointing at that one restaurant, and every API route still filters/writes using
  the logged-in user's `restaurantId`. This is invisible to the client — it's just how records
  are linked internally — but it means the codebase could be pointed at a second restaurant later
  with no schema changes.
- Public self-signup (`/register`) has been removed. There's no way for anyone to create a second
  restaurant from the UI.
- `Restaurant.active` is still there as a kill switch if you ever need to disable the account
  without deleting data.

---

## ⚙️ Local development

### Prerequisites
- Node.js v18+
- A MongoDB connection string (local `mongod`, or a free MongoDB Atlas cluster — recommended even for local dev)

### Setup

```bash
# From the srms/ folder
cp backend/.env.example backend/.env      # then edit MONGODB_URI / JWT_SECRET
cp frontend/.env.example frontend/.env    # leave as-is for local dev

npm install --prefix backend
npm install --prefix frontend

# One-time: create the restaurant + first admin user
# Edit the values at the top of backend/seed.js first (or set SEED_* env vars)
npm run seed --prefix backend

# Run both backend (port 5000) and frontend (port 3000)
npm start
```

Open `http://localhost:3000/login` and sign in with the admin email/password you set in
`backend/seed.js`.

---

## 🗂️ Project Structure

```
srms/
├── backend/
│   ├── models/          # Restaurant, User, Table, MenuItem, Order, Bill
│   ├── routes/          # auth, tables, menu, orders, bills, reports, users
│   ├── middleware/auth.js
│   ├── seed.js           # one-time setup: creates the restaurant + first admin user
│   ├── server.js
│   └── .env.example
├── frontend/
│   └── src/
│       ├── context/AuthContext.js, SocketContext.js
│       ├── pages/Login.js, admin/, waiter/, kitchen/
│       ├── components/shared/Sidebar.js
│       └── index.css
├── render.yaml          # Render blueprint for the backend
└── DEPLOYMENT.md
```

---

## 🌐 Key API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | /api/auth/login | Login |
| GET | /api/tables | Get this restaurant's tables |
| GET | /api/menu | Get this restaurant's menu |
| POST | /api/orders | Create order |
| PUT | /api/orders/:id/status | Update order status |
| POST | /api/bills | Generate bill |
| GET | /api/reports/dashboard | Dashboard stats |
| GET | /api/health | Health check (used by Render) |

---

## 🔮 Future Enhancements

- QR code table-side ordering
- Online reservations
- Inventory management
- Native mobile app (reuse the same API)

---

## 📄 License

MIT — Free to use and modify.
