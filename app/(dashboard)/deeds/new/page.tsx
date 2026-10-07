import { DeedForm } from "@/components/deed/DeedForm";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { getI18n } from "@/lib/i18n/server";
import Tenant from "@/models/Tenant";
import Unit from "@/models/Unit";

// The one entry point for a new tenancy. The form needs the free units (to
// fill rent, owner and shop details) and existing tenants (a former tenant
// can sign again); saving goes to /api/agreements.
export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("New agreement") };
}

export default async function NewAgreementPage() {
  const session = await auth();
  const username = (session?.user as any)?.username ?? "user";
  await connectDB();
  const [units, tenants] = await Promise.all([
    Unit.find({ status: "vacant" })
      .select("unitName unitNumber unitType floorOrLocation size electricityMeterNumber defaultMonthlyRent assignedCollector")
      .lean(),
    Tenant.find({ status: { $ne: "archived" } })
      .select("name phone guardianName dateOfBirth nidNumber presentAddress permanentAddress businessName tradeLicenseNumber")
      .sort({ name: 1 })
      .lean(),
  ]);
  units.sort((a: any, b: any) =>
    String(a.unitName).localeCompare(String(b.unitName), undefined, { numeric: true }),
  );

  return (
    <DeedForm
      units={JSON.parse(JSON.stringify(units))}
      tenants={JSON.parse(JSON.stringify(tenants))}
      draftKey={`mv2.newAgreementDraft.${username}`}
    />
  );
}
