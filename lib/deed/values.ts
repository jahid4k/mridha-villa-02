import { BUILDING_ADDRESS } from "./config";
import { formatDate, formatTaka, takaWords, toBn } from "./bn";
import { NA, type DeedInput } from "./schema";

// Everything a template token can ask for. An empty string means "leave a
// dotted blank". All formatting lives here, so templates stay plain text.
// A number field set to N/A prints "N/A", in figures and in words alike.

const bn = (s: string) => (s ? toBn(s) : "");
const taka = (s: string) => (!s ? "" : s === NA ? NA : formatTaka(Number(s)));
const words = (s: string) => (!s ? "" : s === NA ? NA : takaWords(Number(s)));

/**
 * Clause ২.১ says the term is "not more than N years": whole calendar years
 * from the start to the day after the end, a part year counting as a year.
 * 1 Oct 2026 – 30 Sep 2029 -> 3; 1 Oct 2026 – 31 Mar 2028 -> 2.
 */
function termYears(start: string, end: string): string {
  if (!start || !end) return "";
  const from = new Date(start);
  const after = new Date(end);
  after.setUTCDate(after.getUTCDate() + 1);
  if (!(after > from)) return "";
  const plus = (years: number) => {
    const d = new Date(from);
    d.setUTCFullYear(d.getUTCFullYear() + years);
    return d;
  };
  let years = 0;
  while (plus(years + 1) <= after) years++;
  return String(plus(years) < after ? years + 1 : years);
}

export function buildValues(d: DeedInput): Record<string, string> {
  const { tenant: t, unit: u, term, money: m, terms } = d;

  let advAdjust = "";
  if (m.advanceMode === "final") {
    advAdjust = "চুক্তি অবসানের পর চূড়ান্ত হিসাবের সময় সমন্বয় করা হইবে";
  } else if (m.advanceMode === "monthly" && m.advancePerMonth) {
    advAdjust = `প্রতি মাসে ${taka(m.advancePerMonth)} টাকা করিয়া ভাড়ার সহিত সমন্বয় করা হইবে`;
  }

  // ৭.২: who bears VAT/tax. Falls back to the source's own bracketed
  // either/or when undecided, exactly like the paper form.
  const vatText =
    terms.vatBearer === "landlord"
      ? "প্রথম পক্ষ"
      : terms.vatBearer === "tenant"
        ? "দ্বিতীয় পক্ষ"
        : "[প্রথম পক্ষ / দ্বিতীয় পক্ষ]";

  return {
    "deed.date": formatDate(d.deedDate),
    "deed.copies": bn(terms.copies),
    "building.address": BUILDING_ADDRESS,
    "owner.rep": d.ownerRep,

    "tenant.name": t.name,
    "tenant.father": t.father,
    "tenant.dob": formatDate(t.dob),
    "tenant.nid": bn(t.nid),
    "tenant.presentAddress": t.presentAddress,
    "tenant.permanentAddress": t.permanentAddress,
    "tenant.mobile": bn(t.mobile),
    "tenant.business": t.business,
    // Official numbers stay exactly as typed (no digit conversion).
    "tenant.tradeLicense": t.tradeLicense,

    "unit.floor": u.floor,
    "unit.no": bn(u.no),
    "unit.area": bn(u.area),
    "unit.location": u.location,
    "unit.meter": u.meter,
    "unit.shutters": bn(u.shutters),
    "unit.doors": bn(u.doors),
    "unit.keys": bn(u.keys),

    "term.start": formatDate(term.start),
    "term.end": formatDate(term.end),
    "term.years": bn(termYears(term.start, term.end)),
    "term.escalation": bn(term.escalationPercent),

    "rent.amount": taka(m.rent),
    "rent.words": words(m.rent),
    "rent.service": taka(m.serviceCharge),
    "rent.account": m.account,

    "adv.amount": taka(m.advance),
    "adv.words": words(m.advance),
    "adv.adjust": advAdjust,

    "terms.trade": terms.trade,
    "terms.loadMax": terms.loadMax,
    "terms.noticeDays": bn(terms.noticeDays),
    "terms.overstay": bn(terms.overstayMultiple),
    "terms.refundDays": bn(terms.refundDays),
    "terms.vat": vatText,

    // Always empty: a hand-fillable dotted blank for cells with no backing
    // field (e.g. the Annex-ক handover checklist, filled in on paper).
    blank: "",
  };
}
