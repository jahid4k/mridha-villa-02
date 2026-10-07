"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { DeedInput } from "@/lib/deed/schema";
import { getTemplate } from "@/lib/deed/templates";
import { DeedDocument } from "./DeedDocument";
import { useI18n } from "@/components/providers/LanguageProvider";

export function DeedPreview({
  data,
  onBack,
  backLabel = "Back to edit",
  canPrint = true,
  actions,
  notice,
}: {
  data: DeedInput;
  onBack: () => void;
  backLabel?: string;
  /** false before the agreement is saved: print only what the app has on record. */
  canPrint?: boolean;
  /** Extra toolbar buttons, e.g. Save agreement. */
  actions?: ReactNode;
  notice?: ReactNode;
}) {
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);
  const template = getTemplate(data.deedType);
  const ready = template.complete && template.blocks.length > 0;

  useEffect(() => {
    setMounted(true);
    // Stop the page behind from scrolling while the preview is open.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  async function print() {
    // The default PDF file name comes from the page title.
    const prevTitle = document.title;
    document.title = `চুক্তিপত্র-${data.tenant.name || "ভাড়াটিয়া"}`;
    const restore = () => {
      document.title = prevTitle;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    await document.fonts.ready; // Bengali font must be loaded before layout
    window.print();
  }

  if (!mounted) return null;

  return createPortal(
    <div className="deed-portal fixed inset-0 z-50 overflow-auto bg-neutral-200">
      <div className="deed-noprint sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b bg-white px-3 py-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md border px-3 py-1.5 text-sm"
        >
          {t(backLabel)}
        </button>
        {canPrint && (
          <button
            type="button"
            onClick={print}
            disabled={template.blocks.length === 0}
            className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
          >
            {t(ready ? "Print / Save as PDF" : "Print draft")}
          </button>
        )}
        {actions}
        {notice && <p className="basis-full text-sm text-neutral-600">{notice}</p>}
        {!ready && (
          <p className="basis-full text-sm text-amber-700">
            {template.blocks.length === 0
              ? t("This template is not written yet.")
              : t("Draft template: later sections and the signature page are not added yet. Do not sign this print.")}
          </p>
        )}
      </div>
      <div className="p-2 sm:p-6">
        <DeedDocument data={data} />
      </div>
    </div>,
    document.body,
  );
}
