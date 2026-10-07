import { fromBn } from "./bn";
import { defaultDeedInput, type DeedInput, type DeedType } from "./schema";

// Deed fields from the app's own records, so nothing is typed twice:
// the New agreement form pre-fills from the chosen units and tenant, and
// leases saved before deeds were kept get a deed built from their data.
// Pure functions: safe on the server and in the browser.

export interface UnitRecord {
  _id: string;
  unitName: string;
  unitNumber: string;
  unitType: string;
  floorOrLocation?: string;
  size?: string;
  electricityMeterNumber?: string;
  defaultMonthlyRent: number;
  assignedCollector: string;
}

export interface TenantRecord {
  _id: string;
  name: string;
  phone: string;
  guardianName?: string;
  dateOfBirth?: string | Date;
  nidNumber?: string;
  presentAddress?: string;
  permanentAddress?: string;
  businessName?: string;
  tradeLicenseNumber?: string;
}

export interface LeaseRecord {
  monthlyRentAmount: number;
  startDate: string | Date;
  endDate?: string | Date;
  advanceBalance?: number;
  advanceMode?: "monthly" | "final";
  advancePerMonth?: number;
}

/** A stored date as YYYY-MM-DD (dates are saved as UTC midnight of the day). */
export const isoDay = (v?: string | Date) => (v ? new Date(v).toISOString().slice(0, 10) : "");

const digitsOnly = (s?: string) => fromBn(s ?? "").replace(/\D/g, "");

export function deedTypeFor(units: UnitRecord[]): DeedType {
  return units.length > 0 && units.every((u) => u.unitType === "room") ? "room" : "shop";
}

/** Shop no., floor, area and meter for the deed, plus the total rent. */
export function unitFields(units: UnitRecord[]) {
  const areas = units.map((u) => Number(digitsOnly(u.size)));
  return {
    unit: {
      // "S5" -> "5"; several units -> "5, 6"
      no: units.map((u) => digitsOnly(u.unitNumber) || u.unitNumber).join(", "),
      floor: units[0]?.floorOrLocation ?? "",
      area: areas.length > 0 && areas.every((a) => a > 0) ? String(areas.reduce((s, a) => s + a, 0)) : "",
      meter: units.map((u) => u.electricityMeterNumber).filter(Boolean).join(", "),
    },
    rent: String(units.reduce((s, u) => s + (u.defaultMonthlyRent || 0), 0) || ""),
  };
}

export function tenantFields(t: TenantRecord): DeedInput["tenant"] {
  return {
    name: t.name ?? "",
    father: t.guardianName ?? "",
    dob: isoDay(t.dateOfBirth),
    nid: digitsOnly(t.nidNumber),
    presentAddress: t.presentAddress ?? "",
    permanentAddress: t.permanentAddress ?? "",
    mobile: t.phone ?? "",
    business: t.businessName ?? "",
    tradeLicense: t.tradeLicenseNumber ?? "",
  };
}

/**
 * A deed for a lease that has none saved. Deed-only details (shutters, keys,
 * permitted trade...) were never recorded, so they print as dotted blanks.
 */
export function deedFromLease(lease: LeaseRecord, tenant: TenantRecord, units: UnitRecord[]): DeedInput {
  const deed = defaultDeedInput(deedTypeFor(units));
  const { unit } = unitFields(units);
  return {
    ...deed,
    tenant: tenantFields(tenant),
    unit: { ...deed.unit, ...unit },
    term: { ...deed.term, start: isoDay(lease.startDate), end: isoDay(lease.endDate) },
    money: {
      ...deed.money,
      rent: String(lease.monthlyRentAmount || ""),
      advance: lease.advanceBalance ? String(lease.advanceBalance) : "",
      advanceMode: lease.advanceMode ?? "",
      advancePerMonth: lease.advanceMode === "monthly" && lease.advancePerMonth ? String(lease.advancePerMonth) : "",
    },
  };
}
