import { bn } from './bn';
import { dhakaParts, getMonthName } from '@/lib/formatters';

// Bangla-first translation, shared by server and client code.
//
// Code is written in English and wrapped: t('Collect') or
// t('Collect from {name}', { name }). The Bangla dictionary (./bn) maps the
// English text to everyday Bangla. Anything missing falls back to English,
// so a forgotten entry never breaks a screen.

export type Lang = 'bn' | 'en';
export const DEFAULT_LANG: Lang = 'bn';
export const LANG_COOKIE = 'lang';

export const isLang = (v: unknown): v is Lang => v === 'bn' || v === 'en';

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

/** "13,000" -> "১৩,০০০" */
export const toBnDigits = (s: string | number) => String(s).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);

/** "০১৭১১" -> "01711": Bengali digits (e.g. typed with Avro) become 0-9. */
export const fromBnDigits = (s: string) => s.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));

export type Vars = Record<string, string | number | undefined | null>;

export function translate(lang: Lang, text: string, vars?: Vars): string {
  const template = lang === 'bn' ? bn[text] ?? text : text;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    if (!(key in vars)) return match;
    const v = vars[key];
    if (v === undefined || v === null) return '';
    return typeof v === 'number' && lang === 'bn' ? toBnDigits(v) : String(v);
  });
}

const BN_MONTHS = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর',
];
const EN_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Time of day the way people say it in Bangla: সকাল / দুপুর / বিকাল / সন্ধ্যা / রাত. */
function bnDayPart(hour24: number) {
  if (hour24 >= 4 && hour24 < 12) return 'সকাল';
  if (hour24 >= 12 && hour24 < 16) return 'দুপুর';
  if (hour24 >= 16 && hour24 < 18) return 'বিকাল';
  if (hour24 >= 18 && hour24 < 20) return 'সন্ধ্যা';
  return 'রাত';
}

const toDate = (d: string | Date) => (typeof d === 'string' ? new Date(d) : d);

/** Numbers, money, months and dates in the chosen language (Bangla digits in Bangla). */
export function makeFormat(lang: Lang) {
  const digits = (s: string | number) => (lang === 'bn' ? toBnDigits(s) : String(s));
  // Lakh grouping as used in Bangladesh: 12,34,567
  const num = (n: number | null | undefined) =>
    digits(Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 }));
  const month = (m: number) => (lang === 'bn' ? BN_MONTHS[m - 1] : getMonthName(m)) || '';
  const shortMonth = (m: number) => (lang === 'bn' ? BN_MONTHS[m - 1] : EN_SHORT[m - 1]) || '';

  const date = (value: string | Date | null | undefined) => {
    if (!value) return '-';
    const d = toDate(value);
    if (isNaN(d.getTime())) return '-';
    const p = dhakaParts(d);
    return lang === 'bn'
      ? `${digits(Number(p.day))} ${BN_MONTHS[p.month - 1]} ${digits(p.year)}`
      : `${p.day} ${EN_SHORT[p.month - 1]} ${p.year}`;
  };

  const dateTime = (value: string | Date | null | undefined) => {
    if (!value) return '-';
    const d = toDate(value);
    if (isNaN(d.getTime())) return '-';
    const p = dhakaParts(d);
    if (lang !== 'bn') return `${date(d)}, ${p.hour}:${p.minute} ${p.dayPeriod}`;
    const hour12 = Number(p.hour);
    const hour24 = (hour12 % 12) + (p.dayPeriod === 'PM' ? 12 : 0);
    return `${date(d)}, ${bnDayPart(hour24)} ${digits(hour12)}:${digits(p.minute)}`;
  };

  return {
    lang,
    digits,
    num,
    bdt: (n: number | null | undefined) => `৳${num(n)}`,
    month,
    shortMonth,
    monthYear: (m: number, y: number) => `${month(m)} ${digits(y)}`,
    shortMonthYear: (m: number, y: number) => `${shortMonth(m)} ${digits(y)}`,
    date,
    dateTime,
  };
}

export type Format = ReturnType<typeof makeFormat>;
export type T = (text: string, vars?: Vars) => string;

/** Values for a translatable error; { bdt } is formatted as money in the reader's language. */
export type ErrorVars = Record<string, string | number | { bdt: number }>;

/** Translate an error message written as a template, e.g. '{unit} has no meter'. */
export function translateError(lang: Lang, message: string, vars?: ErrorVars): string {
  if (!vars) return translate(lang, message);
  const f = makeFormat(lang);
  const plain: Vars = {};
  for (const [k, v] of Object.entries(vars)) plain[k] = typeof v === 'object' ? f.bdt(v.bdt) : v;
  return translate(lang, message, plain);
}

export function makeI18n(lang: Lang) {
  return {
    lang,
    t: ((text: string, vars?: Vars) => translate(lang, text, vars)) as T,
    f: makeFormat(lang),
  };
}
