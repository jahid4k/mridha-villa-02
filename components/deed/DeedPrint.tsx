"use client";

import { useRouter } from "next/navigation";
import type { DeedInput } from "@/lib/deed/schema";
import { DeedPreview } from "./DeedPreview";

/** A saved agreement's deed: print it, or go back to the leases list. */
export function DeedPrint({ data }: { data: DeedInput }) {
  const router = useRouter();
  return <DeedPreview data={data} onBack={() => router.push("/leases")} backLabel="Leases" />;
}
