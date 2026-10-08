
import { useState, useMemo } from "react";
import { descriptionForFieldIdentifier } from "../data/exampleSeedRequirements";
import { HUMAN_MILK_RE, NA_IDENTIFIER, OMIT_IDENTIFIER, OTHER_IDENTIFIER, buildTransformedMessage, detectedContextOf, identifierKey, identifierNameOf, listClientIdentifierFields, matchesAlias, normalizeAliasText, splitMessageIntoSegments, suggestIdentifier, workflowMatches } from "../utils/aliasMatching";
import { formatCategoryOf, normalizeSegment, segmentTypeOf, segmentsAlign, stripOccurrenceSuffix, stripPipePrefix, valueMatchesAccepted } from "../utils/hl7";
import { newId } from "../utils/id";

export const TMNP_SUPPORTED_ADT_EVENTS = ["A01", "A02", "A03", "A04", "A05", "A06", "A07", "A08", "A11", "A12", "A13", "A17", "A23", "A31", "A38"];
export const TMNP_ADT_EVENT_NAMES = { A01: "Admit a Patient", A02: "Transfer a Patient", A03: "Discharge a Patient", A04: "Register a Patient", A05: "Pre-admit a Patient", A06: "Transfer Outpatient to Inpatient", A07: "Transfer Inpatient to Outpatient", A08: "Update Patient Information", A11: "Cancel Admit", A12: "Cancel Transfer", A13: "Cancel Discharge", A17: "Swap Beds", A23: "Delete a Patient Record", A31: "Update Person Information", A38: "Cancel Pre-Admit" };
export const TMNP_ADT_REQUIRED = {
  A01: ["PID-3.1", "PID-5.1", "PID-5.2", "PID-7.1", "PID-18.1", "PV1-3.1"],
  A02: ["PID-3.1", "PID-5.1", "PID-5.2", "PID-7.1", "PID-18.1", "PV1-3.1"],
  A04: ["PID-3.1", "PID-5.1", "PID-5.2", "PID-7.1", "PID-18.1", "PV1-3.1"],
  A05: ["PID-3.1", "PID-5.1", "PID-5.2", "PID-18.1", "PV1-3.1"],
  A06: ["PID-3.1", "PID-5.1", "PID-5.2", "PID-7.1", "PID-18.1", "PV1-3.1"],
  A07: ["PID-3.1", "PID-5.1", "PID-5.2", "PID-7.1", "PID-18.1", "PV1-3.1"],
  A08: ["PID-3.1", "PID-5.1", "PID-5.2", "PID-7.1", "PID-18.1", "PV1-3.1"],
  A03: ["PID-3.1"], A11: ["PID-3.1"], A23: ["PID-3.1"], A38: ["PID-3.1"],
  A12: ["PID-3.1", "PV1-3.1"], A13: ["PID-3.1", "PV1-3.1"],
  A31: ["PID-3.1", "PID-5.1", "PID-5.2", "PID-7.1", "PID-18.1"]
};
export const TMNP_FIELD_LABELS = { "PID-3.1": "Patient MRN", "PID-5.1": "Patient last name", "PID-5.2": "Patient first name", "PID-7.1": "Date of birth", "PID-18.1": "Encounter ID", "PV1-3.1": "Unit" };
export const TMNP_ORC_NEW = ["NW", "PA", "CH"];
export const TMNP_ORC_DC = ["CA", "DC", "OD", "OC", "CM"];
export const TMNP_ORC_MOD = ["NA", "SC", "XO"];
export const TMNP_CONSENT_TYPES = ["Donor Milk", "Formula", "Prolacta", "Ni-Q"];
export const TMNP_PID215_TYPES = ["MRN", "MPID", "EMRN", "CID", "CSN", "FIN", "HAR", "ACCT"];
export const TMNP_RESULT_IDS = ["SCANNED_BOTTLE", "FEED_BASE", "ORDER_TYPE", "MILK_TYPE", "FORTIFIER", "MODULAR", "FEED_CAL", "BOTTLE_VOLUME_ML", "LABEL_NOTES", "VERIFIED_BY"];
export const TMNP_CALORIC_UOM_RE = /^\s*k?cal\s*\/\s*(oz|ml)\s*$/i;
export function tmnpParse(text) {
  return splitMessageIntoSegments(text || "").map((line) => {
    const p = line.split("|");
    return { name: p[0], p, line };
  });
}
export function tmnpField(seg, n) {
  if (!seg) return "";
  const idx = seg.name === "MSH" ? n - 1 : n;
  if (seg.name === "MSH" && n === 1) return "|";
  return seg.p[idx] || "";
}
export function tmnpComp(seg, n, c) {
  const f = tmnpField(seg, n).split("~")[0];
  return ((f.split("^")[(c || 1) - 1]) || "").trim();
}
export function tmnpGet(segs, ref) {
  const m = ref.match(/^([A-Z]{2,3}\d?)(?:\[(\d+)\])?-(\d+)(?:\.(\d+))?$/);
  if (!m) return "";
  const list = segs.filter((s) => s.name === m[1]);
  const seg = list[(Number(m[2]) || 1) - 1];
  return tmnpComp(seg, Number(m[3]), Number(m[4]) || 1);
}
export function tmnpIsHumanMilk(v) {
  return HUMAN_MILK_RE.test(v || "");
}
export function tmnpIdentifierRows(segs) {
  const rows = [];
  segs.forEach((s) => {
    if (s.name === "OBX") {
      const v = (s.p[5] || "").split("^");
      rows.push({ seg: "OBX", id: ((s.p[3] || "").split("^")[0] || "").trim(), group: (s.p[4] || "").trim(), value: (v[0] || "").trim(), related: (v[1] || "").trim(), line: s.line });
    } else if (s.name === "NTE") {
      const c = (s.p[3] || "").split("^");
      rows.push({ seg: "NTE", id: (c[0] || "").trim(), group: (c[1] || "").trim(), value: (c[2] || "").trim(), related: (c[3] || "").trim(), line: s.line });
    }
  });
  return rows;
}
export function tmnpOrderName(segs, msgType) {
  const obr = tmnpGet(segs, "OBR-4.1");
  if (obr) return { value: obr, from: "OBR-4.1" };
  const ods3 = tmnpGet(segs, "ODS-3.1");
  if (ods3) return { value: ods3, from: "ODS-3.1" };
  const ods4 = tmnpGet(segs, "ODS-4.1");
  if (ods4) return { value: ods4, from: "ODS-4.1", misplaced: true };
  if (msgType === "RDE") {
    const rxo = tmnpGet(segs, "RXO-1.2") || tmnpGet(segs, "RXO-1.1");
    if (rxo) return { value: rxo, from: "RXO-1.2" };
  }
  return null;
}
export function tmnpOrderType(name) {
  const v = (name || "").trim().toUpperCase();
  if (v === "OIT") return "Oral Care (OIT)";
  if (v === "NPO") return "NPO";
  if (v === "CONSENT") return "Consent update";
  return "Standard feed order";
}
export function evaluateTmnpMessageRules(rawText, transformedText) {
  const checks = [];
  const add = (status, text, ref) => checks.push({ status, text, ref: ref || "" });
  const segs = tmnpParse(rawText);
  const msh = segs.find((s) => s.name === "MSH");
  if (!msh) return { summary: null, checks: [] };
  const msgType = tmnpComp(msh, 9, 1).toUpperCase();
  const trigger = tmnpComp(msh, 9, 2).toUpperCase();
  const version = tmnpComp(msh, 12, 1);
  const summary = { msgType, trigger, kind: "", action: "" };
  if (version) {
    const vn = parseFloat(version);
    if (vn >= 2.3 && vn <= 2.6) add("pass", `HL7 version ${version} is supported (2.3 to 2.6).`, "Supported HL7 Version");
    else add("fail", `HL7 version ${version} is outside the supported range 2.3 to 2.6.`, "Supported HL7 Version");
  } else add("fail", "MSH-12 (Version ID) is empty.", "MSH Segment Inbound Defaults");
  ["MSH-7.1", "MSH-10.1"].forEach((r) => {
    if (!tmnpGet(segs, r)) add("fail", `${r} is required and empty.`, "MSH Segment Inbound Defaults");
  });
  if (msgType === "ADT") {
    summary.kind = "Incoming ADT";
    summary.action = TMNP_ADT_EVENT_NAMES[trigger] ? `${trigger}: ${TMNP_ADT_EVENT_NAMES[trigger]}` : trigger;
    if (!TMNP_SUPPORTED_ADT_EVENTS.includes(trigger)) {
      let why = "Unsupported ADT events must be suppressed by the source.";
      if (["A21", "A22"].includes(trigger)) why = "Leave of Absence messages are not supported - the patient must stay active; send a discharge if they don't return.";
      if (["A18", "A34", "A35", "A36", "A40", "A41", "A42"].includes(trigger)) why = "Merge messages must be converted to an A03 for the MRN being retired and an A08 for the MRN being kept.";
      add("fail", `ADT^${trigger} is not a supported event. ${why}`, "Supported Incoming ADT Message Types / Rules");
      return { summary, checks };
    } else add("pass", `ADT^${trigger} (${TMNP_ADT_EVENT_NAMES[trigger]}) is a supported event.`, "Supported Incoming ADT Message Types");
    if (trigger === "A17") {
      const pids = segs.filter((s) => s.name === "PID").length;
      const pv1s = segs.filter((s) => s.name === "PV1").length;
      if (pids >= 2 && pv1s >= 2) add("pass", "A17 carries two PID/PV1 pairs (Patient 1 and Patient 2).", "A17: Swap Beds");
      else add("fail", `A17 needs two PID and two PV1 segments; found ${pids} PID and ${pv1s} PV1.`, "A17: Swap Beds");
      ["PID[1]-3.1", "PID[2]-3.1"].forEach((r) => {
        if (!tmnpGet(segs, r)) add("fail", `${r} (Patient ${r.includes("[1]") ? 1 : 2} MRN) is required.`, "Appendix - ADT A17");
      });
    }
    (TMNP_ADT_REQUIRED[trigger] || []).forEach((r) => {
      const v = tmnpGet(segs, r);
      if (v) add("pass", `${r} ${TMNP_FIELD_LABELS[r]} = "${v}"`, "Appendix - ADT segments per message type");
      else add("fail", `${r} ${TMNP_FIELD_LABELS[r]} is required for ${trigger} and is empty.`, "Appendix - ADT segments per message type");
    });
    if (trigger === "A05" && !tmnpGet(segs, "PID-7.1")) add("info", "PID-7.1 Date of birth is not required on A05.", "PID Segment Inbound Defaults (ADT)");
    if (trigger === "A05") add("info", "A05 is only processed with a unit in PV1-3.1; keep A05 in scope only if pre-admitted patients get feed orders.", "A05 important note");
    const unit = tmnpGet(segs, "PV1-3.1"), tempUnit = tmnpGet(segs, "PV1-6.1");
    if (!["A03", "A11", "A23", "A38", "A31"].includes(trigger)) {
      if (unit || tempUnit) add("info", `Unit sent: ${unit ? `PV1-3.1 = "${unit}"` : ""}${unit && tempUnit ? ", " : ""}${tempUnit ? `PV1-6.1 = "${tempUnit}"` : ""}. Must be an in-scope TMS unit, otherwise the source should suppress the message.`, "Supported Incoming ADT Message Rules");
      else add("fail", "No unit in PV1-3.1 or PV1-6.1 - messages without an in-scope unit must be suppressed.", "Supported Incoming ADT Message Rules");
    }
    if (trigger === "A08" && tmnpGet(segs, "PV1-45.1")) add("fail", "A08 contains a discharge date in PV1-45 - these A08s must be suppressed by the source.", "Supported Incoming ADT Message Rules");
    const sex = tmnpGet(segs, "PID-8.1");
    if (sex && !["M", "F", "U"].includes(sex.toUpperCase())) add("warn", `PID-8.1 = "${sex}" is not M/F/U - Patient Sex will default to Unknown.`, "PID-8.1");
    if (!sex && !["A03", "A11", "A23", "A38", "A12", "A13", "A17"].includes(trigger)) add("info", trigger === "A31" ? "No PID-8.1 - existing sex stays unchanged on A31." : "No PID-8.1 - Patient Sex will be set to Unknown.", "Incoming ADT Message Rules");
    const mom = tmnpGet(segs, "PID-21.1");
    if (mom) {
      const t = tmnpGet(segs, "PID-21.5");
      if (!t) add("fail", "PID-21.1 (mother identifier) is sent without an identifier type in PID-21.5.", "PID-21.5");
      else if (!TMNP_PID215_TYPES.includes(t.toUpperCase())) add("fail", `PID-21.5 = "${t}" is not an accepted type (${TMNP_PID215_TYPES.join(", ")}).`, "PID-21.5");
      else add("pass", `Mother identifier PID-21.1 with type ${t} - siblings will be linked. It must be unique (not a name).`, "PID-21.1");
    }
    const nk1 = segs.filter((s) => s.name === "NK1");
    if (nk1.length) {
      const motherNk1 = nk1.find((s) => /^mother$/i.test(tmnpComp(s, 3, 1)));
      if (motherNk1) add("pass", "NK1 with relationship \"Mother\" - mapped to the Guardian record.", "NK1-3.1");
      else add("warn", `NK1 present but NK1-3.1 is "${tmnpComp(nk1[0], 3, 1)}", not "Mother" - NK1 is not stored and guardian details are autogenerated.`, "Supported Incoming ADT Message Rules");
    } else if (["A01", "A02", "A04", "A05", "A06", "A07", "A08"].includes(trigger)) add("info", "No NK1 - Guardian name, MRN and Encounter ID will be autogenerated.", "A01/A04/A05/A08 rules");
    if (segs.some((s) => s.name === "GT1")) add("warn", "GT1 present - mother information in GT1 is not processed unless mapped to NK1.", "Supported Incoming ADT Message Rules");
    if (["A02", "A06", "A07", "A12"].includes(trigger)) add("info", "For an already-active patient, only Unit/Room/Bed are updated; other demographic changes are disregarded. An out-of-scope unit inactivates the patient.", trigger === "A12" ? "A12: Cancel Transfer" : "A02/A06/A07 rules");
    if (["A03", "A11", "A23", "A38"].includes(trigger)) add("info", "An active patient with this MRN/MPID is set to Inactive; otherwise the message is disregarded.", "A03/A11/A23/A38 rules");
  } else if (msgType === "ORM" || msgType === "RDE") {
    summary.kind = msgType === "ORM" ? "Incoming CPOE - ORM (OBR/ODS + OBX/NTE)" : "Incoming CPOE - RDE (RX segments)";
    if (msgType === "RDE" && trigger && !["O11", "O01"].includes(trigger)) add("warn", `RDE trigger ${trigger} - the document describes RDE^O11 (its examples show RDE^O01).`, "CPOE Orders via RDE^O11");
    if (msgType === "ORM" && trigger && trigger !== "O01") add("warn", `ORM trigger ${trigger} - the document describes ORM^O01.`, "CPOE Orders via ORM^O01");
    if (!tmnpGet(segs, "PID-3.1")) add("fail", "PID-3.1 Patient MRN is required.", "PID Segment Inbound Defaults (CPOE)");
    else add("pass", `PID-3.1 Patient MRN = "${tmnpGet(segs, "PID-3.1")}"`, "PID Segment Inbound Defaults (CPOE)");
    const orc1 = tmnpGet(segs, "ORC-1.1").toUpperCase();
    if (!orc1) add("fail", "ORC-1.1 Order Control ID is required.", "ORC Segment Inbound Defaults (CPOE)");
    else if (TMNP_ORC_NEW.includes(orc1)) add("pass", `ORC-1.1 = ${orc1} - processed as a NEW order.`, "ORC-1.1");
    else if (TMNP_ORC_DC.includes(orc1)) add("pass", `ORC-1.1 = ${orc1} - processed as a DISCONTINUED order.`, "ORC-1.1");
    else if (TMNP_ORC_MOD.includes(orc1)) add("pass", `ORC-1.1 = ${orc1} - processed as a MODIFIED order.`, "ORC-1.1");
    else add("fail", `ORC-1.1 = ${orc1} is not an accepted value (${[...TMNP_ORC_NEW, ...TMNP_ORC_DC, ...TMNP_ORC_MOD].join(", ")}).`, "ORC-1.1");
    const orc15 = tmnpGet(segs, "ORC-15.1"), orc74 = tmnpGet(segs, "ORC-7.4");
    if (orc15) add("pass", `Order valid-from taken from ORC-15.1 = ${orc15}.`, "Supported Incoming CPOE Message Rules");
    else if (orc74) add("pass", `ORC-15.1 empty - order valid-from taken from ORC-7.4 = ${orc74}.`, "Supported Incoming CPOE Message Rules");
    else add("warn", "No date in ORC-15.1 or ORC-7.4 - TMS will use the current date/time as order valid-from.", "Supported Incoming CPOE Message Rules");
    const on = tmnpOrderName(segs, msgType);
    const orderType = on ? tmnpOrderType(on.value) : null;
    summary.orderType = orderType;
    if (!on) add("fail", `No order name - ${msgType === "RDE" ? "OBR-4.1, ODS-3.1 or RXO-1.2" : "OBR-4.1 or ODS-3.1"} is required to decide the order type.`, "Order Creation Rule");
    else {
      if (on.misplaced) add("warn", `Order name "${on.value}" found in ODS-4.1, but the rule reads ODS-3.1 - check where your ODS puts the diet name.`, "OBR-4.1 / ODS-3.1");
      add("pass", `Order name "${on.value}" from ${on.from} -> TMS creates: ${orderType}.`, "Order Creation Rule");
      if (msgType === "RDE" && on.from !== "RXO-1.2" && tmnpGet(segs, "RXO-1.2")) add("info", `RXO-1.2 = "${tmnpGet(segs, "RXO-1.2")}" is ignored because ${on.from} takes priority (OBR-4.1, then ODS-3.1, then RXO-1.2).`, "RDE Order Creation Rule");
    }
    summary.action = orderType || "";
    const idSegs = tmnpParse(transformedText || rawText);
    const rows = tmnpIdentifierRows(idSegs).filter((r) => r.id);
    const recognized = rows.filter((r) => descriptionForFieldIdentifier(r.id));
    const unrecognized = rows.filter((r) => !descriptionForFieldIdentifier(r.id));
    if (unrecognized.length) add("info", `${unrecognized.length} OBX/NTE line(s) use labels that aren't TMNP field identifiers (${[...new Set(unrecognized.map((r) => r.id))].slice(0, 6).join(", ")}) - TMS maps these to the order Notes.`, "Recognized Field Identifiers note");
    const byId = (re) => recognized.filter((r) => re.test(r.id));
    const groupOk = (g) => !g || g.split(",").every((x) => /^\d+$/.test(x.trim()) || /^[PST]$/i.test(x.trim()));
    recognized.forEach((r) => {
      if (!groupOk(r.group)) add("fail", `${r.id} grouping ID "${r.group}" must be numeric or P/S/T.`, "Grouping ID");
    });
    const isWhole = (v) => /^\d+$/.test((v || "").trim());
    if (orderType === "Consent update") {
      if (!byId(/^CONSENT$/).length) add("fail", "CONSENT order has no CONSENT identifier lines.", "Consent Identifier Rules");
    }
    if (orderType === "NPO") add("info", "NPO order - TMS creates an NPO order from the order name; no feed base is needed.", "Order Creation Rule");
    byId(/^CONSENT$/).forEach((r) => {
      const okType = TMNP_CONSENT_TYPES.some((t) => t.toLowerCase() === r.value.toLowerCase());
      const okAct = ["YES", "NO"].includes(r.related.toUpperCase());
      if (okType && okAct) add("pass", `CONSENT ${r.value}^${r.related.toUpperCase()} - updates the patient's consent.`, "Consent Identifier Rules");
      else add("fail", `CONSENT value "${r.value}^${r.related}" - type must be ${TMNP_CONSENT_TYPES.join(" / ")} and action YES or NO.`, "Consent Identifier Rules");
    });
    if (msgType === "RDE") {
      const rxc = segs.filter((s) => s.name === "RXC");
      const bases = rxc.filter((s) => tmnpComp(s, 1, 1).toUpperCase() === "B");
      const adds = rxc.filter((s) => tmnpComp(s, 1, 1).toUpperCase() === "A");
      const mods = rxc.filter((s) => tmnpComp(s, 1, 1).toUpperCase() === "M");
      const nameOf = (s) => tmnpComp(s, 2, 2) || tmnpComp(s, 2, 1);
      if (orderType && !["NPO", "Consent update"].includes(orderType)) {
        if (bases.length === 0 && mods.length === 0) add("warn", "No RXC|B| feed base - the order is created as \"Other See Notes\".", "Feed Base Segment Rules (RX)");
        if (bases.length > 1) add("fail", `${bases.length} RXC|B| segments - multiple feed bases are not supported in a single RX order.`, "Feed Base Segment Rules (RX)");
        bases.forEach((s) => {
          const nm = nameOf(s), amt = tmnpComp(s, 3, 1), uom = tmnpComp(s, 4, 1), milk = tmnpComp(s, 6, 4);
          if (!nm) add("fail", "RXC|B| has no name in RXC-2.2.", "Feed Base Segment Rules (RX)");
          if (uom && !TMNP_CALORIC_UOM_RE.test(uom)) add("fail", `RXC|B| unit "${uom}" is not a caloric UOM (kcal/oz, cal/oz, kcal/ml) - feed base becomes "Other See Notes".`, "Feed Base Segment Rules (RX)");
          if (!amt) {
            if (tmnpIsHumanMilk(nm)) add("info", `Feed base "${nm}" has no calories - EHM/DHM default (20 kcal/oz) applies.`, "Feed Base Segment Rules (RX)");
            else add("fail", `Feed base "${nm}" has no calories in RXC-3.1 - required for bases without a default calorie rule.`, "Feed Base Segment Rules (RX)");
          } else if (/cal\s*\/\s*oz/i.test(uom) && !isWhole(amt)) add("fail", `Feed base calories "${amt}" must be a whole number with ${uom}.`, "Feed Base Segment Rules (RX)");
          else add("pass", `Feed base "${nm}" ${amt} ${uom}${milk ? `, milk type ${milk} (RXC-6.4)` : ""}.`, "Feed Base Segment Rules (RX)");
        });
        adds.forEach((s) => {
          const nm = nameOf(s), amt = tmnpComp(s, 3, 1), uom = tmnpComp(s, 4, 1);
          if (TMNP_CALORIC_UOM_RE.test(uom)) {
            if (!amt) add("fail", `Fortifier "${nm}" needs its calorie goal in RXC-3.1.`, "Fortifier & Modular Segment Rules (RX)");
            else if (!isWhole(amt) && /cal\s*\/\s*oz/i.test(uom)) add("fail", `Fortifier "${nm}" calories "${amt}" must be a whole number.`, "Fortifier & Modular Segment Rules (RX)");
            else add("pass", `RXC|A| "${nm}" ${amt} ${uom} - treated as a FORTIFIER (caloric unit).`, "Fortifier & Modular Segment Rules (RX)");
          } else add("pass", `RXC|A| "${nm}" ${amt} ${uom || ""} - treated as a MODULAR (non-caloric unit). Amount must be numeric only if TMS calculates modular amounts.`, "Fortifier & Modular Segment Rules (RX)");
        });
        const vol = tmnpGet(segs, "RXE-1.1"), freq = tmnpGet(segs, "RXE-1.2"), route = tmnpGet(segs, "RXR-1.2");
        [["RXE-1.1", "Feed volume", vol], ["RXE-1.2", "Feed frequency", freq], ["RXR-1.2", "Feed route", route]].forEach(([ref, lbl, v]) => {
          if (v) add("pass", `${lbl} ${ref} = "${v}".`, "RX segment rules");
          else add("warn", `${lbl} (${ref}) is empty.`, "RX segment rules");
        });
        if (route && byId(/^FEED_ROUTE$/).length) add("warn", "Both RXR-1.2 and an OBX FEED_ROUTE are sent - both go to the order notes for manual review.", "Conflict Resolution Rules");
        if (vol && byId(/^FEED_VOLUME$/).length) add("warn", "Both RXE-1.1 and an OBX FEED_VOLUME are sent - both go to the order notes.", "Conflict Resolution Rules");
        if (freq && byId(/^FEED_FREQUENCY$/).length) add("warn", "Both RXE-1.2 and an OBX FEED_FREQUENCY are sent - both go to the order notes.", "Conflict Resolution Rules");
      }
      if (mods.length) {
        add("pass", `${mods.length} RXC|M| standalone modular(s): ${mods.map(nameOf).join(", ")} - each becomes a separate order.`, "Modular Standalone Order Rules");
        ["MOD_ROUTE", "MOD_FREQUENCY"].forEach((id) => {
          if (!byId(new RegExp(`^${id}$`)).length) add("fail", `Standalone modular needs an OBX ${id}.`, "Modular Standalone Order Rules");
        });
        ["MOD_VOLUME", "MOD_ROUTE", "MOD_FREQUENCY"].forEach((id) => {
          if (byId(new RegExp(`^${id}$`)).length > 1) add("warn", `More than one ${id} - RDE has no grouping, so all go to the notes of every modular order.`, "Modular Standalone Order Rules");
        });
        byId(/^MOD_VOLUME$/).forEach((r) => {
          if (!/^\d+(\.\d+)?$/.test(r.value)) add("warn", `MOD_VOLUME "${r.value}" is not numeric - maps to Notes.`, "Modular Standalone Order Rules");
        });
      }
      segs.filter((s) => s.name === "OBX").forEach((s) => {
        const id = tmnpComp(s, 3, 1);
        if (TMNP_CONSENT_TYPES.some((t) => t.toLowerCase() === id.toLowerCase())) add("warn", `OBX-3.1 = "${id}" - consent must be sent as OBX|..|CONSENT||${id}^${tmnpComp(s, 5, 1) || "YES"}; as written it goes to Notes.`, "Rules for Supplemental OBX Segments");
      });
    } else if (orderType && !["NPO", "Consent update"].includes(orderType)) {
      const bases1 = byId(/^FEED_BASE$/), basesA = byId(/^FEED_BASE_[A-Z]$/), mods = byId(/^MOD_BASE$/);
      if (!bases1.length && !basesA.length && !mods.length) add("warn", "No FEED_BASE identifier - the order is created with feed base \"Other See Notes\".", "Feed Base Identifier Rules");
      bases1.forEach((r) => {
        if (r.related) {
          if (isWhole(r.related)) add("pass", `FEED_BASE "${r.value}" at ${r.related} kcal/oz${r.group ? ` (group ${r.group})` : ""}.`, "Feed Base Identifier Rules - Option 1");
          else add("fail", `FEED_BASE "${r.value}" calories "${r.related}" must be a whole number.`, "Feed Base Identifier Rules - Option 1");
        } else if (tmnpIsHumanMilk(r.value)) add("info", `FEED_BASE "${r.value}" has no calories - EHM/DHM default 20 kcal/oz applies.`, "Feed Base Identifier Rules");
        else add("fail", `FEED_BASE "${r.value}" has no calories in OBX-5.2/NTE-3.4 - required for bases without a default calorie rule.`, "Feed Base Identifier Rules - Option 1");
      });
      basesA.forEach((r) => {
        const letter = r.id.slice(-1);
        const cal = byId(new RegExp(`^FEED_BASECAL_?${letter}$`))[0];
        if (cal) {
          if (isWhole(cal.value)) add("pass", `${r.id} "${r.value}" + ${cal.id} = ${cal.value}.`, "Feed Base Identifier Rules - Option 2");
          else add("fail", `${cal.id} "${cal.value}" must be a whole number.`, "Feed Base Identifier Rules - Option 2");
        } else if (tmnpIsHumanMilk(r.value)) add("info", `${r.id} "${r.value}" has no FEED_BASECAL_${letter} - EHM/DHM default 20 kcal/oz applies.`, "Feed Base Identifier Rules");
        else add("fail", `${r.id} "${r.value}" needs FEED_BASECAL_${letter} - required for bases without a default calorie rule.`, "Feed Base Identifier Rules - Option 2");
      });
      byId(/^FEED_BASECAL_?[A-Z]$/).forEach((r) => {
        if (!byId(new RegExp(`^FEED_BASE_${r.id.slice(-1)}$`)).length) add("fail", `${r.id} has no matching FEED_BASE_${r.id.slice(-1)}.`, "Feed Base Identifier Rules - Option 2");
      });
      byId(/^FORTIFIER$/).forEach((r) => {
        if (isWhole(r.related)) add("pass", `FORTIFIER "${r.value}" to ${r.related} kcal/oz.`, "Fortifier Identifier Rules - Option 1");
        else add("fail", `FORTIFIER "${r.value}" needs a whole-number calorie goal in OBX-5.2/NTE-3.4${r.related ? ` (got "${r.related}")` : ""}.`, "Fortifier Identifier Rules - Option 1");
      });
      byId(/^FORTIFIER_\d+$/).forEach((r) => {
        const n = r.id.split("_")[1];
        const cal = byId(new RegExp(`^FORTIFIERCAL_${n}$`))[0];
        if (!cal) add("fail", `${r.id} "${r.value}" needs FORTIFIERCAL_${n}.`, "Fortifier Identifier Rules - Option 2");
        else if (!isWhole(cal.value)) add("fail", `FORTIFIERCAL_${n} "${cal.value}" must be a whole number.`, "Fortifier Identifier Rules - Option 2");
        else add("pass", `${r.id} "${r.value}" + FORTIFIERCAL_${n} = ${cal.value}.`, "Fortifier Identifier Rules - Option 2");
      });
      byId(/^MODULAR$/).forEach((r) => {
        if (r.related) add("pass", `MODULAR "${r.value}" amount ${r.related}.`, "Modular Identifier Rules - Option 1");
        else add("fail", `MODULAR "${r.value}" needs its amount in OBX-5.2/NTE-3.4.`, "Modular Identifier Rules - Option 1");
      });
      byId(/^MODULAR_\d+$/).forEach((r) => {
        const n = r.id.split("_")[1];
        if (!byId(new RegExp(`^MODULARAMT_${n}$`)).length) add("fail", `${r.id} "${r.value}" needs MODULARAMT_${n}.`, "Modular Identifier Rules - Option 2");
      });
      byId(/^FEED_VOLUME$/).forEach((r) => {
        if (/^\d+(\.\d+)?$/.test(r.value)) add("pass", `FEED_VOLUME ${r.value}.`, "Feed Volume Identifier Rules");
        else add("fail", `FEED_VOLUME "${r.value}" must be numeric only.`, "Feed Volume Identifier Rules");
      });
      const baseCount = bases1.length + basesA.length;
      ["FEED_ROUTE", "FEED_VOLUME", "FEED_FREQUENCY", "MILK_TYPE"].forEach((id) => {
        const list = byId(new RegExp(`^${id}$`));
        const ungrouped = list.filter((r) => !r.group);
        if (ungrouped.length > 1) add("warn", `${ungrouped.length} ${id} lines without a Grouping ID - only one per feed base is allowed, so they go to the notes of every order.`, `${id} rules`);
        else if (list.length === 1 && id !== "FEED_VOLUME") add("pass", `${id} "${list[0].value}".`, `${id} rules`);
      });
      if (baseCount > 1) {
        const groups = [...bases1, ...basesA].map((r) => r.group).filter(Boolean);
        add("info", `${baseCount} feed bases - TMS creates a separate order for each.${groups.length ? ` Grouping IDs used: ${[...new Set(groups)].join(", ")}.` : " Lines without a Grouping ID apply to every order."}`, "Grouping ID");
      }
      if (mods.length) {
        ["MOD_ROUTE", "MOD_FREQUENCY"].forEach((id) => {
          if (!byId(new RegExp(`^${id}$`)).length) add("fail", `MOD_BASE standalone order needs ${id}.`, "Modular Standalone Order Rules");
        });
        byId(/^MOD_VOLUME$/).forEach((r) => {
          if (!/^\d+(\.\d+)?$/.test(r.value)) add("warn", `MOD_VOLUME "${r.value}" is not numeric - maps to Notes.`, "Modular Standalone Order Rules");
        });
        if (mods.length > 1 && mods.some((m) => !m.group)) add("info", "Multiple MOD_BASE without Grouping IDs - MOD_VOLUME/ROUTE/FREQUENCY apply to all standalone modular orders.", "Modular Standalone Order Rules");
      }
    }
  } else if (msgType === "ORU") {
    summary.kind = "Outgoing feed result (TMS -> EHR)";
    summary.action = "Feed result";
    if (trigger !== "R01") add("warn", `ORU trigger ${trigger} - TMS sends ORU^R01.`, "Outgoing EHR HL7 Message");
    else add("pass", "ORU^R01 feed result.", "Outgoing EHR HL7 Message");
    const p11 = tmnpGet(segs, "MSH-11.1");
    if (p11 && !["T", "P"].includes(p11.toUpperCase())) add("warn", `MSH-11.1 = "${p11}" - TMS sends T (UAT) or P (Production).`, "MSH Segment Outbound Defaults");
    if (tmnpGet(segs, "OBR-25.1") && tmnpGet(segs, "OBR-25.1").toUpperCase() !== "F") add("warn", "OBR-25.1 should be F (Final).", "OBR Segment Outbound Defaults");
    segs.filter((s) => s.name === "OBX").forEach((s) => {
      const id = tmnpComp(s, 3, 1);
      if (!TMNP_RESULT_IDS.includes(id.toUpperCase())) add("warn", `Result OBX-3.1 "${id}" is not in the result identifier table.`, "Result OBX Identifier table");
      if (tmnpComp(s, 2, 1) && tmnpComp(s, 2, 1).toUpperCase() !== "TX") add("warn", `OBX-2 for ${id} is "${tmnpComp(s, 2, 1)}" - TMS sends TX.`, "OBX Segment Outbound Defaults");
    });
  } else {
    summary.kind = msgType ? `${msgType} message` : "Unknown message";
    add("fail", `${msgType || "This message type"} is not handled by the TMS Interface. Supported inbound: ADT (listed events), ORM^O01, RDE^O11. Outbound: ORU^R01.`, "Supported message types");
  }
  return { summary, checks };
}

export function evaluateObxNteRequirement(vendorSegment, transformedText) {
  const m = stripOccurrenceSuffix(vendorSegment || "").match(/^(OBX|NTE)-(\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const pos = `${m[1]}-${m[2]}`;
  const which = { "OBX-3.1": "id", "NTE-3.1": "id", "OBX-3": "id", "OBX-4.1": "group", "NTE-3.2": "group", "OBX-4": "group", "OBX-5.1": "value", "NTE-3.3": "value", "OBX-5": "value", "OBX-5.2": "related", "NTE-3.4": "related" }[pos];
  if (!which) return null;
  const rows = [];
  (transformedText || "").split("\n").forEach((line) => {
    const p = line.split("|");
    if (p[0] === "OBX") {
      const v = (p[5] || "").split("^");
      rows.push({ id: ((p[3] || "").split("^")[0] || "").trim(), group: (p[4] || "").trim(), value: (v[0] || "").trim(), related: (v[1] || "").trim() });
    } else if (p[0] === "NTE") {
      const c = (p[3] || "").split("^");
      rows.push({ id: (c[0] || "").trim(), group: (c[1] || "").trim(), value: (c[2] || "").trim(), related: (c[3] || "").trim() });
    }
  });
  if (rows.length === 0) return { has: false, value: null, valueOk: true };
  if (which === "id") {
    const recognized = rows.filter((r) => descriptionForFieldIdentifier(r.id)).map((r) => r.id);
    const notRecognized = rows.filter((r) => r.id && !descriptionForFieldIdentifier(r.id)).map((r) => r.id);
    const parts = [];
    if (recognized.length) parts.push(recognized.join(", "));
    if (notRecognized.length) parts.push(`not TMNP identifiers (go to Notes): ${notRecognized.join(", ")}`);
    return { has: rows.some((r) => r.id), value: parts.join(" | "), valueOk: recognized.length > 0 };
  }
  if (which === "group") {
    const g = rows.filter((r) => r.group).map((r) => `${r.id}:${r.group}`);
    return { has: g.length > 0, value: g.join(", ") || null, valueOk: true };
  }
  if (which === "value") {
    const vals = rows.filter((r) => r.value && descriptionForFieldIdentifier(r.id)).map((r) => `${r.id}=${r.value}`);
    return { has: rows.some((r) => r.value), value: vals.join(", ") || rows.filter((r) => r.value).map((r) => r.value).join(", "), valueOk: true };
  }
  const rel = rows.filter((r) => r.related).map((r) => `${r.id}=${r.related}`);
  const sepCal = rows.filter((r) => /^(FEED_BASECAL_|FORTIFIERCAL_|MODULARAMT_)/.test(r.id)).map((r) => `${r.id}=${r.value}`);
  const all = [...rel, ...sepCal];
  return { has: all.length > 0, value: all.join(", ") || null, valueOk: true };
}
export function useCompatibilityReport({ clientEntries, vendorEntries, setVendorEntries, hl7Text, hl7Summary, workflowLabel }) {
  const [showReport, setShowReport] = useState(false);
  const [activeStatuses, setActiveStatuses] = useState(() => new Set());
  const [identifierMap, setIdentifierMap] = useState({});
  const [groupMap, setGroupMap] = useState({});
  const [calorieFormat, setCalorieFormat] = useState("as-mapped");
  const [applyMilkDefault, setApplyMilkDefault] = useState(true);
  function setFieldGroup(key, g) {
    setGroupMap((prev) => {
      const next = { ...prev };
      if (g) next[key] = g;
      else delete next[key];
      return next;
    });
  }
  const clientIdentifierFields = useMemo(() => listClientIdentifierFields(hl7Text), [hl7Text]);
  function setFieldIdentifier(key, id) {
    setIdentifierMap((prev) => {
      const next = { ...prev };
      if (id) next[key] = id;
      else delete next[key];
      return next;
    });
    if (!id || id === OMIT_IDENTIFIER || id === NA_IDENTIFIER || id === OTHER_IDENTIFIER) return;
    const row = clientIdentifierFields.find((r) => r.key === key);
    if (!row) return;
    setVendorEntries((prev) => prev.map((v) => {
      if (!v.segment || !/^(OBX|NTE|OBXNTE)\|/.test(v.segment)) return v;
      if (stripPipePrefix(stripOccurrenceSuffix(v.segment)).replace(/\.\d+$/, "").toUpperCase() !== id) return v;
      const existing = (v.aliases || "").split(",").map((a) => a.trim()).filter(Boolean);
      if (existing.some((a) => normalizeAliasText(a) === normalizeAliasText(row.label))) return v;
      return { ...v, aliases: [...existing, row.label].join(", ") };
    }));
  }
  function applySuggestedIdentifiers() {
    clientIdentifierFields.forEach((r) => {
      if (identifierMap[r.key]) return;
      const s = suggestIdentifier(r.label);
      if (s) setFieldIdentifier(r.key, s);
    });
  }
  function toggleStatus(status) {
    setActiveStatuses((prev) => {
      if (prev.size === 1 && prev.has(status)) return new Set();
      return new Set([status]);
    });
  }
  const relevantSegmentTypesForTranslation = useMemo(() => {
    const set = new Set();
    vendorEntries.forEach((v) => {
      if (!v.segment) return;
      const t = segmentTypeOf(v.segment);
      if (t === "OBXNTE") {
        set.add("OBX");
        set.add("NTE");
      } else if (t) set.add(t);
    });
    return set;
  }, [vendorEntries]);
  const { claimedClientSegments, satisfiedVendorIds } = useMemo(() => {
    const claimedClientSegments2 = new Set();
    const satisfiedVendorIds2 = new Set();
    vendorEntries.forEach((v) => {
      if (!v.segment) return;
      const matches = clientEntries.filter((c) => segmentsAlign(c.segment, v.segment) || matchesAlias(c.segment, v.aliases));
      if (matches.length > 0) {
        satisfiedVendorIds2.add(v.id);
        matches.forEach((m) => claimedClientSegments2.add(normalizeSegment(m.segment)));
      }
    });
    return { claimedClientSegments: claimedClientSegments2, satisfiedVendorIds: satisfiedVendorIds2 };
  }, [clientEntries, vendorEntries]);
  const unmappedClientIdentifiers = useMemo(() => {
    if (clientEntries.length === 0 || vendorEntries.length === 0) return [];
    const seenIdentifiers = new Set();
    const seenPositional = new Set();
    return clientEntries.filter((c) => {
      if (!c.segment || claimedClientSegments.has(normalizeSegment(c.segment))) return false;
      const idName = identifierNameOf(c.segment);
      if (idName) {
        if (seenIdentifiers.has(idName)) return false;
        seenIdentifiers.add(idName);
        return true;
      }
      const segType = segmentTypeOf(c.segment);
      if (!segType || !relevantSegmentTypesForTranslation.has(segType)) return false;
      const posKey = normalizeSegment(c.segment);
      if (seenPositional.has(posKey)) return false;
      seenPositional.add(posKey);
      return true;
    });
  }, [clientEntries, vendorEntries, relevantSegmentTypesForTranslation, claimedClientSegments]);
  function optionsForUnmapped(c) {
    const detectedWorkflow = detectedContextOf(hl7Summary);
    const idName = identifierNameOf(c.segment);
    const options = [];
    const seen = new Set();
    if (idName) {
      const clientSegType = segmentTypeOf(c.segment);
      vendorEntries.forEach((v) => {
        if (!v.segment) return;
        if (/^(OBX|NTE|OBXNTE)\|/.test(v.segment)) {
          if (!workflowMatches(v.workflow, detectedWorkflow, workflowLabel)) return;
          const base = stripPipePrefix(v.segment);
          if (seen.has(base)) return;
          seen.add(base);
          const knownDescription = descriptionForFieldIdentifier(base);
          options.push({ display: base + (knownDescription ? ` \u2014 ${knownDescription}` : ""), vendorEntryId: v.id });
        } else {
          if (segmentTypeOf(v.segment) !== clientSegType) return;
          if (satisfiedVendorIds.has(v.id)) return;
          if (!workflowMatches(v.workflow, detectedWorkflow, workflowLabel)) return;
          if (seen.has(v.segment)) return;
          seen.add(v.segment);
          const fieldIdDescription = v.fieldId ? descriptionForFieldIdentifier(v.fieldId) : null;
          const displayName = v.fieldId ? v.fieldId + (fieldIdDescription ? ` \u2014 ${fieldIdDescription}` : "") : v.label;
          options.push({ display: v.segment + (displayName ? ` (${displayName})` : ""), vendorEntryId: v.id });
        }
      });
    } else {
      const segType = segmentTypeOf(c.segment);
      const rxFamily = formatCategoryOf(c.segment) === "RX";
      vendorEntries.forEach((v) => {
        if (!v.segment) return;
        if (/^(OBX|NTE|OBXNTE)\|/.test(v.segment)) {
          const vSegType = segmentTypeOf(v.segment);
          const matchesSegType = vSegType === segType || vSegType === "OBXNTE" && (segType === "OBX" || segType === "NTE");
          if (!matchesSegType) return;
          if (satisfiedVendorIds.has(v.id)) return;
          if (!workflowMatches(v.workflow, detectedWorkflow, workflowLabel)) return;
          const base = stripPipePrefix(v.segment);
          if (seen.has(base)) return;
          seen.add(base);
          const knownDescription = descriptionForFieldIdentifier(base);
          options.push({ display: base + (knownDescription ? ` \u2014 ${knownDescription}` : ""), vendorEntryId: v.id });
        } else {
          const sameSegType = segmentTypeOf(v.segment) === segType;
          const sameRxFamily = rxFamily && formatCategoryOf(v.segment) === "RX";
          if (!sameSegType && !sameRxFamily) return;
          if (satisfiedVendorIds.has(v.id)) return;
          if (!workflowMatches(v.workflow, detectedWorkflow, workflowLabel)) return;
          if (seen.has(v.segment)) return;
          seen.add(v.segment);
          const fieldIdDescription = v.fieldId ? descriptionForFieldIdentifier(v.fieldId) : null;
          const displayName = v.fieldId ? v.fieldId + (fieldIdDescription ? ` \u2014 ${fieldIdDescription}` : "") : v.label;
          options.push({ display: v.segment + (displayName ? ` (${displayName})` : ""), vendorEntryId: v.id });
        }
      });
    }
    return options;
  }
  const [dismissedTranslations, setDismissedTranslations] = useState(() => new Set());
  const [translationOther, setTranslationOther] = useState({});
  function dismissTranslation(clientSegment) {
    setDismissedTranslations((prev) => new Set([...prev, clientSegment]));
  }
  function applyTranslationOther(clientSegment, targetRaw) {
    const target = (targetRaw || "").trim().toUpperCase().replace(/\s+/g, "");
    if (!target) return;
    setVendorEntries((prev) => {
      const hit = prev.find((v) => v.segment && segmentsAlign(v.segment, target));
      if (hit) {
        return prev.map((v) => {
          if (v.id !== hit.id) return v;
          const list = (v.aliases || "").split(",").map((a) => a.trim()).filter(Boolean);
          if (list.some((a) => normalizeAliasText(a) === normalizeAliasText(clientSegment))) return v;
          const ua = (v.userAliases || "").split(",").map((a) => a.trim()).filter(Boolean);
          return { ...v, aliases: [...list, clientSegment].join(", "), userAliases: [...ua, clientSegment].join(", ") };
        });
      }
      return [...prev, { id: newId(), segment: target, label: `Mapped from ${clientSegment}`, level: "optional", acceptedValues: "", workflow: "any", fieldId: "", aliases: clientSegment, userAliases: clientSegment }];
    });
    setTranslationOther((prev) => {
      const next = { ...prev };
      delete next[clientSegment];
      return next;
    });
  }
  const actionableUnmappedFields = useMemo(() => {
    return unmappedClientIdentifiers.filter((c) => !identifierNameOf(c.segment) && !dismissedTranslations.has(c.segment)).map((c) => ({ entry: c, options: optionsForUnmapped(c) })).filter((row) => row.options.length > 0);
  }, [unmappedClientIdentifiers, vendorEntries, hl7Summary, workflowLabel, satisfiedVendorIds, dismissedTranslations]);
  function applyTranslation(clientSegment, vendorEntryId) {
    if (!vendorEntryId) return;
    const idName = identifierNameOf(clientSegment);
    const aliasToAdd = idName || clientSegment;
    if (!aliasToAdd) return;
    setVendorEntries((prev) => prev.map((v) => {
      if (v.id !== vendorEntryId) return v;
      const existingAliases = (v.aliases || "").split(",").map((a) => a.trim()).filter(Boolean);
      if (existingAliases.some((a) => normalizeAliasText(a) === normalizeAliasText(aliasToAdd))) return v;
      const ua = (v.userAliases || "").split(",").map((a) => a.trim()).filter(Boolean);
      return { ...v, aliases: [...existingAliases, aliasToAdd].join(", "), userAliases: [...ua, aliasToAdd].join(", ") };
    }));
  }
  const messageRules = useMemo(() => {
    try {
      return evaluateTmnpMessageRules(hl7Text, buildTransformedMessage(hl7Text, vendorEntries, identifierMap, { groupMap, calorieFormat, applyMilkDefault }).text);
    } catch (e) {
      return { summary: null, checks: [] };
    }
  }, [hl7Text, vendorEntries, identifierMap, groupMap, calorieFormat, applyMilkDefault]);
  const transformedMessage = useMemo(() => buildTransformedMessage(hl7Text, vendorEntries, identifierMap, { groupMap, calorieFormat, applyMilkDefault }), [hl7Text, vendorEntries, identifierMap, groupMap, calorieFormat, applyMilkDefault]);
  const report = useMemo(() => {
    if (!showReport) return null;
    const reportClientEntries = clientEntries.map((c) => {
      const name = identifierNameOf(c.segment);
      if (!name) return c;
      const mapped = identifierMap[identifierKey(name)];
      if (!mapped) return c;
      if (mapped === OMIT_IDENTIFIER) return null;
      if (mapped === OTHER_IDENTIFIER) return c;
      if (mapped === NA_IDENTIFIER) return { ...c, markedNA: true };
      return { ...c, segment: c.segment.replace(name, mapped), mappedFrom: name, mappedTo: mapped };
    }).filter(Boolean);
    const detectedWorkflow = detectedContextOf(hl7Summary);
    const presentSegmentTypes = new Set(reportClientEntries.map((c) => segmentTypeOf(c.segment)).filter(Boolean));
    const relevantSegmentTypes = new Set();
    vendorEntries.forEach((v) => {
      if (!v.segment) return;
      const t = segmentTypeOf(v.segment);
      if (t === "OBXNTE") {
        relevantSegmentTypes.add("OBX");
        relevantSegmentTypes.add("NTE");
      } else if (t) relevantSegmentTypes.add(t);
      (v.aliases || "").split(",").map((a) => a.trim()).filter(Boolean).forEach((a) => {
        const at = segmentTypeOf(a);
        if (at) relevantSegmentTypes.add(at);
      });
    });
    const presentFormats = new Set(reportClientEntries.map((c) => formatCategoryOf(c.segment)).filter(Boolean));
    const rows = [];
    vendorEntries.forEach((v) => {
      if (!v.segment) return;
      const workflowOk = workflowMatches(v.workflow, detectedWorkflow, workflowLabel);
      const segType = segmentTypeOf(v.segment);
      const vFormat = formatCategoryOf(v.segment);
      const aliasSegmentTypes = (v.aliases || "").split(",").map((a) => a.trim()).filter(Boolean).map((a) => segmentTypeOf(a)).filter(Boolean);
      let segmentTypeOk;
      if (segType === "OBXNTE") {
        segmentTypeOk = reportClientEntries.length === 0 || presentFormats.has("OBX") || presentFormats.has("NTE");
      } else if (vFormat) {
        segmentTypeOk = reportClientEntries.length === 0 || presentFormats.has(vFormat) || aliasSegmentTypes.some((t) => presentFormats.has(t));
      } else {
        segmentTypeOk = reportClientEntries.length === 0 || !segType || presentSegmentTypes.has(segType) || aliasSegmentTypes.some((t) => presentSegmentTypes.has(t));
      }
      const applicable = workflowOk && segmentTypeOk;
      const notApplicableReason = !workflowOk ? "different workflow" : !segmentTypeOk ? vFormat ? `message uses a different segment format (this requirement is ${vFormat}-specific)` : `message doesn't use ${segType} segments` : null;
      const obxEval = /^result/.test(v.workflow || "") ? null : evaluateObxNteRequirement(v.segment, transformedMessage.text);
      const directMatch = obxEval ? null : reportClientEntries.find((c) => segmentsAlign(c.segment, v.segment));
      const aliasMatch = obxEval || directMatch ? null : reportClientEntries.find((c) => matchesAlias(c.segment, v.aliases));
      let match = obxEval ? obxEval.has ? { segment: `${v.segment} / ${(v.aliases || "").split(",")[0].trim() || v.segment} (transformed message)`, value: obxEval.value } : null : directMatch || aliasMatch;
      if (!match && /^RXC-[34](\.1)?$/.test(v.segment)) {
        const rxBase = reportClientEntries.find((c) => /^RXC-2\(B\)/.test(c.segment));
        if (rxBase && HUMAN_MILK_RE.test(rxBase.value || "") && !reportClientEntries.some((c) => /^RXC-3\(B\)/.test(c.segment))) match = { segment: v.segment.replace(/\.1$/, "") + "(B)", value: `(none sent - ${rxBase.value} uses the EHM/DHM default 20 kcal/oz)` };
      }
      const matchedViaAlias = !directMatch && !!aliasMatch;
      const has = !!match;
      let status;
      if (!applicable) status = "not-applicable";
      else if (v.level === "required") status = !has ? "missing" : !(obxEval ? obxEval.valueOk : valueMatchesAccepted(match.value, v.acceptedValues)) ? "value-mismatch" : "aligned";
      else if (v.level === "conditional") status = !has ? "conditional-missing" : !(obxEval ? obxEval.valueOk : valueMatchesAccepted(match.value, v.acceptedValues)) ? "value-mismatch" : "aligned";
      else status = !has ? "optional-gap" : !(obxEval ? obxEval.valueOk : valueMatchesAccepted(match.value, v.acceptedValues)) ? "value-mismatch" : "aligned-optional";
      rows.push({
        vendorSegment: v.segment,
        label: v.label,
        level: v.level,
        workflow: v.workflow || "any",
        acceptedValues: v.acceptedValues,
        clientSegment: match?.segment || null,
        clientValue: match?.value || null,
        status,
        applicable,
        notApplicableReason,
        matchedViaAlias
      });
    });
    const translatedFields = rows.filter((r) => r.matchedViaAlias).map((r) => ({
      rawSegment: r.clientSegment,
      rawValue: r.clientValue,
      vendorSegment: r.vendorSegment,
      vendorLabel: r.label
    }));
    const disregardedSegmentTypes = [...presentSegmentTypes].filter((t) => relevantSegmentTypes.size > 0 && !relevantSegmentTypes.has(t)).sort();
    const disregardedFieldCount = reportClientEntries.filter((c) => disregardedSegmentTypes.includes(segmentTypeOf(c.segment))).length;
    const matchedClientNorms = new Set(rows.filter((r) => r.clientSegment).map((r) => normalizeSegment(stripOccurrenceSuffix(r.clientSegment))));
    const obxCoveredByPosition = rows.some((r) => r.applicable && /^(OBX|NTE)-(3|5)/.test(r.vendorSegment));
    const extra = reportClientEntries.filter((c) => {
      if (!c.segment) return false;
      if (obxCoveredByPosition && (identifierNameOf(c.segment) || ["OBX", "NTE"].includes(segmentTypeOf(c.segment)))) return false;
      if (relevantSegmentTypes.size > 0 && !relevantSegmentTypes.has(segmentTypeOf(c.segment))) return false;
      const norm = normalizeSegment(c.segment);
      if (matchedClientNorms.has(norm)) return false;
      if (norm.endsWith(".2") && matchedClientNorms.has(norm.slice(0, -2))) return false;
      const strippedBase = normalizeSegment(stripOccurrenceSuffix(c.segment));
      if (strippedBase !== norm && matchedClientNorms.has(strippedBase)) return false;
      if (vendorEntries.some((v) => matchesAlias(c.segment, v.aliases))) return false;
      return true;
    }).map((c) => {
      const idName = identifierNameOf(c.segment);
      const recognizedFromVendor = new Set();
      vendorEntries.forEach((v) => {
        const vIdName = identifierNameOf(v.segment);
        if (vIdName) recognizedFromVendor.add(normalizeAliasText(vIdName));
        (v.aliases || "").split(",").map((a) => a.trim()).filter(Boolean).forEach((a) => recognizedFromVendor.add(normalizeAliasText(a)));
      });
      const knownTmnp = !!idName && !!descriptionForFieldIdentifier(idName);
      const isUnrecognizedIdentifier = !c.markedNA && !!idName && !knownTmnp && !recognizedFromVendor.has(normalizeAliasText(idName));
      const meaning = c.markedNA ? "Marked N/A - not applicable for this vendor, left as sent" : c.mappedTo ? `Mapped from "${c.mappedFrom}" \u2192 ${c.mappedTo}${descriptionForFieldIdentifier(c.mappedTo) ? " \u2014 " + descriptionForFieldIdentifier(c.mappedTo) : ""}` : knownTmnp ? descriptionForFieldIdentifier(idName) : c.meaning;
      return { ...c, meaning, isUnrecognizedIdentifier };
    });
    const applicableRows = rows.filter((r) => r.applicable);
    const notApplicableCount = rows.length - applicableRows.length;
    const required = applicableRows.filter((r) => r.level === "required");
    const conditional = applicableRows.filter((r) => r.level === "conditional");
    const optional = applicableRows.filter((r) => r.level === "optional");
    const requiredAligned = required.filter((r) => r.status === "aligned").length;
    const requiredMissing = required.filter((r) => r.status === "missing").length;
    const requiredValueMismatch = required.filter((r) => r.status === "value-mismatch").length;
    const readinessPct = required.length ? Math.round(requiredAligned / required.length * 100) : 100;
    const statusCounts = {};
    rows.forEach((r) => {
      statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
    });
    return {
      rows,
      extra,
      required,
      conditional,
      optional,
      requiredAligned,
      requiredMissing,
      requiredValueMismatch,
      readinessPct,
      detectedWorkflow,
      notApplicableCount,
      totalLoaded: vendorEntries.length,
      statusCounts,
      translatedFields,
      disregardedSegmentTypes,
      disregardedFieldCount
    };
  }, [showReport, clientEntries, vendorEntries, hl7Summary, workflowLabel, identifierMap, transformedMessage]);
  return {
    showReport,
    setShowReport,
    activeStatuses,
    toggleStatus,
    setActiveStatuses,
    unmappedClientIdentifiers,
    actionableUnmappedFields,
    optionsForUnmapped,
    applyTranslation,
    dismissTranslation,
    applyTranslationOther,
    translationOther,
    setTranslationOther,
    transformedMessage,
    clientIdentifierFields,
    identifierMap,
    setFieldIdentifier,
    applySuggestedIdentifiers,
    groupMap,
    setFieldGroup,
    calorieFormat,
    setCalorieFormat,
    applyMilkDefault,
    setApplyMilkDefault,
    messageRules,
    report
  };
}
