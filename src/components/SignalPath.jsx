import React from "react";

export default function SignalPath({ ehr, vendor, hasClient, hasVendor }) {
  const nodeColor = (active) => active ? "#005399" : "#C7CCC8";
  return (
    <div className="bg-white border border-stone-200 rounded-lg px-5 py-3 flex items-center gap-3">
      <svg viewBox="0 0 24 24" width="20" height="20" className="flex-shrink-0">
        <circle cx="12" cy="12" r="9" fill="none" stroke={nodeColor(hasClient)} strokeWidth="2.5" />
        {hasClient && <circle cx="12" cy="12" r="4" fill={nodeColor(hasClient)} />}
      </svg>
      <span className="hl7-mono text-xs font-medium text-stone-600 whitespace-nowrap">{ehr || "EHR"}</span>
      <svg viewBox="0 0 100 8" className="flex-1 min-w-[40px]" height="8" preserveAspectRatio="none">
        <line
          x1="0"
          y1="4"
          x2="100"
          y2="4"
          stroke={hasClient && hasVendor ? "#005399" : "#D8DAD4"}
          strokeWidth="2"
          strokeDasharray={hasClient && hasVendor ? "0" : "4 3"}
        />
      </svg>
      <div
        className="hl7-mono text-[10px] uppercase tracking-wider text-stone-400 border border-stone-300 rounded px-2 py-1 whitespace-nowrap"
      >
        Validate
      </div>
      <svg viewBox="0 0 100 8" className="flex-1 min-w-[40px]" height="8" preserveAspectRatio="none">
        <line
          x1="0"
          y1="4"
          x2="100"
          y2="4"
          stroke={hasClient && hasVendor ? "#005399" : "#D8DAD4"}
          strokeWidth="2"
          strokeDasharray={hasClient && hasVendor ? "0" : "4 3"}
        />
      </svg>
      <span className="hl7-mono text-xs font-medium text-stone-600 whitespace-nowrap">
        {vendor || "Vendor"}
      </span>
      <svg viewBox="0 0 24 24" width="20" height="20" className="flex-shrink-0">
        <circle cx="12" cy="12" r="9" fill="none" stroke={nodeColor(hasVendor)} strokeWidth="2.5" />
        {hasVendor && <circle cx="12" cy="12" r="4" fill={nodeColor(hasVendor)} />}
      </svg>
    </div>
  );
}

