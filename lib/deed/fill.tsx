import type { ReactNode } from "react";

const TOKEN = /\{\{\s*([\w.]+)(?:\|(\d+))?\s*\}\}/g;

/** A value, or a dotted blank `width` characters wide when the value is empty. */
export function slot(
  value: string,
  width = 12,
  key?: string | number,
): ReactNode {
  return value ? (
    <span key={key} className="deed-filled">
      {value}
    </span>
  ) : (
    <span
      key={key}
      className="deed-blank"
      style={{ minWidth: `${width}ch` }}
      aria-hidden="true"
    />
  );
}

/** Replace {{key}} / {{key|width}} tokens in `text`. */
export function fill(
  text: string,
  values: Record<string, string>,
): ReactNode[] {
  const out: ReactNode[] = [];
  const re = new RegExp(TOKEN.source, "g");
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const key = m[1];
    if (process.env.NODE_ENV !== "production" && !(key in values)) {
      console.warn(`[deed] unknown token {{${key}}}`);
    }
    out.push(slot(values[key] ?? "", m[2] ? Number(m[2]) : 12, i++));
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
