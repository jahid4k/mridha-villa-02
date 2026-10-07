// Defaults that prefill every deed. Edit here once; nothing else hardcodes them.
// Each one can still be changed on the form for a single deed.

export const BUILDING_ADDRESS =
  "বাসা-৩৫, রোড-৪/এ, ব্লক-ডি, বনশ্রী, রামপুরা, ঢাকা-১২১৯";

export const DEFAULT_OWNERS = [
  {
    name: "মোঃ সালাউদ্দিন মৃধা জনি",
    father: "সিরাজুল ইসলাম মৃধা",
    mobile: "01966227534",
  },
  {
    name: "মোঃ জাহিদ হোসেন মৃধা",
    father: "সিরাজুল ইসলাম মৃধা",
    mobile: "01309061196",
  },
];

// Plain digits (0-9): these fill number inputs; the deed converts to Bengali.
// escalationPercent defaults to "20" because the paper deed hardcodes "২০%"
// on renewal — it's still editable per deed, just pre-filled to match.
export const DEED_DEFAULTS = {
  noticeDays: "30",
  overstayMultiple: "2",
  refundDays: "30",
  escalationPercent: "20",
  copies: "2",
};
