import mongoose, { Schema } from 'mongoose';

// Named sequences, e.g. receipt numbers per year ("receipt-2026" -> 1, 2, 3...).
// Incremented atomically, so two people saving at once never get the same number.

interface ICounter {
  _id: string;
  seq: number;
}

const CounterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  seq: { type: Number, required: true, default: 0 },
});

const Counter = mongoose.models.Counter || mongoose.model<ICounter>('Counter', CounterSchema);
export default Counter;

/** MV2-2026-0001, MV2-2026-0002, ... restarting each year. */
export async function nextReceiptNumber(year: number): Promise<string> {
  const counter: any = await Counter.findOneAndUpdate(
    { _id: `receipt-${year}` },
    { $inc: { seq: 1 } },
    { upsert: true, new: true },
  ).lean();
  return `MV2-${year}-${String(counter.seq).padStart(4, '0')}`;
}
