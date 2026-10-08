import React from "react";
import { STATUS_STYLE_MAP } from "../constants/styles";

export default function StatusBadge({ status, reason }) {
  const { text, cls, Icon: Icon2 } = STATUS_STYLE_MAP[status];
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded border ${cls}`}
      title={reason || void 0}
    >
      <Icon2 size={13} />
      {" "}
      {text}
      {reason ? ` - ${reason}` : ""}
    </span>
  );
}

