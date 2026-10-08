import React from "react";
import { Trash2 } from "lucide-react";
import { LEVEL_STYLE } from "../constants/styles";

export default function VendorRow({ entry, onChange, onRemove }) {
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-stone-100 last:border-b-0">
      <input
        type="text"
        value={entry.segment || ""}
        placeholder="PID-3.1"
        onChange={(e) => onChange(entry.id, "segment", e.target.value)}
        className="text-xs hl7-mono border border-stone-200 rounded px-2 py-1"
        style={{ width: 95 }}
      />
      <input
        type="text"
        value={entry.aliases || ""}
        placeholder="also called... (comma-separated)"
        title="Alternate identifier names this client uses for the same field, e.g. 'ROUTE OF ADMINISTRATION' for MEDICATION_ROUTE - you confirm these, the tool never guesses them"
        onChange={(e) => onChange(entry.id, "aliases", e.target.value)}
        className="text-xs border border-stone-200 rounded px-2 py-1 text-stone-500"
        style={{ width: 130 }}
      />
      <input
        type="text"
        value={entry.label || ""}
        placeholder="field name"
        onChange={(e) => onChange(entry.id, "label", e.target.value)}
        className="text-xs border border-stone-200 rounded px-2 py-1"
        style={{ width: 150 }}
      />
      {entry.fieldId && <span
        className="hl7-mono text-[10px] text-blue-800 bg-blue-50 border border-blue-200 rounded px-1.5 py-1 self-center"
        title="Vendor's own Field Identifier, captured from the requirements document"
      >
        {entry.fieldId}
      </span>}
      <select
        value={entry.level || "required"}
        onChange={(e) => onChange(entry.id, "level", e.target.value)}
        className={`text-xs rounded px-1.5 py-1 border ${LEVEL_STYLE[entry.level || "required"].badge}`}
      >
        <option value="required">required</option>
        <option value="conditional">conditional</option>
        <option value="optional">optional</option>
      </select>
      <select
        value={entry.workflow || "any"}
        onChange={(e) => onChange(entry.id, "workflow", e.target.value)}
        title="Which message workflow this field applies to"
        className="text-xs rounded px-1.5 py-1 border border-stone-200 text-stone-600"
      >
        <option value="any">any</option>
        <option value="adt">adt</option>
        <option value="order">order</option>
        <option value="result">result</option>
        {["order:ORM", "order:RDE", "result:ORU"].map((w) => <option key={w} value={w}>{w}</option>)}
        {entry.workflow && !["any", "adt", "order", "result", "order:ORM", "order:RDE", "result:ORU"].includes(entry.workflow) && <option value={entry.workflow}>{entry.workflow}</option>}
      </select>
      <input
        type="text"
        value={entry.acceptedValues || ""}
        placeholder="accepted values"
        onChange={(e) => onChange(entry.id, "acceptedValues", e.target.value)}
        className="text-xs border border-stone-200 rounded px-2 py-1 flex-1"
      />
      <button onClick={() => onRemove(entry.id)} className="text-stone-400 hover:text-red-500 mt-1">
        <Trash2 size={14} />
      </button>
    </div>
  );
}

