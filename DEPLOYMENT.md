# Deployment Guide — Vercel (frontend) + Render (backend) + MongoDB Atlas (database)

This app is split into two deployable pieces:

- `backend/` → Node/Express API + Socket.io → deploy to **Render**
- `frontend/` → React static build → deploy to **Vercel**
- Database → **MongoDB Atlas** (free tier is fine to start)

---

## 1. MongoDB Atlas

1. Create a free account at https://www.mongodb.com/cloud/atlas and create a free (M0) cluster.
2. Database Access → add a database user with a username/password.
3. Network Access → add `0.0.0.0/0` (allow access from anywhere) so Render can connect.
4. Database → Connect → "Drivers" → copy the connection string, it looks like:
   ```
   mongodb+srv://<username>:<password>@<cluster>.mongodb.net/srms_saas?retryWrites=true&w=majority
   ```
   Replace `<username>` / `<password>` with the database user you created, and keep
   `srms_saas` (or any name you like) as the database name.

---

## 2. Backend on Render

You can use the included `render.yaml` blueprint, or set it up manually.

### Option A — Blueprint (recommended)
1. Push this project to a GitHub repo.
2. In Render: New → Blueprint → connect the repo → Render reads `render.yaml` automatically.
3. When prompted, fill in:
   - `MONGODB_URI` → your Atlas connection string from step 1
   - `FRONTEND_URL` → your Vercel URL (you can update this after step 3, once you have it)
   - `JWT_SECRET` is auto-generated for you

### Option B — Manual
1. New → Web Service → connect your repo.
2. **Root directory:** `backend`
3. **Build command:** `npm install`
4. **Start command:** `npm start`
5. Add environment variables (copy from `backend/.env.example`):
   - `MONGODB_URI`
   - `JWT_SECRET` (any long random string)
   - `FRONTEND_URL` (your Vercel domain, can update later)
   - `NODE_ENV=production`
6. Deploy. Once live, note your backend URL, e.g. `https://srms-backend.onrender.com`.
7. Confirm it's healthy by visiting `https://srms-backend.onrender.com/api/health`.

> **Free plan sleep:** Render's free tier puts the service to sleep after ~15 minutes without
> incoming requests (the next request then takes 30–60s). To prevent this, the backend pings its
> own `/api/health` every 10 minutes using the `RENDER_EXTERNAL_URL` that Render sets
> automatically — no setup needed; the log shows `Keep-alive: pinging …` on start.
> As a backup, add a free UptimeRobot (or cron-job.org) HTTP monitor on
> `https://<your-backend>.onrender.com/api/health` every 5 minutes; it also emails you if the
> server goes down. Free instances can still be restarted by Render at any time, and one service
> running all month uses ~744 of the 750 free hours, so keep only one free service on the account.
> On a paid plan, set `KEEP_ALIVE=false`.

---

## 3. Frontend on Vercel

1. In Vercel: New Project → import the same GitHub repo.
2. **Root directory:** `frontend`
3. Framework preset: Create React App (Vercel usually auto-detects this).
4. Environment variable:
   - `REACT_APP_API_URL` = your Render backend URL (e.g. `https://srms-backend.onrender.com`)
5. Deploy. The included `vercel.json` makes sure client-side routes (e.g. `/admin/dashboard`)
   don't 404 on refresh.
6. Once deployed, copy your Vercel URL (e.g. `https://srms.vercel.app`).

---

## 4. Connect the two

Go back to Render → your backend service → Environment → set `FRONTEND_URL` to your Vercel
URL (comma-separate multiple origins if you add a custom domain later, e.g.
`https://srms.vercel.app,https://app.yourdomain.com`). Redeploy the backend so the new CORS
setting takes effect.

> `FRONTEND_URL` is required: the backend refuses requests from any website that is not listed
> there (plus `localhost:3000` for development). If the app shows network errors after deploying,
> check that this value exactly matches the address in the browser bar (no trailing slash).

### After the first deploy

1. Log in as admin → **Settings** and enter the restaurant name, address, phone, GSTIN and GST rate.
   These are printed on every bill (GST is shown as CGST + SGST).
2. Add the tables in **Tables**. Each table's QR code must open `https://<your-frontend>/customer?table=<number>`;
   customers can only check in to tables that exist.
3. If you are upgrading an existing installation, run `npm run fix-bills --prefix backend` once to see
   bills whose stored total ignored a discount, then `node scripts/fix-discounted-bills.js --apply`
   (from `backend/`) to correct them.

### How customer payment works

Customers never pay inside the QR app. They tap **Call for Bill**; every waiter/admin screen gets an
alert and the table shows **Bill requested**. The waiter brings the bill, collects cash / UPI / card,
and generates the bill in **Billing** — that closes the order, frees the table, applies any loyalty
reward and awards the stamp.

---

## 5. Try it

1. Before first use, run `npm run seed --prefix backend` (with `MONGODB_URI` pointed at your
   production database) to create the restaurant and its first admin user — edit the values at
   the top of `backend/seed.js` first.
2. Visit your Vercel URL → `/login` → sign in with that admin account.
3. Add menu items and tables, place a test order, generate a bill.

---

## Custom domains

- **Vercel:** Project → Settings → Domains → add your domain, follow the DNS instructions.
- **Render:** Service → Settings → Custom Domains → add your API subdomain (e.g. `api.yourdomain.com`).
- Update `REACT_APP_API_URL` (Vercel) and `FRONTEND_URL` (Render) to match once domains are live.

## Selling this as a product

- `Restaurant.plan` and `Restaurant.active` in `backend/models/Restaurant.js` are there so you can
  wire up a billing provider (e.g. Stripe) and flip a restaurant to inactive if a subscription lapses —
  the `auth` middleware already blocks login for inactive restaurants.
- Because every query is scoped by `restaurantId`, you can safely onboard unlimited restaurants on
  one deployment without giving them access to each other's data.
