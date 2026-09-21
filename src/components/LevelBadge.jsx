import React from "react";
import { LEVEL_STYLE } from "../constants/styles";
export function LevelBadge({ level }) {
  const s = LEVEL_STYLE[level] || LEVEL_STYLE.optional;
  return (
    <span className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border ${s.badge}`}>
      {level}
    </span>
  );
}

