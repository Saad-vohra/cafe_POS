// One-time setup script for this single-client build.
// Creates the restaurant record, its first admin user, and a set of
// starter tables — this replaces the old public "/api/auth/register"
// self-signup flow, which has been removed.
//
// Configure the values below (or pass them as env vars) then run:
//   npm run seed
//
// Safe to re-run: it skips creating anything that already exists.

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Restaurant = require('./models/Restaurant');
const User = require('./models/User');
const Table = require('./models/Table');

// ---- EDIT THESE FOR YOUR CLIENT (or set as environment variables) ----
const RESTAURANT_NAME = process.env.SEED_RESTAURANT_NAME || 'Your Restaurant Name';
const RESTAURANT_EMAIL = process.env.SEED_RESTAURANT_EMAIL || 'owner@example.com';
const RESTAURANT_PHONE = process.env.SEED_RESTAURANT_PHONE || '';
const RESTAURANT_ADDRESS = process.env.SEED_RESTAURANT_ADDRESS || '';
const GST_RATE = Number(process.env.SEED_GST_RATE || 5);
const CURRENCY = process.env.SEED_CURRENCY || 'INR';

const ADMIN_NAME = process.env.SEED_ADMIN_NAME || 'Admin';
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';

const NUMBER_OF_TABLES = Number(process.env.SEED_TABLE_COUNT || 10);
// ------------------------------------------------------------------

function slugify(str) {
  return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // 1) Restaurant — reuse the existing one if it's already there
  let restaurant = await Restaurant.findOne();
  if (restaurant) {
    console.log(`Restaurant already exists: "${restaurant.name}" (skipping creation)`);
  } else {
    restaurant = await Restaurant.create({
      name: RESTAURANT_NAME,
      slug: slugify(RESTAURANT_NAME) || 'restaurant',
      email: RESTAURANT_EMAIL.toLowerCase(),
      phone: RESTAURANT_PHONE,
      address: RESTAURANT_ADDRESS,
      gstRate: GST_RATE,
      currency: CURRENCY
    });
    console.log(`Created restaurant: "${restaurant.name}"`);
  }

  // 2) Admin user
  const existingAdmin = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });
  if (existingAdmin) {
    console.log(`Admin user already exists: ${existingAdmin.email} (skipping creation)`);
  } else {
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    const admin = await User.create({
      restaurantId: restaurant._id,
      name: ADMIN_NAME,
      email: ADMIN_EMAIL.toLowerCase(),
      password: hash,
      role: 'admin'
    });
    console.log(`Created admin user: ${admin.email} / password: ${ADMIN_PASSWORD}`);
    console.log('IMPORTANT: log in and change this password (or set SEED_ADMIN_PASSWORD before seeding).');
  }

  // 3) Starter tables (only if none exist yet)
  const tableCount = await Table.countDocuments({ restaurantId: restaurant._id });
  if (tableCount > 0) {
    console.log(`Tables already exist (${tableCount}) — skipping.`);
  } else {
    const tables = [];
    for (let i = 1; i <= NUMBER_OF_TABLES; i++) {
      tables.push({
        restaurantId: restaurant._id,
        tableNumber: i,
        capacity: i % 3 === 0 ? 6 : i % 2 === 0 ? 4 : 2
      });
    }
    await Table.insertMany(tables);
    console.log(`Created ${tables.length} starter tables.`);
  }

  console.log('\nDone. You can log in at /login with the admin email/password above.');
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
