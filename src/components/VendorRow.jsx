import React from "react";
import { Trash2 } from "lucide-react";
import { LEVEL_STYLE } from "../constants/styles";
export function VendorRow({ entry, onChange, onRemove }) {
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-stone-100 last:border-b-0">
      <input type="text" value={entry.segment || ""} placeholder="PID-3.1" onChange={e => onChange(entry.id, "segment", e.target.value)}
        className="text-xs hl7-mono border border-stone-200 rounded px-2 py-1" style={{ width: 95 }} />
      <input type="text" value={entry.aliases || ""} placeholder="also called... (comma-separated)"
        title="Alternate identifier names this client uses for the same field, e.g. 'ROUTE OF ADMINISTRATION' for MEDICATION_ROUTE - you confirm these, the tool never guesses them"
        onChange={e => onChange(entry.id, "aliases", e.target.value)}
        className="text-xs border border-stone-200 rounded px-2 py-1 text-stone-500" style={{ width: 130 }} />
      <input type="text" value={entry.label || ""} placeholder="field name" onChange={e => onChange(entry.id, "label", e.target.value)}
        className="text-xs border border-stone-200 rounded px-2 py-1" style={{ width: 150 }} />
      {entry.fieldId && (
        <span className="hl7-mono text-[10px] text-teal-800 bg-teal-50 border border-teal-200 rounded px-1.5 py-1 self-center"
          title="Vendor's own Field Identifier, captured from the requirements document">{entry.fieldId}</span>
      )}

