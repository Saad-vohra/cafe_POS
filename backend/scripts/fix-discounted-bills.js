// One-time repair for bills saved before the discount fix.
// The old Bill model recalculated the total on save and ignored the discount, so
// bills with a reward discount have a stored total that is too high.
//
//   node scripts/fix-discounted-bills.js           # dry run: only lists what would change
//   node scripts/fix-discounted-bills.js --apply   # writes the corrected totals
//
// It also lists orders marked "completed" that never got a bill (they can't be
// fixed automatically because the payment details are unknown).

require('dotenv').config();
const mongoose = require('mongoose');
const Bill = require('../models/Bill');
const Order = require('../models/Order');
const { computeTotals } = require('../utils/billing');

const apply = process.argv.includes('--apply');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`Connected. Mode: ${apply ? 'APPLY (writing changes)' : 'DRY RUN (no changes)'}\n`);

  const bills = await Bill.find({ discountAmount: { $gt: 0 } });
  let fixed = 0;
  for (const bill of bills) {
    const t = computeTotals(bill.subtotal, bill.gstRate ?? 5, bill.discountAmount);
    if (bill.totalAmount === t.totalAmount && bill.gstAmount === t.gstAmount) continue;
    console.log(`Bill #${bill.billNumber}: subtotal ${bill.subtotal}, discount ${bill.discountAmount} → ` +
      `GST ${bill.gstAmount} → ${t.gstAmount}, total ${bill.totalAmount} → ${t.totalAmount}`);
    if (apply) {
      await Bill.updateOne({ _id: bill._id }, { $set: { gstAmount: t.gstAmount, totalAmount: t.totalAmount } });
    }
    fixed++;
  }
  console.log(`\n${fixed} bill(s) ${apply ? 'corrected' : 'need correcting'}.`);

  const billedOrderIds = (await Bill.distinct('orderId')).map(String);
  const unbilled = await Order.find({ status: 'completed', _id: { $nin: billedOrderIds } }).sort('createdAt');
  if (unbilled.length) {
    console.log(`\n${unbilled.length} completed order(s) have NO bill (not counted in revenue reports):`);
    unbilled.forEach(o => console.log(`  Order #${o.orderNumber}  ${o.orderType === 'takeaway' ? 'Parcel' : `Table ${o.tableNumber}`}  ` +
      `₹${o.totalAmount}  ${o.createdAt.toLocaleString('en-IN')}`));
    console.log('Check these with the restaurant; they were closed without generating a bill.');
  }

  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
