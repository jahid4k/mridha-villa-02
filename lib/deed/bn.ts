// Bengali formatting helpers for deeds. Pure functions, no dependencies.

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

/** "13000" -> "১৩০০০" */
export function toBn(input: string | number): string {
  return String(input).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
}

/** "০১৭১১" -> "01711": Bengali digits typed on a Bangla keyboard become 0-9. */
export function fromBn(input: string): string {
  return input.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));
}

/** Bangladeshi digit grouping: 100000 -> "1,00,000" */
export function groupBd(n: number): string {
  const s = Math.trunc(n).toString();
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${rest},${last3}`;
}

/** 100000 -> "১,০০,০০০" */
export function formatTaka(n: number): string {
  return toBn(groupBd(n));
}

/** "2026-09-30" -> "৩০/০৯/২০২৬". Returns "" for empty or invalid input. */
export function formatDate(iso: string | undefined): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const [y, m, d] = iso.split("-");
  return toBn(`${d}/${m}/${y}`);
}

// Bengali number words 0..99 are irregular, so they are a lookup table.
// Spelling varies by region (এগারো / এগার); edit here to match your preference.
const W = (
  "শূন্য এক দুই তিন চার পাঁচ ছয় সাত আট নয় দশ " +
  "এগারো বারো তেরো চৌদ্দ পনেরো ষোলো সতেরো আঠারো ঊনিশ বিশ " +
  "একুশ বাইশ তেইশ চব্বিশ পঁচিশ ছাব্বিশ সাতাশ আটাশ ঊনত্রিশ ত্রিশ " +
  "একত্রিশ বত্রিশ তেত্রিশ চৌত্রিশ পঁয়ত্রিশ ছত্রিশ সাঁইত্রিশ আটত্রিশ ঊনচল্লিশ চল্লিশ " +
  "একচল্লিশ বিয়াল্লিশ তেতাল্লিশ চুয়াল্লিশ পঁয়তাল্লিশ ছেচল্লিশ সাতচল্লিশ আটচল্লিশ ঊনপঞ্চাশ পঞ্চাশ " +
  "একান্ন বাহান্ন তিপ্পান্ন চুয়ান্ন পঞ্চান্ন ছাপ্পান্ন সাতান্ন আটান্ন ঊনষাট ষাট " +
  "একষট্টি বাষট্টি তেষট্টি চৌষট্টি পঁয়ষট্টি ছেষট্টি সাতষট্টি আটষট্টি ঊনসত্তর সত্তর " +
  "একাত্তর বাহাত্তর তিয়াত্তর চুয়াত্তর পঁচাত্তর ছিয়াত্তর সাতাত্তর আটাত্তর ঊনআশি আশি " +
  "একাশি বিরাশি তিরাশি চুরাশি পঁচাশি ছিয়াশি সাতাশি অষ্টাশি ঊননব্বই নব্বই " +
  "একানব্বই বিরানব্বই তিরানব্বই চুরানব্বই পঁচানব্বই ছিয়ানব্বই সাতানব্বই আটানব্বই নিরানব্বই"
).split(" ");

/** 13000 -> "তেরো হাজার", 100000 -> "এক লক্ষ". Returns "" for 0 or invalid. */
export function takaWords(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "";
  let rest = Math.trunc(n);
  const sub = (x: number) => (x < 100 ? W[x] : takaWords(x));
  const parts: string[] = [];

  const koti = Math.floor(rest / 10_000_000);
  rest %= 10_000_000;
  const lakh = Math.floor(rest / 100_000);
  rest %= 100_000;
  const hajar = Math.floor(rest / 1_000);
  rest %= 1_000;
  const shata = Math.floor(rest / 100);
  rest %= 100;

  if (koti) parts.push(`${sub(koti)} কোটি`);
  if (lakh) parts.push(`${W[lakh]} লক্ষ`);
  if (hajar) parts.push(`${W[hajar]} হাজার`);
  if (shata) parts.push(`${W[shata]} শত`);
  if (rest) parts.push(W[rest]);
  return parts.join(" ");
}
