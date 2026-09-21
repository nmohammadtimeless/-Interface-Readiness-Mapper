import React from "react";
import { STATUS_STYLE_MAP } from "../constants/styles";
export function StatusBadge({ status, reason }) {
  const { text, cls, Icon } = STATUS_STYLE_MAP[status];
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded border ${cls}`} title={reason || undefined}>
      <Icon size={13} /> {text}{reason ? ` - ${reason}` : ""}
    </span>
  );
}

