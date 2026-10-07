import { z } from "zod";
import { fromBn } from "./bn";
import { DEED_DEFAULTS, DEFAULT_OWNERS } from "./config";

// Design rule: every field may be left empty. An empty field prints as a
// dotted blank you fill by hand. Only the *shape* of what is typed is checked.

const text = (max = 200) =>
  z.string().trim().max(max, 'Too long');

/** A number field that doesn't apply: printed on the deed as is. */
export const NA = "N/A";

/** "N/A", "n/a", "NA", "N.A." all mean not applicable. */
export const isNA = (s: string) => /^n\s*[/.]?\s*a\.?$/i.test(s.trim());

// Plain digits, or N/A. Bengali digits (Avro) are read as 0-9 and
// commas/spaces dropped ("৫০,০০০" -> "50000"); any way of writing N/A
// becomes "N/A".
const digits = (max = 9) =>
  z
    .string()
    .trim()
    .overwrite((s) => (isNA(s) ? NA : fromBn(s).replace(/[,\s]/g, "")))
    .regex(/^(\d*|N\/A)$/, "Digits or N/A only")
    .refine((s) => s === NA || s.length <= max, "Too many digits");

// "" or YYYY-MM-DD (what <input type="date"> produces)
const isoDate = z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, "Pick a valid date");

export const DEED_TYPES = ["shop", "room"] as const;
export type DeedType = (typeof DEED_TYPES)[number];

const ownerSchema = z.object({
  name: text(120),
  father: text(120),
  mobile: text(20),
});

const deedFields = z
  .object({
    deedType: z.enum(DEED_TYPES),
    deedDate: isoDate,
    owners: z.array(ownerSchema).min(1, "Add at least one owner").max(6),
    ownerRep: text(120),

    tenant: z.object({
      name: text(120),
      father: text(120),
      dob: isoDate,
      nid: digits(17),
      presentAddress: text(300),
      permanentAddress: text(300),
      mobile: text(20),
      business: text(120),
      tradeLicense: text(60),
    }),

    unit: z.object({
      floor: text(30),
      no: text(30),
      area: digits(6),
      location: text(120),
      meter: text(40),
      shutters: digits(2),
      doors: digits(2),
      keys: digits(2),
    }),

    term: z.object({
      start: isoDate,
      end: isoDate,
      escalationPercent: digits(3),
    }),

    money: z.object({
      rent: digits(9),
      serviceCharge: digits(9),
      advance: digits(9),
      advanceMode: z.enum(["", "monthly", "final"]),
      advancePerMonth: digits(9),
      account: text(80),
    }),

    terms: z.object({
      trade: text(120),
      loadMax: text(40),
      noticeDays: digits(3),
      overstayMultiple: digits(2),
      refundDays: digits(3),
      copies: digits(2),
      vatBearer: z.enum(["", "landlord", "tenant"]),
    }),
  });

function checkTerm(v: z.infer<typeof deedFields>, ctx: z.RefinementCtx) {
  const { start, end } = v.term;
  if (!start || !end) return;
  const days = (Date.parse(end) - Date.parse(start)) / 86_400_000;
  // Any length of term is allowed; the end only has to come after the start.
  if (days <= 0) {
    ctx.addIssue({
      code: "custom",
      path: ["term", "end"],
      message: "End date must be after the start date",
    });
  }
}

export const deedSchema = deedFields.superRefine(checkTerm);

export type DeedInput = z.infer<typeof deedSchema>;

const BD_MOBILE = /^(\+?880|0)?1[3-9]\d{8}$/;

/**
 * The New agreement form: the deed plus what the app needs to start the
 * tenancy. Saving it adds (or updates) the tenant, creates the lease and
 * keeps this deed on the lease. Unlike a bare deed, the unit, tenant name,
 * mobile, rent and start date are required.
 */
export const agreementSchema = deedFields
  .extend({
    unitIds: z.array(z.string()).min(1, "Pick a shop or room"),
    /** "" = a new tenant; otherwise an existing tenant (e.g. a former one). */
    tenantId: z.string(),
  })
  .superRefine((v, ctx) => {
    checkTerm(v, ctx);
    const need = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: "custom", path, message });

    if (!v.tenant.name) need(["tenant", "name"], "Enter the tenant's name");
    const mobile = fromBn(v.tenant.mobile).replace(/[\s-]/g, "");
    if (!mobile) need(["tenant", "mobile"], "Enter the mobile number");
    else if (!BD_MOBILE.test(mobile)) {
      need(["tenant", "mobile"], "Enter a valid Bangladeshi phone number");
    }
    if (!(Number(v.money.rent) > 0)) need(["money", "rent"], "Enter the rent");
    if (!v.term.start) need(["term", "start"], "Pick the start date");
    if (
      v.money.advanceMode === "monthly" &&
      Number(v.money.advance) > 0 &&
      !(Number(v.money.advancePerMonth) > 0)
    ) {
      need(["money", "advancePerMonth"], "Enter how much advance to deduct each month");
    }
  });

export type AgreementInput = z.infer<typeof agreementSchema>;

/** The deed part of an agreement: what is saved on the lease and printed. */
export function deedPart(a: AgreementInput): DeedInput {
  const { deedType, deedDate, owners, ownerRep, tenant, unit, term, money, terms } = a;
  return { deedType, deedDate, owners, ownerRep, tenant, unit, term, money, terms };
}

export function defaultDeedInput(deedType: DeedType = "shop"): DeedInput {
  return {
    deedType,
    deedDate: "",
    owners: DEFAULT_OWNERS.map((o) => ({ ...o })),
    ownerRep: "",
    tenant: {
      name: "",
      father: "",
      dob: "",
      nid: "",
      presentAddress: "",
      permanentAddress: "",
      mobile: "",
      business: "",
      tradeLicense: "",
    },
    unit: {
      floor: "",
      no: "",
      area: "",
      location: "",
      meter: "",
      shutters: "",
      doors: "",
      keys: "",
    },
    term: {
      start: "",
      end: "",
      escalationPercent: DEED_DEFAULTS.escalationPercent,
    },
    money: {
      rent: "",
      serviceCharge: "",
      advance: "",
      advanceMode: "",
      advancePerMonth: "",
      account: "",
    },
    terms: {
      trade: "",
      loadMax: "",
      noticeDays: DEED_DEFAULTS.noticeDays,
      overstayMultiple: DEED_DEFAULTS.overstayMultiple,
      refundDays: DEED_DEFAULTS.refundDays,
      copies: DEED_DEFAULTS.copies,
      vatBearer: "",
    },
  };
}
