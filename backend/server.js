const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Allow a comma-separated list of frontend origins (e.g. your Vercel domain + custom domains)
const allowedOrigins = (process.env.FRONTEND_URL || '*')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const corsOptions = {
  origin: allowedOrigins.includes('*') ? '*' : allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
};

const io = new Server(server, { cors: corsOptions });

//app.use(cors(corsOptions));
app.use(cors({
 origin: process.env.FRONTEND_URL,
 credentials:true
}));
app.use(express.json());

app.set('io', io);

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tables', require('./routes/tables'));
app.use('/api/menu', require('./routes/menu'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/bills', require('./routes/bills'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/users', require('./routes/users'));

// Socket.io — rooms are scoped per-restaurant so tenants never see each other's events
io.on('connection', (socket) => {
  socket.on('join-restaurant', (restaurantId) => {
    if (restaurantId) socket.join(`restaurant-${restaurantId}`);
  });

  socket.on('join-kitchen', (restaurantId) => {
    if (restaurantId) socket.join(`kitchen-${restaurantId}`);
  });

  socket.on('join-waiter', (waiterId) => {
    socket.join(`waiter-${waiterId}`);
  });

  socket.on('disconnect', () => {});
});

// MongoDB connection (works with local MongoDB or MongoDB Atlas — just change MONGODB_URI)
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err.message));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
