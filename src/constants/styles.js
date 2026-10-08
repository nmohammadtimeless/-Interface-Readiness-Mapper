import { Info, AlertTriangle, CheckCircle2, XCircle, HelpCircle } from "lucide-react";

export const LEVEL_STYLE = {
  required: { badge: "bg-red-100 text-red-800 border-red-300", header: "bg-red-50 text-red-800 border-red-200", dot: "bg-red-500" },
  conditional: { badge: "bg-amber-100 text-amber-800 border-amber-300", header: "bg-amber-50 text-amber-800 border-amber-200", dot: "bg-amber-500" },
  optional: { badge: "bg-blue-100 text-blue-800 border-blue-300", header: "bg-blue-50 text-blue-800 border-blue-200", dot: "bg-blue-500" }
};
export const STATUS_STYLE_MAP = {
  aligned: { text: "Aligned", cls: "bg-emerald-50 text-emerald-800 border-emerald-300", Icon: CheckCircle2 },
  "aligned-optional": { text: "Aligned (optional)", cls: "bg-sky-50 text-sky-800 border-sky-300", Icon: CheckCircle2 },
  "value-mismatch": { text: "Value not in accepted list", cls: "bg-orange-50 text-orange-800 border-orange-300", Icon: AlertTriangle },
  missing: { text: "Missing - required", cls: "bg-rose-50 text-rose-800 border-rose-300", Icon: XCircle },
  "conditional-missing": { text: "Missing - verify condition", cls: "bg-amber-50 text-amber-800 border-amber-300", Icon: HelpCircle },
  "optional-gap": { text: "Optional - not sent", cls: "bg-stone-100 text-stone-600 border-stone-300", Icon: Info },
  "not-applicable": { text: "Not applicable to this workflow", cls: "bg-stone-50 text-stone-400 border-stone-200", Icon: Info },
  "not-required": { text: "Sent, not required by vendor", cls: "bg-stone-100 text-stone-600 border-stone-300", Icon: Info }
};
export const STATUS_ORDER = [
  "aligned",
  "aligned-optional",
  "value-mismatch",
  "missing",
  "conditional-missing",
  "optional-gap",
  "not-applicable"
];
