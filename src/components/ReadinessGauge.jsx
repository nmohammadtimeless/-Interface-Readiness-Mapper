import React from "react";
/**
 * Semi-circular readiness readout, styled after a clinical instrument
 * dial - the report's one signature visual moment, grounded in the
 * tool's subject matter. Zone color (brick/amber/teal) tracks the same
 * thresholds a reviewer would use to triage the report at a glance.
 */
export function ReadinessGauge({ pct }) {
  const zoneColor = pct >= 80 ? "#0D7D82" : pct >= 50 ? "#B8792A" : "#A8433A";
  const zoneLabel = pct >= 80 ? "Ready" : pct >= 50 ? "Gaps to resolve" : "Not ready";
  const r = 54, cx = 64, cy = 64;
  const startAngle = 180, endAngle = 0; // semicircle, left to right
  const angleFor = p => startAngle + (endAngle - startAngle) * (p / 100);
  const pt = (deg, radius = r) => {
    const rad = (deg * Math.PI) / 180;
    return [cx + radius * Math.cos(rad), cy - radius * Math.sin(rad)];
  };
  const arcPath = (fromDeg, toDeg) => {
    const [x1, y1] = pt(fromDeg), [x2, y2] = pt(toDeg);
    const largeArc = Math.abs(fromDeg - toDeg) > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
  };
  return (
    <div className="flex flex-col items-center justify-center bg-white border border-stone-200 rounded-md p-3">
      <svg viewBox="0 0 128 76" width="128" height="76">
        <path d={arcPath(180, 0)} fill="none" stroke="#E4E7E3" strokeWidth="10" strokeLinecap="round" />
        <path d={arcPath(180, angleFor(pct))} fill="none" stroke={zoneColor} strokeWidth="10" strokeLinecap="round" />
        {[0, 25, 50, 75, 100].map(mark => {
          const [ix, iy] = pt(angleFor(mark), r - 8);
          const [ox, oy] = pt(angleFor(mark), r + 8);
          return <line key={mark} x1={ix} y1={iy} x2={ox} y2={oy} stroke="#C7CCC8" strokeWidth="1.5" />;
        })}
      </svg>
      <div className="hl7-mono text-2xl font-semibold -mt-7" style={{ color: zoneColor }}>{pct}%</div>
      <div className="text-[10px] uppercase tracking-wide text-stone-400 mt-3">Readiness &middot; {zoneLabel}</div>
    </div>
  );
}

