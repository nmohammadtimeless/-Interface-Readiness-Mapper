import React from "react";
import { Trash2 } from "lucide-react";

export function ClientRow({ entry, onChange, onRemove }) {
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-stone-100 last:border-b-0">
      <input type="text" value={entry.segment || ""} placeholder="PID-3.1" onChange={e => onChange(entry.id, "segment", e.target.value)}
        className="text-xs hl7-mono border border-stone-200 rounded px-2 py-1" style={{ width: 100 }} />
      <input type="text" value={entry.meaning || ""} placeholder="meaning" onChange={e => onChange(entry.id, "meaning", e.target.value)}
        className="text-xs border border-stone-200 rounded px-2 py-1 flex-1" />
      <input type="text" value={entry.value || ""} placeholder="value" onChange={e => onChange(entry.id, "value", e.target.value)}
        className="text-xs border border-stone-200 rounded px-2 py-1" style={{ width: 140 }} />
      <button onClick={() => onRemove(entry.id)} className="text-stone-400 hover:text-red-500 mt-1"><Trash2 size={14} /></button>
    </div>
  );
}

