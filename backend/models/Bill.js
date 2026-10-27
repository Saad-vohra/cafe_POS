const mongoose = require('mongoose');
const { nextSequence } = require('../utils/sequence');

const billSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
  billNumber: { type: Number },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  orderNumber: { type: Number },
  orderType: { type: String, enum: ['dine_in', 'takeaway'], default: 'dine_in' },
  tableNumber: { type: Number, required: false },
  customerName: { type: String, default: '' },
  customerPhone: { type: String, default: '' },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  takeawayToken: { type: String, default: '' },
  items: [{
    name: String,
    quantity: Number,
    price: Number,
    total: Number
  }],
  subtotal: { type: Number, required: true },
  discountAmount: { type: Number, default: 0 },
  appliedReward: {
    rewardId: { type: String },
    title: { type: String },
    rewardType: { type: String },
    discountAmount: { type: Number, default: 0 }
  },
  gstRate: { type: Number, default: 5 },
  gstAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  paymentMode: { type: String, enum: ['cash', 'upi', 'card'], required: true },
  paymentStatus: { type: String, enum: ['paid', 'pending'], default: 'paid' },
  customerCount: { type: Number, default: 1 },
  billedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  billedByName: { type: String, default: '' },
  stampAwarded: { type: Boolean, default: false }
}, { timestamps: true });

billSchema.index({ restaurantId: 1, billNumber: 1 }, { unique: true });

// Totals (discount, GST, grand total) are calculated by utils/billing.js before saving;
// this hook only assigns the bill number.
billSchema.pre('save', async function(next) {
  try {
    if (this.isNew && !this.billNumber) {
      const Bill = this.constructor;
      const restaurantId = this.restaurantId;
      this.billNumber = await nextSequence(`bill:${restaurantId}`, async () => {
        const last = await Bill.findOne({ restaurantId }, { billNumber: 1 }, { sort: { billNumber: -1 } });
        return last ? last.billNumber : 5000;
      });
    }
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model('Bill', billSchema);
