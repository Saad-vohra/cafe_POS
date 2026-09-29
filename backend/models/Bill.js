const mongoose = require('mongoose');

const billSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
  billNumber: { type: Number },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  orderNumber: { type: Number },
  tableNumber: { type: Number, required: true },
  items: [{
    name: String,
    quantity: Number,
    price: Number,
    total: Number
  }],
  subtotal: { type: Number, required: true },
  gstRate: { type: Number, default: 5 },
  gstAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  paymentMode: { type: String, enum: ['cash', 'upi', 'card'], required: true },
  paymentStatus: { type: String, enum: ['paid', 'pending'], default: 'paid' },
  customerCount: { type: Number, default: 1 }
}, { timestamps: true });

billSchema.index({ restaurantId: 1, billNumber: 1 }, { unique: true });

billSchema.pre('save', async function(next) {
  if (this.isNew) {
    const lastBill = await this.constructor.findOne({ restaurantId: this.restaurantId }, {}, { sort: { billNumber: -1 } });
    this.billNumber = lastBill ? lastBill.billNumber + 1 : 5001;
    this.gstAmount = Math.round(this.subtotal * this.gstRate / 100);
    this.totalAmount = this.subtotal + this.gstAmount;
  }
  next();
});

module.exports = mongoose.model('Bill', billSchema);
