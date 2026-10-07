import { Noto_Serif_Bengali } from "next/font/google";

// Self-hosted at build time by next/font. The browser's print engine shapes
// Bengali conjuncts correctly with it, which jsPDF cannot do.
export const deedFont = Noto_Serif_Bengali({
  subsets: ["bengali", "latin"],
  display: "swap",
});
