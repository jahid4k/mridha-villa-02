"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  FormProvider,
  useFieldArray,
  useForm,
  useFormContext,
  type Path,
} from "react-hook-form";
import { toast } from "sonner";
import {
  agreementSchema,
  deedPart,
  defaultDeedInput,
  type AgreementInput,
  type DeedInput,
} from "@/lib/deed/schema";
import {
  deedTypeFor,
  tenantFields,
  unitFields,
  type TenantRecord,
  type UnitRecord,
} from "@/lib/deed/fromRecords";
import { DEFAULT_OWNERS } from "@/lib/deed/config";
import { dayInDhaka, todayInDhaka } from "@/lib/formatters";
import { DeedPreview } from "./DeedPreview";
import { useAgreementDraft, type AgreementDraft } from "./useAgreementDraft";
import { useI18n } from "@/components/providers/LanguageProvider";

const inputCls =
  "w-full rounded-md border bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-black/40";

function TextField({
  name,
  label,
  hint,
  type = "text",
  required,
}: {
  name: Path<AgreementInput>;
  label: string;
  hint?: string;
  type?: "text" | "date";
  required?: boolean;
}) {
  const { register, getFieldState, formState } = useFormContext<AgreementInput>();
  const { t } = useI18n();
  const error = getFieldState(name, formState).error?.message;
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium">
        {t(label)}
        {required && <span className="text-red-500"> *</span>}
      </span>
      <input
        {...register(name)}
        type={type}
        autoComplete="off"
        aria-invalid={!!error}
        className={inputCls}
      />
      {error ? (
        <span className="block text-xs text-red-600">{t(error)}</span>
      ) : hint ? (
        <span className="block text-xs text-neutral-500">{t(hint)}</span>
      ) : null}
    </label>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <fieldset className="space-y-3 rounded-lg border bg-white p-4">
      <legend className="px-1 text-sm font-semibold">{t(title)}</legend>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

const ownerName = (collector?: string) => (collector === "jony" ? "Jony" : "Jahid");

/**
 * New agreement: the one place a tenancy starts. Pick the shop or room, fill
 * the tenant and the deed, check the deed, then save. Saving adds the tenant,
 * creates the lease (rent starts automatically) and keeps the deed to print.
 */
export function DeedForm({
  units,
  tenants,
  draftKey,
}: {
  /** Vacant units only. */
  units: UnitRecord[];
  /** Tenants who can sign again: former tenants, or current ones taking another unit. */
  tenants: TenantRecord[];
  /** Where this login's unfinished form is kept in the browser. */
  draftKey: string;
}) {
  const [empty] = useState<AgreementInput>(() => ({
    ...defaultDeedInput("shop"),
    deedDate: todayInDhaka(),
    unitIds: [],
    tenantId: "",
  }));
  const form = useForm<AgreementInput>({
    resolver: zodResolver(agreementSchema),
    defaultValues: empty,
    mode: "onBlur",
  });
  const { control, watch, getValues, setValue, formState } = form;
  const owners = useFieldArray({ control, name: "owners" });
  const [preview, setPreview] = useState<AgreementInput | null>(null);
  const [saving, setSaving] = useState(false);
  // null until the user picks: then a restored returning tenant shows as returning.
  const [returningChoice, setReturningChoice] = useState<boolean | null>(null);
  const router = useRouter();
  const { t, f } = useI18n();

  // An unfinished form from earlier comes back as it was left. A unit rented
  // in the meantime, or a tenant no longer listed, is dropped.
  const unitNames = useMemo(() => Object.fromEntries(units.map((u) => [u._id, u.unitName])), [units]);
  const restoreDraft = useCallback(
    (draft: AgreementDraft) => {
      const d = draft.values;
      const free = new Set(units.map((u) => u._id));
      const draftUnits = d.unitIds ?? [];
      const gone = draftUnits.filter((id) => !free.has(id));
      form.reset({
        ...empty,
        ...d,
        tenant: { ...empty.tenant, ...d.tenant },
        unit: { ...empty.unit, ...d.unit },
        term: { ...empty.term, ...d.term },
        money: { ...empty.money, ...d.money },
        terms: { ...empty.terms, ...d.terms },
        // Drafts from before the owners' mobiles were set: fill the blanks in.
        owners: (d.owners?.length ? d.owners : empty.owners).map((o) => ({
          ...o,
          mobile: o.mobile || DEFAULT_OWNERS.find((x) => x.name === o.name)?.mobile || "",
        })),
        unitIds: draftUnits.filter((id) => free.has(id)),
        tenantId: tenants.some((x) => x._id === d.tenantId) ? d.tenantId : "",
        // Left at that day's default: a deed is dated the day it's signed.
        deedDate: d.deedDate === dayInDhaka(new Date(draft.savedAt)) ? empty.deedDate : d.deedDate,
      });
      // On a full page load the toast area mounts after this form: wait for it.
      setTimeout(() => {
        toast.success(t("Your unfinished agreement is back, as you left it ({time}).", { time: f.dateTime(draft.savedAt) }));
        if (gone.length > 0) {
          toast.warning(
            t("{units} is no longer vacant, so it was taken off. Pick another.", {
              units: gone.map((id) => draft.unitNames[id] || "?").join(", "),
            }),
            { duration: 10000 },
          );
        }
      }, 0);
    },
    [empty, units, tenants, form, t, f],
  );
  const { savedAt, discard } = useAgreementDraft({
    form,
    storageKey: draftKey,
    empty,
    unitNames,
    onRestore: restoreDraft,
  });

  function startOver() {
    if (!window.confirm(t("Clear everything in this form and start over?"))) return;
    discard();
    form.reset(empty);
    setReturningChoice(null);
  }

  // Suggest a 1-year term when only the start date is set.
  const start = watch("term.start");
  useEffect(() => {
    if (start && !getValues("term.end")) {
      const d = new Date(start);
      d.setUTCFullYear(d.getUTCFullYear() + 1);
      d.setUTCDate(d.getUTCDate() - 1);
      setValue("term.end", d.toISOString().slice(0, 10), { shouldValidate: formState.isSubmitted });
    }
  }, [start, getValues, setValue, formState.isSubmitted]);

  const unitIds = watch("unitIds");
  const tenantId = watch("tenantId");
  const returning = returningChoice ?? tenantId !== "";
  const isRoom = watch("deedType") === "room";
  const owner = units.find((u) => u._id === unitIds[0])?.assignedCollector;
  const unitError = formState.errors.unitIds?.message;

  // Choosing units fills the deed's shop details and the rent from the unit.
  function toggleUnit(id: string) {
    const next = unitIds.includes(id) ? unitIds.filter((x) => x !== id) : [...unitIds, id];
    const chosen = units.filter((u) => next.includes(u._id));
    const { unit, rent } = unitFields(chosen);
    // After a failed submit, re-check filled fields so stale errors clear.
    const opts = { shouldValidate: formState.isSubmitted };
    setValue("unitIds", next, opts);
    setValue("deedType", deedTypeFor(chosen));
    setValue("unit.no", unit.no, opts);
    setValue("unit.floor", unit.floor, opts);
    setValue("unit.area", unit.area, opts);
    setValue("unit.meter", unit.meter, opts);
    setValue("money.rent", rent, opts);
  }

  // A returning tenant's details come from their record; a new one starts empty.
  function pickTenant(id: string) {
    setValue("tenantId", id);
    const found = tenants.find((x) => x._id === id);
    const fields = found ? tenantFields(found) : defaultDeedInput().tenant;
    (Object.keys(fields) as (keyof DeedInput["tenant"])[]).forEach((k) =>
      setValue(`tenant.${k}`, fields[k], { shouldValidate: formState.isSubmitted }),
    );
  }

  async function save() {
    if (!preview) return;
    setSaving(true);
    try {
      const res = await fetch("/api/agreements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preview),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(t(result.error));
      discard(); // saved for real: the draft on this device is no longer needed
      toast.success(t("Agreement saved"));
      router.push(`/deeds/${result.leaseId}`);
    } catch (e: any) {
      toast.error(e.message);
      setSaving(false);
    }
  }

  return (
    <FormProvider {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit((values) => setPreview(values))}
        className="mx-auto max-w-3xl space-y-5 p-4 pb-28"
      >
        <header>
          <h1 className="text-xl font-semibold">{t("New agreement")}</h1>
          <p className="text-sm text-neutral-600">
            {t("Fill this once: it adds the tenant, starts the monthly rent and makes the deed. Fields marked * are needed; anything else left empty prints as a dotted blank to write by hand. Type names and addresses in Bengali.")}
          </p>
          <p className="mt-1 text-sm text-neutral-600">
            {t("What you type is kept on this device until you save, so you can stop and finish later.")}
          </p>
        </header>

        <fieldset className="space-y-3 rounded-lg border bg-white p-4">
          <legend className="px-1 text-sm font-semibold">
            {t("Shop or room")}
            <span className="text-red-500"> *</span>
          </legend>
          {units.length === 0 ? (
            <p className="text-sm text-neutral-600">
              {t("Every shop and room is rented. End a lease first to free one.")}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {units.map((u) => {
                const on = unitIds.includes(u._id);
                // One agreement is always one brother's units: he keeps the rent.
                const otherOwner = !!owner && u.assignedCollector !== owner && !on;
                return (
                  <label
                    key={u._id}
                    className={`flex items-start gap-2 rounded-md border p-2 text-sm ${
                      otherOwner
                        ? "cursor-not-allowed opacity-40"
                        : on
                          ? "cursor-pointer border-indigo-300 bg-indigo-50"
                          : "cursor-pointer hover:bg-neutral-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={otherOwner}
                      onChange={() => toggleUnit(u._id)}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="block font-medium">{u.unitName}</span>
                      <span className="block text-xs text-neutral-500">
                        {f.bdt(u.defaultMonthlyRent)} · {t(ownerName(u.assignedCollector))}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          )}
          {unitError ? (
            <p className="text-xs text-red-600">{t(unitError)}</p>
          ) : owner ? (
            <p className="text-xs text-neutral-500">
              {t("Owner (keeps the rent): {name}", { name: t(ownerName(owner)) })}
            </p>
          ) : null}
        </fieldset>

        <Section title="Deed">
          <TextField name="deedDate" label="Deed date" type="date" />
          <TextField name="terms.copies" label="Copies" />
          <TextField
            name="ownerRep"
            label="Owners' representative (optional)"
          />
        </Section>

        <fieldset className="space-y-3 rounded-lg border bg-white p-4">
          <legend className="px-1 text-sm font-semibold">
            {t('Owners (first party)')}
          </legend>
          {owners.fields.map((field, i) => (
            <div key={field.id} className="grid gap-3 sm:grid-cols-2">
              <TextField name={`owners.${i}.name` as const} label="Name" />
              <TextField
                name={`owners.${i}.father` as const}
                label="Father's name"
              />
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <TextField
                    name={`owners.${i}.mobile` as const}
                    label="Mobile"
                  />
                </div>
                {owners.fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => owners.remove(i)}
                    className="rounded-md border px-3 py-2 text-sm"
                    aria-label={t('Remove owner {n}', { n: i + 1 })}
                  >
                    {t('Remove')}
                  </button>
                )}
              </div>
            </div>
          ))}
          {owners.fields.length < 6 && (
            <button
              type="button"
              onClick={() =>
                owners.append({ name: "", father: "", mobile: "" })
              }
              className="rounded-md border px-3 py-1.5 text-sm"
            >
              {t('Add owner')}
            </button>
          )}
        </fieldset>

        <fieldset className="space-y-3 rounded-lg border bg-white p-4">
          <legend className="px-1 text-sm font-semibold">
            {t("Tenant (second party)")}
          </legend>
          {tenants.length > 0 && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={!returning}
                    onChange={() => { setReturningChoice(false); pickTenant(""); }}
                  />
                  {t("New tenant")}
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={returning}
                    onChange={() => setReturningChoice(true)}
                  />
                  {t("Someone already in the app")}
                </label>
              </div>
              {returning && (
                <select
                  value={tenantId}
                  onChange={(e) => pickTenant(e.target.value)}
                  className={inputCls}
                >
                  <option value="">{t("Select tenant")}</option>
                  {tenants.map((x) => (
                    <option key={x._id} value={x._id}>
                      {x.name} — {x.phone}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField name="tenant.name" label="Name" required />
            <TextField name="tenant.father" label="Father's name" />
            <TextField name="tenant.dob" label="Date of birth" type="date" />
            <TextField name="tenant.nid" label="NID" />
            <TextField name="tenant.mobile" label="Mobile" required />
            <TextField name="tenant.presentAddress" label="Present address" />
            <TextField name="tenant.permanentAddress" label="Permanent address" />
            <TextField name="tenant.business" label="Business name" />
            <TextField
              name="tenant.tradeLicense"
              label="Trade licence no."
              hint="Usually not available yet; leave empty and fill by hand later."
            />
          </div>
        </fieldset>

        <Section title={isRoom ? "Room" : "Shop"}>
          <TextField name="unit.no" label={isRoom ? "Room no." : "Shop no."} />
          <TextField name="unit.floor" label="Floor" hint="e.g. নিচ" />
          <TextField name="unit.area" label="Area (sq ft)" />
          <TextField name="unit.location" label="Location in building" />
          <TextField name="unit.meter" label="Electric meter no." />
          <TextField name="unit.shutters" label="Shutters" />
          <TextField name="unit.doors" label="Doors" />
          <TextField name="unit.keys" label="Keys" />
        </Section>

        <Section title="Term">
          <TextField
            name="term.start"
            label="Start date"
            type="date"
            required
            hint="Rent is charged for the whole start month"
          />
          <TextField
            name="term.end"
            label="End date"
            type="date"
            hint="Filled as start + 1 year; change it for a longer term. Over 1 year must be registered."
          />
          <TextField
            name="term.escalationPercent"
            label="Rent increase on renewal (%)"
          />
        </Section>

        <Section title="Rent and advance">
          <TextField
            name="money.rent"
            label="Monthly rent (৳)"
            required
            hint="Filled from the shop or room; change it if this tenant pays a different rent."
          />
          <TextField
            name="money.serviceCharge"
            label="Service charge (৳)"
          />
          <TextField name="money.advance" label="Advance (৳)" />
          <label className="block space-y-1">
            <span className="text-sm font-medium">{t('Advance adjustment')}</span>
            <select {...form.register("money.advanceMode")} className={inputCls}>
              <option value="">{t('Leave blank')}</option>
              <option value="monthly">{t('Deduct monthly from rent')}</option>
              <option value="final">{t('Settle at end of tenancy')}</option>
            </select>
          </label>
          <TextField
            name="money.advancePerMonth"
            label="Monthly deduction (৳)"
          />
          <TextField
            name="money.account"
            label="Bank / bKash number for rent"
          />
          <TextField
            name="terms.refundDays"
            label="Refund within (days)"
          />
        </Section>

        <Section title="Use and exit">
          <TextField name="terms.trade" label="Permitted trade" />
          <TextField name="terms.loadMax" label="Max electrical load" />
          <TextField
            name="terms.noticeDays"
            label="Notice period (days)"
          />
          <TextField
            name="terms.overstayMultiple"
            label="Overstay rent multiple"
          />
          <label className="block space-y-1">
            <span className="text-sm font-medium">{t('Who bears VAT/tax')}</span>
            <select {...form.register("terms.vatBearer")} className={inputCls}>
              <option value="">{t('Undecided (print both options)')}</option>
              <option value="landlord">{t('Landlord (first party)')}</option>
              <option value="tenant">{t('Tenant (second party)')}</option>
            </select>
          </label>
        </Section>

        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-white p-3">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-3 gap-y-1">
            <button
              type="submit"
              className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
            >
              {t('Preview deed')}
            </button>
            {formState.isSubmitted && !formState.isValid && (
              <p className="text-sm text-red-600">
                {t('Some fields need a fix. See the red messages.')}
              </p>
            )}
            {savedAt && (
              <div className="ml-auto flex items-center gap-3 text-xs text-neutral-500">
                <span>
                  {t("Draft kept on this device · {time}", {
                    // Just the time when it was saved today.
                    time: dayInDhaka(new Date(savedAt)) === todayInDhaka()
                      ? f.dateTime(savedAt).split(", ").pop()
                      : f.dateTime(savedAt),
                  })}
                </span>
                <button type="button" onClick={startOver} className="underline hover:text-neutral-800">
                  {t("Start over")}
                </button>
              </div>
            )}
          </div>
        </div>
      </form>

      {preview && (
        <DeedPreview
          data={deedPart(preview)}
          onBack={() => setPreview(null)}
          canPrint={false}
          notice={t("Check the deed, then save. Saving adds the tenant and starts the rent; you can print right after.")}
          actions={
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {t(saving ? "Saving…" : "Save agreement")}
            </button>
          }
        />
      )}
    </FormProvider>
  );
}
