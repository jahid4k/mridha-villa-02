# Mridha Villa 2: how the app should work

This is a draft for us to discuss. It describes how the app should work so
that it saves you time instead of adding chores. Nothing here is built yet.
Section 13 gives the order we would build it in, and section 14 lists the
questions we still need to answer.

---

## 1. The big idea

Today the app mostly stores what you type. You generate each month by hand,
type the same tenant and rent details into three or four forms, and have to
remember every task yourself.

The new app follows three rules:

1. **Type each fact once.** A shop's rent, collector, meter number and gas
   charge are saved on the shop. A tenant's details are saved on the tenant.
   Rent bills, the deed, receipts and reports are all built from those saved
   facts, so you never type them again.
2. **The app runs the month; you confirm.** On the 1st of every month the
   charges appear by themselves. You only record what really happened: money
   received and meter readings.
3. **The home screen tells you what to do.** It is a to-do list, not a page
   of numbers.

---

## 2. Your month: today and tomorrow

| Task | Today | New app |
|---|---|---|
| Create this month's rent | Open Rent, pick the month, click "Generate All" | Nothing to do. It happens on the 1st. |
| Carry last month's unpaid rent forward | Copied as a number; lost if a month is skipped | Automatic. Each tenant has one running balance. |
| Gas bill | Enter every tenant, every month | Nothing to do. The fixed monthly amount is added automatically. |
| Advance deduction | The app uses up the whole advance, which is wrong for most tenants | Follows each tenant's rule (e.g. "৳2,000 per month" or "keep until move-out") |
| Electricity | Readings sheet (already improved) | Same sheet. Bills go straight onto each tenant's balance. |
| Record a payment | Find the month's record and fill in 6 fields | Tap the tenant, tap **Collect**, check the amount, then save |
| Know who is late | Not shown; "overdue" is never set | Shown automatically after the due day |
| Lease ending soon | You have to remember | A to-do appears 30 days before it ends |
| New tenant | Tenant form, then lease form, then a 42-field deed form (66 fields, 17 typed twice) | One guided "Move in" flow; the deed fills itself |
| Tenant leaves | "End lease" only; dues, advance and final bills are left hanging | One guided "Move out" flow that settles everything |
| Staff salary and other monthly expenses | Typed again every month | Drafted automatically; you confirm with one tap |
| Who owes whom between the brothers | Not calculated | A monthly settlement: "Jony owes Jahid ৳N" |

### Your whole monthly routine in the new app

- **1st of the month:** nothing. The app has already added rent and gas.
- **Meter reading day:** open Electricity, type the readings, press Create
  (about 5 minutes).
- **When a tenant pays:** tap the tenant, tap Collect, then Save (about 10
  seconds).
- **Once a week or so:** look at the to-do list.
- **End of the month:** confirm the recurring expenses and settle with your
  brother.

---

## 3. The four things the app keeps track of

### Unit (shop or room): set once
- Name, number, floor, size
- **Monthly rent**, used as the starting rent for every new tenant
- **Collector** (Jahid or Jony)
- Electricity sub-meter (yes or no) and meter number
- **Fixed monthly gas charge**
- Shutters, doors and keys, so the deed never asks for them again

The app works out whether a unit is **vacant or occupied** from its
tenancies. You never pick that by hand, so it cannot be wrong.

### Tenant (the person): set once
- Name, phone, NID number, father's name, addresses, date of birth,
  business name and type, trade licence
- Photo and a scan of the NID
- *(Optional)* name, father's name and address in Bangla, for the deed

### Tenancy (today called "lease")
The agreement that one tenant rents certain units from a start date.
- **Rent history**, not just one number. For example: "৳10,000 from
  Jan 2026, then ৳12,000 from Jan 2027". A rent increase never overwrites the
  past.
- **Advance** amount and **how it is used**: "deduct ৳X from rent every
  month" or "keep until move-out"
- Security deposit, due day, collector, deed terms (such as permitted trade
  and notice days)
- The **saved deed**, which you can print again at any time

### Tenant account: the most important new idea
Each tenant has **one running account**, like a shop's credit book (khata):
- Every **charge** (rent, electricity, gas, extras) is **added**.
- Every **payment** is **subtracted**.
- **Balance = what they owe right now**, across all months.

Today the app copies "previous due" from one month to the next. That causes
three problems:
- Unpaid rent is counted two or three times in the dashboard and reports.
- Dues disappear if a month is skipped.
- Paying an old month leaves the newer month still showing the old due.

A running account fixes all three at the root.

---

## 4. What happens automatically

**On the 1st of every month (Dhaka time)**, for every active tenancy, the app:
1. **Adds the month's rent.** In the first or last month it charges only
   for part of the month.
2. **Adds the fixed gas charge.**
3. **Applies the advance rule:** deducts ৳X, or leaves the advance alone.
4. **Opens this month's electricity readings sheet.**

The same thing also runs the first time anyone opens the app in a new month,
so it never depends on a server timer alone. Running it twice does no harm.
If the app was not opened for two months, it catches up both months.

**Electricity:** type the readings on the sheet, and each bill is added to
that tenant's account.

**Late payments:** after the due day, unpaid charges show as **late**
automatically. A late fee is optional and set in Settings.

**Recurring expenses:** items like staff salary, the cleaner and common
electricity appear as drafts each month. Confirm or edit them with one tap.

**Receipts:** each payment gets the next receipt number in order, for
example MV2-2026-0001, MV2-2026-0002.

**Dates:** everything uses Bangladesh time. Today the month changes six hours
late, at 6 AM Dhaka time on the 1st, because the server runs on UTC.

---

## 5. The home screen is your to-do list

Examples of what you would see:

- ⚡ **October meter readings: 3 of 7 entered** → opens the readings sheet
- 💰 **Selim owes ৳12,500 (rent Oct + electricity Sep), 5 days late** →
  Collect
- 📄 **Polash's tenancy ends in 20 days** → Renew / Move out
- 🔻 **Karim's advance runs out next month**
- 🧾 **3 recurring expenses to confirm for October**
- 🤝 **Settlement: Jony owes Jahid ৳3,200** → Mark settled

When the list is empty, there is nothing to do.

Below the list, only the numbers that matter:
- Collected this month
- **Total owed across all months** (today the dashboard shows only this
  month)
- Jahid's and Jony's collections side by side

---

## 6. Collecting money (one screen)

1. Tap the tenant, then tap **Collect**.
2. The app shows everything they owe, item by item:
   *Rent Oct ৳10,000 · Electricity Sep ৳1,450 · Gas Oct ৳1,080*.
3. The amount is filled in with the full balance. Change it if they paid
   less.
4. The money goes to the **oldest charges first**. You can also tick
   **"Electricity only"**, since electricity is collected separately.
5. **Received by** is the brother who is logged in. **Method** defaults to
   cash.
6. If they paid more than they owe, the extra becomes advance.
7. The receipt is ready to print or show on the phone.

**If you made a mistake:** you can **void** a payment. It stays in the
history marked as voided; it is never silently deleted.

---

## 7. Moving in (one guided flow)

This replaces four or five separate screens:

1. **Pick the unit or units.** Only vacant ones are shown.
2. **Tenant:** pick an existing person or add a new one, with photo and NID
   scan.
3. **Terms:** rent, collector and gas charge are **filled in from the unit**.
   Change them only if needed.
4. **Advance and how it is used, and the security deposit.**
5. **Start date and opening meter reading.**
6. **Done.** The app then:
   - creates the tenancy;
   - records the advance and security as money received, with a receipt;
   - adds the first month's rent (part month if they started mid-month);
   - **fills in the deed and saves it**, ready to print.

---

## 8. Moving out (one guided flow)

1. **Move-out date.**
2. **Final meter reading.**
3. The app adds the final part-month rent and the final electricity and gas
   charges.
4. It shows the balance next to the advance and security:
   *"Owes ৳8,500 · Advance ৳20,000 → Refund ৳11,500"*.
5. One tap: use the advance against the dues, then record the refund or the
   final payment.
6. The unit becomes **vacant**. The tenant becomes a **former tenant**, who
   can rent again later with no workarounds.

---

## 9. Renewing a tenancy

- A to-do appears **30 days before** the end date.
- **Renew** applies the rent increase (20% by default, as in the deed) from
  the new start month, keeps the rent history, and makes a new deed.
- **Move out** starts the move-out flow.

---

## 10. Money between Jahid and Jony

### Who owns which money (decided)

| Money | Belongs to |
|---|---|
| **Rent** | The brother who owns the unit. A unit's "Collector" *is* its owner. If the other brother collects it, he owes it to the owner. |
| **Electricity and gas** paid by tenants | The brother currently responsible for paying the building's utility bills (now **Jony**; Jahid did it before). The app keeps a history with start dates, so the role can switch back later. Whoever collects utility money owes it to him. |
| **Advance and security deposits** | Held **50/50**, and refunded 50/50 at move-out. |
| **Advance deducted from rent** | Only if the deed for that tenancy says so (deed clause ৪.২). When it happens, the owner gets less rent that month while the advance was held 50/50, so the settlement balances it: the other brother owes half the deducted amount. This has not happened yet, but the option stays. |
| **Building expenses** | Decided per expense: 50/50, one brother alone, or a custom split (as the expense form already allows). |

A tenancy never mixes units of both brothers, so all of a tenancy's rent
belongs to one brother.

### The settlement page
- Every payment records **who received it**, and every expense records
  **who paid** and **how it is shared**.
- For each month, the page applies the rules above and shows **who owes whom**,
  for example **"Jony owes Jahid ৳3,200"**, with the lines that make up the
  amount: rent collected for the other brother's units, utility money
  collected, expense shares and deposit halves.
- **Mark settled** records the hand-over and brings the balance back to zero.

---

## 11. Reports

Every report is built from the tenant accounts, so nothing is counted twice:
- **Month summary:** billed, collected, owed, expenses, net
- **Tenant statement:** every charge and payment for one tenant, printable
  to hand to them
- **Per unit** and **per brother**
- **Yearly** overview
- Export to **PDF** and **CSV** (Excel)

---

## 12. What goes away

- The "Generate All" button, because months happen by themselves
- Typing "previous due"
- The vacant/occupied dropdown on units
- Retyping 17 facts into the 42-field deed form
- Entering gas every month
- Working out advance deductions by hand
- The English agreement PDF, replaced by the Bangla deed built from the
  tenancy
- The "Seed Database" button in Settings

---

## 13. Build order

Each step is useful on its own, so we can stop and use the app after any of
them.

**Step 0: Fix what is broken today**
- Use Dhaka time. Today the month changes six hours late.
- Fix the Tenants list, which does not refresh after adding or editing.
- Make the Expense form match the server. Four categories, "joint" and the
  custom split currently fail or are lost.
- Gas "Pay" replaces the amount already paid instead of adding to it.
- The dashboard's "Expenses this month" adds up only 5 items.
- A second overpayment adds the earlier extra to the advance again.
- An occupied unit can be given to a second tenant.

**Step 1: Tenant account and automatic month**
- The running account for each tenant
- Automatic rent, gas and advance on the 1st
- The Collect screen and receipts
- Late status
- Move the existing rent records and payments into the new accounts

**Step 2: The to-do home screen**

**Step 3: Move in, move out and renew**
- The deed built from the tenancy
- Document and photo uploads

**Step 4: Recurring expenses and the brothers' settlement**

**Step 5: Reports and exports**

---

## 14. Decided so far

- **The agreement deed is the source of truth.**
- **Rent:** each calendar month is one full month's rent. A tenancy is always
  counted from the 1st of its start month, with no part-month amounts.
- **Due date:** rent is due by the 7th (deed clause ৩.২). After that it shows
  as late.
- **Late fee:** none.
- **Billing start:** automatic billing begins from the first month the app
  runs, so existing tenants entered at go-live are not billed for earlier
  years.
- **Payments:** money goes to the oldest charges first. Extra money becomes
  credit and is used for the next month's rent automatically.
- **Advance:** each tenancy has its own rule, either "keep until move-out"
  or "deduct ৳X per month".
- **Gas:** a fixed monthly charge is set on each unit.
- **Money between the brothers:** see section 10. In short:
  - rent belongs to the unit's owner;
  - utility money goes to whoever handles the building's bills (now Jony);
  - deposits are held 50/50;
  - expenses are split per expense.
- **One deposit:** the deed's "অগ্রিম" (advance). The app's separate
  "security deposit" will be merged into it.
- **Service charge:** none today, but the deed keeps the clause. Each tenancy
  gets an optional fixed monthly service charge (default 0). When it's set,
  the app adds it every month like gas.
- **Phone first:** the app is mostly used on the phone while collecting, so
  the Collect, readings and to-do screens are designed for the phone first.
- **Language:**
  - Bangla is the main language, in everyday words people use, not legal
    language.
  - An English switch is kept.
  - Numbers and money use Bangla digits (৳১৩,০০০).
  - Tenant details are typed in Bangla, so the deed fills itself from them.
    Phone and NID numbers can be typed in ordinary digits and are shown in
    Bangla digits.

**Status:**
- Steps 0 and 1 are built.
- The app is Bangla-first, with an English switch in the top bar and on the
  login page.
- How the translation works, for building new screens: code text is written
  in English and wrapped in `t('...')`. The Bangla lives in `lib/i18n/bn/`.
  Numbers, money and dates go through `f.bdt()`, `f.date()` and so on.

**Still to do (small):** merge the security deposit into the advance, and
add the optional monthly service charge.

## 15. Questions to discuss

1. *(Answered: not 50/50. Each brother keeps the rent of his own
   shops and rooms.)*
2. *(Answered: no late fee.)*
3. *(Answered: always a full month, counted from the 1st.)*
4. **Receipt:** printed on paper, shown on the phone, or both? A printable
   receipt page exists now.
5. *(Answered: the app becomes Bangla-first, and tenant details are typed
   in Bangla.)*
6. *(Answered: phone first.)*
7. *(Answered: one deposit, the advance.)*
8. *(Answered: an optional monthly service charge per tenancy.)*

---

## Appendix: technical notes for building

**New data**
- `Charge`: tenant, tenancy, type (rent, electricity, gas, extra or late
  fee), month and year, amount, and a link to its source (for example the
  electricity bill)
- `Payment`: amount, date, method, received by, receipt number, and
  **allocations** that say which charges it paid
- `Tenancy`: rent history, advance mode and amount, security, due day and
  deed terms. This grows out of today's `Lease`.
- `Settlement`: a record of hand-overs between the brothers
- `RecurringExpense`: a template for monthly expenses

**The automatic month**
- An `ensureMonth(month, year)` function that is safe to run more than once.
- It runs on page load and from a daily Vercel cron job (`/api/cron`,
  protected by a secret).
- The cron route has to be excluded from the login check in `middleware.ts`.

**Dhaka time**
- One date helper for Dhaka time replaces `getCurrentMonthYear()` in
  `lib/formatters.ts` and the `toISOString()` form defaults.

**Existing pieces to reuse**
- Electricity readings sheet and bulk creation: `lib/electricity.ts`
- Deed renderer: `lib/deed/*`, fed from the tenancy instead of the form
- Audit log: `lib/audit.ts`
- Cloudinary upload route, plus the unused
  `components/upload/FileUpload.tsx`

**Migration**
- Turn existing `RentRecord`s into rent charges and existing `Payment`s into
  payments.
- Opening balance = the latest unpaid amount on each lease.
