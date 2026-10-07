// A deed template is plain data: an ordered list of blocks.
// Text may contain {{key}} or {{key|width}} tokens.
//   {{tenant.name|20}}  -> the tenant's name, or a dotted blank 20 characters wide
// Keys are produced by buildValues() in ../values.ts.

export type Block =
  | { t: "h"; text: string; level?: 2 | 3 }
  | { t: "p"; text: string }
  | { t: "kv"; rows: [label: string, text: string][]; head?: [string, string] }
  | { t: "table"; head: string[]; rows: string[][] }
  | { t: "owners" } // owners table, driven by data.owners
  | { t: "ownerSigs" } // one signature line per owner
  | { t: "tenantSig" } // tenant signature + thumbprint box
  | { t: "witnesses"; count: number };

export type DeedTemplate = {
  title: string;
  /** false while sections are still missing; the preview warns before printing */
  complete: boolean;
  blocks: Block[];
};
