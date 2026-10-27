const mongoose = require('mongoose');

// Atomic counters for human-readable numbers (bill #, order #, customer ID).
// "Find the last number and add 1" breaks when two bills are saved at the same
// moment, so every number comes from a single $inc on this collection instead.
const counterSchema = new mongoose.Schema({
  _id: { type: String },
  seq: { type: Number, default: 0 }
}, { versionKey: false });

const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);

/**
 * Returns the next number for `key`. On first use the counter is seeded from
 * `seedFn()` (the highest number already stored), so existing data keeps counting on.
 */
async function nextSequence(key, seedFn) {
  const bumped = await Counter.findOneAndUpdate({ _id: key }, { $inc: { seq: 1 } }, { new: true });
  if (bumped) return bumped.seq;

  const start = await seedFn();
  try {
    await Counter.create({ _id: key, seq: start });
  } catch (err) {
    if (err.code !== 11000) throw err; // another request created it first
  }
  const created = await Counter.findOneAndUpdate({ _id: key }, { $inc: { seq: 1 } }, { new: true });
  return created.seq;
}

module.exports = { nextSequence, Counter };
