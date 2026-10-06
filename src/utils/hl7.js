export function normalizeSegment(s) {
  return (s || "").replace(/\s+/g, "").toUpperCase();
}
export function stripOccurrenceSuffix(s) {
  return (s || "").replace(/#\d+/, "").replace(/\[\d+\]/, "");
}
export function segmentTypeOf(seg) {
  if (!seg) return null;
  const stripped = stripOccurrenceSuffix(seg);
  if (stripped.includes("|")) return stripped.split("|")[0].toUpperCase();
  const m = stripped.match(/^([A-Z]{2,3}[0-9]?)[-(]/i);
  return m ? m[1].toUpperCase() : null;
}
export const RX_TYPES = new Set(["RXO", "RXE", "RXR", "RXC"]);
export function formatCategoryOf(seg) {
  const t = segmentTypeOf(seg);
  if (t === "OBX") return "OBX";
  if (t === "NTE") return "NTE";
  if (RX_TYPES.has(t)) return "RX";
  return null;
}
export function segFieldKey(s) {
  const m = (s || "").match(/^([A-Z]{2,3}[0-9]?)-(\d+)(?:\.(\d+))?$/i);
  if (!m) return null;
  return { seg: m[1].toUpperCase(), field: m[2], comp: m[3] || null };
}
export function stripPipePrefix(s) {
  return (s || "").replace(/^(OBX|NTE|OBXNTE)\|/, "");
}
export function segmentsAlign(rawA, rawB) {
  if (!rawA || !rawB) return false;
  const rxTypeA = (rawA.match(/^RXC-\d+(?:\.\d+)?\(([A-Z])\)/) || [])[1];
  const rxTypeB = (rawB.match(/^RXC-\d+(?:\.\d+)?\(([A-Z])\)/) || [])[1];
  if ((rxTypeA || rxTypeB) && /^RXC-/.test(rawA) && /^RXC-/.test(rawB)) {
    if (rxTypeA && rxTypeB && rxTypeA !== rxTypeB) return false;
    const fa = (rawA.match(/^RXC-(\d+)/) || [])[1];
    const fb = (rawB.match(/^RXC-(\d+)/) || [])[1];
    if (fa !== fb) return false;
    const typed = rxTypeA || rxTypeB;
    if (!(rxTypeA && rxTypeB) && ["3", "4", "6"].includes(fa) && typed !== "B") return false;
    return true;
  }
  const a = stripOccurrenceSuffix(rawA);
  const b = stripOccurrenceSuffix(rawB);
  const aFlexible = /^OBXNTE\|/.test(a);
  const bFlexible = /^OBXNTE\|/.test(b);
  if (aFlexible || bFlexible) {
    if (a.includes("|") && b.includes("|")) {
      return normalizeSegment(stripPipePrefix(a)) === normalizeSegment(stripPipePrefix(b));
    }
  }
  if (a.includes("|") || b.includes("|")) return normalizeSegment(a) === normalizeSegment(b);
  const pa = segFieldKey(a);
  const pb = segFieldKey(b);
  if (!pa || !pb) return normalizeSegment(a) === normalizeSegment(b);
  if (pa.seg !== pb.seg || pa.field !== pb.field) return false;
  const occA = (rawA.match(/\[(\d+)\]/) || [])[1];
  const occB = (rawB.match(/\[(\d+)\]/) || [])[1];
  if (occA && occB && occA !== occB) return false;
  if (pa.comp && pb.comp) return pa.comp === pb.comp;
  const specifiedComp = pa.comp || pb.comp;
  if (specifiedComp) return specifiedComp === "1";
  return true;
}
export function valueMatchesAccepted(value, acceptedValuesStr) {
  if (!acceptedValuesStr || !value) return true;
  const v = value.trim().toLowerCase();
  const tokens = acceptedValuesStr.split(/[,/]/).map((t) => t.trim().toLowerCase()).filter(Boolean);
  if (tokens.length === 0) return true;
  if (tokens.includes(v)) return true;
  const escaped = v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(acceptedValuesStr);
}
export function comp(field, n = 1) {
  return (field || "").split("^")[n - 1] || "";
}
export const SKIP_SEGMENTS = new Set(["BHS", "BTS", "FHS", "FTS"]);
export const HL7_MEANING_LOOKUP = {
  "MSH-7": "Message date/time",
  "MSH-9": "Message type",
  "MSH-10": "Message control ID",
  "MSH-11": "Processing ID",
  "MSH-12": "Version ID",
  "PID-2": "Patient ID (external / MPID)",
  "PID-3": "Patient identifier (MRN)",
  "PID-5": "Patient name",
  "PID-7": "Date of birth",
  "PID-8": "Sex",
  "PID-18": "Patient account / encounter number",
  "PV1-2": "Patient class",
  "PV1-3": "Assigned patient location (unit/room/bed)",
  "NK1-2": "Next of kin / guardian name",
  "NK1-3": "Relationship",
  "NK1-5": "Phone number",
  "NK1-16": "Next of kin date of birth",
  "ORC-1": "Order control code",
  "ORC-2": "Placer order number",
  "ORC-7": "Quantity/timing (order date/time)",
  "ORC-15": "Order effective date/time",
  "OBR-2": "Placer order number",
  "OBR-3": "Filler order number",
  "OBR-4": "Universal service ID (order name)",
  "OBR-7": "Observation date/time",
  "OBR-10": "Collector identifier / name",
  "OBR-25": "Result status (F = Final)",
  "RXE-1": "Quantity/timing (dose/frequency)",
  "RXR-1": "Route",
  "RXC-1": "Component type code (base/additive/modular)",
  "RXC-2": "Component code/name",
  "RXC-3": "Component amount",
  "RXC-4": "Component units"
};
export function meaningForSegment(segKey) {
  const fieldLevel = segKey.replace(/\.\d+$/, "");
  return HL7_MEANING_LOOKUP[segKey] || HL7_MEANING_LOOKUP[fieldLevel] || "";
}
export const KNOWN_HL7_SEGMENTS = [
  "MSH",
  "PID",
  "PV1",
  "PV2",
  "NK1",
  "ORC",
  "OBR",
  "OBX",
  "RXO",
  "RXE",
  "RXR",
  "RXC",
  "NTE",
  "IN1",
  "IN2",
  "GT1",
  "AL1",
  "DG1",
  "MRG",
  "EVN",
  "ODS",
  "ODT",
  "TQ1",
  "PD1",
  "ROL",
  "SPM"
];
export function normalizeHL7Raw(raw) {
  let text = (raw || "").replace(/\\r\\n|\\r|\\n/g, "\n");
  const segAlt = KNOWN_HL7_SEGMENTS.join("|");
  const re = new RegExp(`\\b(${segAlt})\\|`, "g");
  text = text.replace(re, "\n$1|");
  return text;
}
export function parseHL7Segments(raw) {
  const segments = {};
  let lastFieldsRef = null;
  normalizeHL7Raw(raw).split(/\r\n|\r|\n/).map((l) => l.trim()).filter(Boolean).forEach((line) => {
    const parts = line.split("|");
    const name = parts[0];
    if (name === "" && lastFieldsRef) {
      lastFieldsRef.push(...parts.slice(1));
      return;
    }
    if (parts.length === 1 && lastFieldsRef && !KNOWN_HL7_SEGMENTS.includes(name)) {
      const lastIdx = lastFieldsRef.length - 1;
      lastFieldsRef[lastIdx] = (lastFieldsRef[lastIdx] ? lastFieldsRef[lastIdx] + " " : "") + line;
      return;
    }
    if (!segments[name]) segments[name] = [];
    segments[name].push(parts);
    lastFieldsRef = segments[name][segments[name].length - 1];
  });
  return segments;
}
export function detectWorkflow(segments) {
  const msh = segments["MSH"]?.[0];
  if (!msh) return { msgType: null, trigger: null, workflow: null };
  const msh9 = msh[8] || "";
  const msgType = comp(msh9, 1).toUpperCase();
  const trigger = comp(msh9, 2).toUpperCase();
  let workflow = "unknown";
  if (msgType === "ADT") workflow = "adt";
  else if (msgType === "ORM" || msgType === "RDE") workflow = "order";
  else if (msgType === "ORU") workflow = "result";
  return { msgType, trigger, workflow };
}
export function resolveIdentifierVariant(rawIdentifier) {
  return { base: (rawIdentifier || "").trim().toUpperCase(), companion: false, variant: null };
}
export function extractGenericHL7(raw) {
  const segments = parseHL7Segments(raw);
  const workflowInfo = detectWorkflow(segments);
  const rows = [];
  const identifierCounts = {};
  const variantOccurrence = {};
  function occurrenceFor(base, variant) {
    if (variant == null) {
      identifierCounts[base] = (identifierCounts[base] || 0) + 1;
      return identifierCounts[base];
    }
    const mapKey = `${base}:${variant}`;
    if (!variantOccurrence[mapKey]) {
      identifierCounts[base] = (identifierCounts[base] || 0) + 1;
      variantOccurrence[mapKey] = identifierCounts[base];
    }
    return variantOccurrence[mapKey];
  }
  Object.entries(segments).forEach(([segName, occurrences]) => {
    if (SKIP_SEGMENTS.has(segName)) return;
    const needsOccurrenceIndex = occurrences.length > 1 && !["OBX", "NTE", "RXC"].includes(segName);
    occurrences.forEach((fields, occIdx) => {
      const segNameForKey = needsOccurrenceIndex ? `${segName}[${occIdx + 1}]` : segName;
      if (segName === "OBX") {
        const setId = fields[1] || "";
        const rawIdentifier = comp((fields[3] || "").trim(), 1);
        const value = fields[5] || "";
        if (rawIdentifier) {
          const resolved = resolveIdentifierVariant(rawIdentifier);
          const occurrence = occurrenceFor(resolved.base, resolved.variant);
          const suffix = occurrence > 1 ? `#${occurrence}` : "";
          const setIdNote = setId ? ` (OBX set ID ${setId})` : "";
          const variantNote = resolved.variant ? ` [split form: ${rawIdentifier.trim()}]` : "";
          if (resolved.companion) {
            const v = comp(value, 1);
            if (v) rows.push({ segment: `OBX|${resolved.base}${suffix}.2`, meaning: `${resolved.base} - code/quantity${variantNote}${setIdNote}`, value: v });
          } else {
            const c1 = comp(value, 1), c2 = comp(value, 2);
            if (c1 && c2) {
              rows.push({ segment: `OBX|${resolved.base}${suffix}`, meaning: `${resolved.base} - name${variantNote}${setIdNote}`, value: c1 });
              rows.push({ segment: `OBX|${resolved.base}${suffix}.2`, meaning: `${resolved.base} - code/quantity${variantNote}${setIdNote}`, value: c2 });
            } else if (c1) {
              rows.push({ segment: `OBX|${resolved.base}${suffix}`, meaning: `${resolved.base}${variantNote}${setIdNote}`, value: c1 });
            }
          }
        }
        const obxPos = occurrences.length > 1 ? `OBX[${occIdx + 1}]` : "OBX";
        if (setId) rows.push({ segment: `${obxPos}-1`, meaning: "Set ID - OBX", value: setId });
        if (fields[2]) rows.push({ segment: `${obxPos}-2`, meaning: "Value Type", value: fields[2] });
        const obx3 = fields[3] || "";
        const obx31 = comp(obx3, 1), obx32 = comp(obx3, 2);
        if (obx31) rows.push({ segment: `${obxPos}-3.1`, meaning: "Observation ID", value: obx31 });
        if (obx32) rows.push({ segment: `${obxPos}-3.2`, meaning: "Observation Name", value: obx32 });
        if (value) rows.push({ segment: `${obxPos}-5`, meaning: "Observation Value", value });
        const obx6 = comp(fields[6] || "", 1);
        if (obx6) rows.push({ segment: `${obxPos}-6.1`, meaning: "Result Units", value: obx6 });
        if (fields[7]) rows.push({ segment: `${obxPos}-7`, meaning: "Reference Range", value: fields[7] });
        if (fields[8]) rows.push({ segment: `${obxPos}-8`, meaning: "Abnormal Flags", value: fields[8] });
        if (fields[11]) rows.push({ segment: `${obxPos}-11`, meaning: "Observation Result Status", value: fields[11] });
        if (fields[4]) rows.push({ segment: `${obxPos}-4`, meaning: "Sub-ID / Grouping ID", value: fields[4] });
        if (fields[14]) rows.push({ segment: `${obxPos}-14`, meaning: "Date/Time of the Observation", value: fields[14] });
        return;
      }
      if (segName === "NTE") {
        const composite = fields[3] || "";
        const nteSetId = fields[1] || "";
        if (composite && !composite.includes("^")) {
          const occurrence = occurrenceFor("NTE-3", null);
          const suffix = occurrence > 1 ? `[${occurrence}]` : "";
          if (nteSetId) rows.push({ segment: `NTE${suffix}-1`, meaning: "Set ID - NTE", value: nteSetId });
          rows.push({ segment: `NTE${suffix}-3`, meaning: "Comment / free-text note", value: composite });
          return;
        }
        const rawIdentifier = comp(composite, 1).trim();
        let v1 = comp(composite, 3);
        let v2 = comp(composite, 4);
        if (!v1 && !v2) {
          const simpleValue = comp(composite, 2);
          if (simpleValue) v1 = simpleValue;
        }
        if (nteSetId) {
          const setIdOccurrence = occurrenceFor("NTE-1(pos)", null);
          const setIdSuffix = setIdOccurrence > 1 ? `[${setIdOccurrence}]` : "";
          rows.push({ segment: `NTE${setIdSuffix}-1`, meaning: "Set ID - NTE", value: nteSetId });
        }
        if (rawIdentifier) {
          const resolved = resolveIdentifierVariant(rawIdentifier);
          const occurrence = occurrenceFor(resolved.base, resolved.variant);
          const suffix = occurrence > 1 ? `#${occurrence}` : "";
          const variantNote = resolved.variant ? ` [split form: ${rawIdentifier}]` : "";
          if (v1 && v2) {
            rows.push({ segment: `NTE|${resolved.base}${suffix}`, meaning: `${resolved.base} - name${variantNote}`, value: v1 });
            rows.push({ segment: `NTE|${resolved.base}${suffix}.2`, meaning: `${resolved.base} - code/quantity${variantNote}`, value: v2 });
          } else if (v1 && resolved.companion) {
            rows.push({ segment: `NTE|${resolved.base}${suffix}.2`, meaning: `${resolved.base} - code/quantity${variantNote}`, value: v1 });
          } else if (v1) {
            rows.push({ segment: `NTE|${resolved.base}${suffix}`, meaning: `${resolved.base}${variantNote}`, value: v1 });
          }
        }
        return;
      }
      if (segName === "RXC") {
        const type = (fields[1] || "").toUpperCase();
        const name = comp(fields[2], 2) || comp(fields[2], 1);
        const amount = fields[3] || "";
        const unit = fields[4] || "";
        const milkType = comp(fields[6] || "", 4);
        const label = type === "B" ? "Base formula (RXC type B)" : type === "A" ? "Additive - fortifier/modular (RXC type A)" : type === "M" ? "Standalone modular (RXC type M)" : "Component";
        const occurrence = occurrenceFor(`RXC-2(${type})`, null);
        const suffix = occurrence > 1 ? `#${occurrence}` : "";
        rows.push({ segment: `RXC-1(${type})${suffix}`, meaning: "Component type", value: type });
        if (name) rows.push({ segment: `RXC-2(${type})${suffix}`, meaning: label, value: name });
        if (amount) rows.push({ segment: `RXC-3(${type})${suffix}`, meaning: `${label} amount`, value: amount });
        if (unit) rows.push({ segment: `RXC-4(${type})${suffix}`, meaning: `${label} unit`, value: unit });
        if (milkType) rows.push({ segment: `RXC-6.4(${type})${suffix}`, meaning: "Milk type", value: milkType });
        return;
      }
      if (segName === "MSH") {
        rows.push({ segment: "MSH-1", meaning: meaningForSegment("MSH-1") || "Field separator", value: "|" });
      }
      fields.forEach((field, idx) => {
        if (idx === 0 || !field) return;
        const fieldNum = segName === "MSH" ? idx + 1 : idx;
        const segKey = `${segNameForKey}-${fieldNum}`;
        if (segKey === "MSH-2") {
          rows.push({ segment: segKey, meaning: meaningForSegment(segKey) || "Encoding characters", value: field });
          return;
        }
        const parts = field.split("^");
        if (parts.length <= 1 || parts.slice(1).every((p) => !p)) {
          rows.push({ segment: segKey, meaning: meaningForSegment(segKey), value: field });
        } else {
          parts.forEach((p, ci) => {
            if (!p) return;
            const segKeyC = `${segKey}.${ci + 1}`;
            rows.push({ segment: segKeyC, meaning: meaningForSegment(segKeyC), value: p });
          });
        }
      });
    });
  });
  return { rows, ...workflowInfo };
}
