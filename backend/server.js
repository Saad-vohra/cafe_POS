// Day boundaries for reports and bill filters follow the restaurant's local time,
// not the hosting server's clock (Render runs in UTC).
process.env.TZ = process.env.TZ || 'Asia/Kolkata';

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { resolveStaff, resolveCustomer } = require('./middleware/auth');
const { staffRoom, tableRoom, customerRoom } = require('./utils/realtime');

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not set.');
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 32) {
  console.warn('WARNING: JWT_SECRET is shorter than 32 characters. Use a long random value in production.');
}
if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is not set.');
  process.exit(1);
}

const app = express();
const server = http.createServer(app);

// Render / Vercel sit behind a proxy: needed so req.ip is the real client for rate limiting.
app.set('trust proxy', 1);

const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  ...(process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',').map(o => o.trim().replace(/\/$/, '')) : [])
].filter(Boolean);

const corsOriginHandler = (origin, callback) => {
  // Requests without an Origin header (curl, server-to-server, same-origin) are allowed.
  if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
  return callback(new Error(`Origin ${origin} is not allowed`));
};

const corsOptions = {
  origin: corsOriginHandler,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
};

const io = new Server(server, { cors: corsOptions });

app.use(cors(corsOptions));
app.use(express.json({ limit: '200kb' }));

app.set('io', io);

app.get('/api/health', (req, res) => res.json({
  status: 'ok',
  db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  time: new Date().toISOString()
}));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/restaurant', require('./routes/restaurant'));
app.use('/api/tables', require('./routes/tables'));
app.use('/api/menu', require('./routes/menu'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/bills', require('./routes/bills'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/users', require('./routes/users'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/loyalty-settings', require('./routes/loyaltySettings'));
app.use('/api/categories', require('./routes/categories'));

app.use((err, req, res, next) => {
  if (err && err.message && err.message.startsWith('Origin ')) {
    return res.status(403).json({ message: 'Origin not allowed' });
  }
  console.error(err);
  res.status(500).json({ message: 'Something went wrong' });
});

// Socket.io — the server decides which rooms a connection joins, based on the
// token it presents. Anonymous sockets only receive public events (menu changes).
io.use(async (socket, next) => {
  const { token, customerToken } = socket.handshake.auth || {};
  const staff = await resolveStaff(token);
  if (staff) {
    socket.data.restaurantId = staff.user.restaurantId.toString();
    socket.data.role = staff.user.role;
    return next();
  }
  const session = await resolveCustomer(customerToken);
  if (session) {
    socket.data.customerId = session.customer._id.toString();
    socket.data.restaurantId = session.restaurantId;
    socket.data.tableNumber = session.tableNumber;
  }
  next();
});

io.on('connection', (socket) => {
  const { restaurantId, role, customerId, tableNumber } = socket.data;
  if (role) {
    socket.join(staffRoom(restaurantId));
  } else if (customerId) {
    socket.join(customerRoom(customerId));
    if (tableNumber) socket.join(tableRoom(restaurantId, tableNumber));
  }
});

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });
