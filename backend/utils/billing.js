const Bill = require('../models/Bill');
const Order = require('../models/Order');
const Table = require('../models/Table');
const Customer = require('../models/Customer');
const LoyaltySetting = require('../models/LoyaltySetting');
const { emitOrder, emitToStaff, emitCustomerUpdate } = require('./realtime');

const PAYMENT_MODES = ['cash', 'upi', 'card'];

// Money amount a reward takes off the food subtotal. Free-item rewards are a
// complimentary dish served to the table, so they don't change the amount.
function rewardDiscount(reward, subtotal) {
  if (!reward) return 0;
  if (reward.rewardType === 'discount_percent') {
    const pct = Math.min(100, Math.max(0, reward.rewardValue || 0));
    return Math.round(subtotal * pct / 100);
  }
  if (reward.rewardType === 'discount_flat') {
    return Math.min(subtotal, Math.max(0, reward.rewardValue || 0));
  }
  return 0;
}

// Subtotal → discount → GST on the discounted amount → grand total.
function computeTotals(subtotal, gstRate, discountAmount = 0) {
  const discount = Math.min(subtotal, Math.max(0, discountAmount));
  const taxable = subtotal - discount;
  const gstAmount = Math.round(taxable * gstRate / 100);
  return { subtotal, discountAmount: discount, taxable, gstRate, gstAmount, totalAmount: taxable + gstAmount };
}

class BillingError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/**
 * Bills an order from the POS: applies an optional loyalty reward, records payment,
 * closes the order, frees the table and awards the loyalty stamp.
 */
async function billOrder({ orderId, restaurant, paymentMode, rewardId, user, io }) {
  const mode = String(paymentMode || '').toLowerCase();
  if (!PAYMENT_MODES.includes(mode)) throw new BillingError(400, 'Choose cash, UPI or card as the payment mode');

  // Claim the order atomically so two staff members can't bill it at the same time.
  const order = await Order.findOneAndUpdate(
    { _id: orderId, restaurantId: restaurant._id, status: { $nin: ['completed', 'cancelled'] } },
    { $set: { status: 'completed' } },
    { new: false }
  );
  if (!order) {
    const exists = await Order.exists({ _id: orderId, restaurantId: restaurant._id });
    throw new BillingError(exists ? 409 : 404, exists ? 'This order is already billed or cancelled' : 'Order not found');
  }
  const originalStatus = order.status;
  if (!order.items.length) {
    await Order.updateOne({ _id: order._id }, { $set: { status: originalStatus } });
    throw new BillingError(400, 'This order has no items');
  }

  try {
    if (await Bill.exists({ orderId: order._id })) {
      throw new BillingError(409, 'A bill already exists for this order');
    }

    const customer = order.customerId ? await Customer.findById(order.customerId) : null;
    const settings = await LoyaltySetting.getOrCreateDefault(restaurant._id);

    let reward = null;
    if (rewardId) {
      if (!customer) throw new BillingError(400, 'Rewards can only be applied to orders linked to a customer');
      customer.initDefaultRewards(settings);
      customer.evaluateRewards();
      reward = customer.rewards.find(r => r.status === 'available' && (r.rewardId === rewardId || r._id?.toString() === rewardId));
      if (!reward) throw new BillingError(400, 'That reward is not available for this customer');
    }

    const subtotal = order.totalAmount;
    const gstRate = restaurant.gstRate ?? 5;
    const totals = computeTotals(subtotal, gstRate, rewardDiscount(reward, subtotal));

    const appliedReward = reward
      ? { rewardId: reward.rewardId, title: reward.title, rewardType: reward.rewardType, discountAmount: totals.discountAmount }
      : undefined;

    const bill = new Bill({
      restaurantId: restaurant._id,
      orderId: order._id,
      orderNumber: order.orderNumber,
      orderType: order.orderType === 'takeaway' ? 'takeaway' : 'dine_in',
      tableNumber: order.tableNumber,
      customerName: order.customerName || customer?.name || '',
      customerPhone: order.customerPhone || customer?.phone || '',
      customerId: customer?._id,
      takeawayToken: order.takeawayToken || '',
      items: order.items.map(i => ({ name: i.name, quantity: i.quantity, price: i.price, total: i.price * i.quantity })),
      subtotal: totals.subtotal,
      discountAmount: totals.discountAmount,
      appliedReward,
      gstRate: totals.gstRate,
      gstAmount: totals.gstAmount,
      totalAmount: totals.totalAmount,
      paymentMode: mode,
      paymentStatus: 'paid',
      customerCount: order.customerCount || 1,
      billedBy: user?._id,
      billedByName: user?.name || ''
    });

    // Loyalty: redeem the reward and award a stamp when the bill meets the minimum spend.
    let stampEarned = 0;
    let newlyUnlocked = [];
    if (customer) {
      const oldStamps = customer.totalStamps || 0;
      if (reward) {
        reward.status = 'redeemed';
        reward.redeemedAt = new Date();
        reward.orderId = order._id;
      }
      const minSpend = settings.minSpendForStamp ?? 200;
      if (bill.totalAmount >= minSpend) {
        customer.totalStamps = oldStamps + 1;
        stampEarned = 1;
      }
      bill.stampAwarded = stampEarned > 0;
      if (!customer.orders.some(id => id.toString() === order._id.toString())) customer.orders.push(order._id);
      customer.activeTable = null;
      customer.lastVisit = new Date();
      customer.initDefaultRewards(settings);
      customer.evaluateRewards();
      newlyUnlocked = stampEarned
        ? customer.rewards.filter(r => r.status === 'available' && oldStamps < r.requiredStamps)
        : [];
    }

    await bill.save();
    if (customer) await customer.save();

    order.status = 'completed';
    order.billRequested = false;
    if (appliedReward) order.appliedReward = appliedReward;
    await Order.updateOne(
      { _id: order._id },
      { $set: { status: 'completed', billRequested: false, ...(appliedReward ? { appliedReward } : {}) } }
    );

    if (order.tableId) {
      await Table.findOneAndUpdate(
        { _id: order.tableId, restaurantId: restaurant._id, currentOrderId: order._id },
        { status: 'available', currentOrderId: null, customerCount: 0, billRequested: false, billRequestedAt: null }
      );
    }

    emitOrder(io, 'order-status-updated', order);
    emitToStaff(io, restaurant._id, 'table-updated');
    emitToStaff(io, restaurant._id, 'bill-created', bill);
    if (customer) emitCustomerUpdate(io, customer);

    return { bill, customer, stampEarned, newlyUnlocked };
  } catch (err) {
    // Put the order back so it can be billed again after the problem is fixed.
    await Order.updateOne({ _id: order._id }, { $set: { status: originalStatus } });
    throw err;
  }
}

module.exports = { billOrder, computeTotals, rewardDiscount, BillingError, PAYMENT_MODES };
