import { isValidObjectId } from "mongoose";
import { notFound } from "next/navigation";
import { DeedPrint } from "@/components/deed/DeedPrint";
import { connectDB } from "@/lib/db";
import { deedFromLease } from "@/lib/deed/fromRecords";
import type { DeedInput } from "@/lib/deed/schema";
import { getI18n } from "@/lib/i18n/server";
import Lease from "@/models/Lease";

// A lease's deed, ready to print: the deed saved with the agreement, or for
// leases from before deeds were saved, one built from the lease's records.
export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("Print deed") };
}

export default async function LeaseDeedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidObjectId(id)) notFound();

  await connectDB();
  const lease: any = await Lease.findById(id)
    .populate("tenantId")
    .populate("unitIds")
    .lean();
  if (!lease || !lease.tenantId) notFound();

  const records = JSON.parse(JSON.stringify(lease));
  const deed: DeedInput = records.deed ?? deedFromLease(records, records.tenantId, records.unitIds);

  return <DeedPrint data={deed} />;
}
