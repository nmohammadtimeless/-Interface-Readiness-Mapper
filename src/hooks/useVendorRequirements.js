import { useState, useMemo, useEffect } from "react";
import mammoth from "mammoth/mammoth.browser.js";
import { EXAMPLE_SEED_REQUIREMENTS } from "../data/exampleSeedRequirements";
import { KNOWN_HL7_SEGMENTS, extractGenericHL7, normalizeSegment, stripOccurrenceSuffix } from "../utils/hl7";
import { newId } from "../utils/id";

export function fixRunTogetherWords(text) {
  return (text || "").replace(/([a-z])([A-Z])/g, "$1 $2");
}
export function isDocxExtractionAvailable() {
  return typeof mammoth !== "undefined" && !!mammoth && !!mammoth.convertToHtml;
}
export const SEGMENT_TOKEN_RE = /\b[A-Z]{2,3}[0-9]?(?:\[\d+\])?-\d+(?:\.\d+)?\b/g;
export const OBX_TOKEN_RE = /\b(?:OBX|NTE|OBXNTE|RXC|RXE|RXR)\|[A-Z][A-Z0-9_]*\b/g;
export const RX_CANONICAL_RE = /\bRX[CEOR]-\d+(?:\.\d+)?\([A-Z]\)/g;
export function normalizeRxHybridNotation(text) {
  return (text || "").replace(/\bRX([CEOR])\|([A-Z])\|-(\d+)(?:\.(\d+))?\b/g, (m, seg, type, field, comp2) => {
    if (field === "6" && comp2 === "4") return `RX${seg}-6.4(${type})`;
    return `RX${seg}-${field}(${type})`;
  });
}
export function isValueListLike(text) {
  if (!text) return false;
  const t = text.trim();
  if (/^(yes|no)(\s*\/\s*(yes|no)){1,}$/i.test(t)) return true;
  if (/\b(valid|accepted|allowed)\s+values?\b/i.test(t)) return true;
  const FORMAT_WORDS = /\b(alphanumeric|numeric|format|characters?|string|text|identifier|unique|max(?:imum)?|up to|free|date|time|length|per\s+patient)\b/i;
  if (t.includes(",") && !/[.!?]$/.test(t) && !FORMAT_WORDS.test(t)) {
    const parts = t.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2 && parts.length <= 8 && parts.every((p) => p.split(/\s+/).length <= 3 && p.length <= 24) && parts.every((p, i) => i === 0 || /^[A-Z0-9]/.test(p))) return true;
  }
  return false;
}
export function detectLevel(text) {
  const letterMatch = (text || "").match(/(?:^|[\s|:\-,;.()[\]/])([RCO])(?=$|[\s|:\-,;.()[\]/])/);
  if (letterMatch) {
    const L = letterMatch[1];
    if (L === "R") return "required";
    if (L === "C") return "conditional";
    if (L === "O") return "optional";
  }
  const t = (text || "").toLowerCase();
  if (/\bconditional(ly)?\b|\brequired\s+(if|when)\b|\bonly\s+(if|when)\b|\bdepends?\s+on\b|\bsituational\b/.test(t)) return "conditional";
  if (/\bnot\s+required\b|\bnot\s+mandatory\b|\boptional\b|\bn\/a\b|\bmay\s+be\s+omitted\b|\bnice\s+to\s+have\b/.test(t)) return "optional";
  if (/\brequired\b|\bmandatory\b/.test(t)) return "required";
  return null;
}
export function findToken(text) {
  return [...text.match(RX_CANONICAL_RE) || [], ...text.match(SEGMENT_TOKEN_RE) || [], ...text.match(OBX_TOKEN_RE) || []][0] || null;
}
export function classifyCells(cells) {
  const MAX_CELL_LEN = 300;
  let segment = null;
  cells.forEach((raw) => {
    const text = (raw || "").trim();
    if (!text || segment || text.length > MAX_CELL_LEN) return;
    const tok = findToken(text);
    if (tok && text.replace(tok, "").trim().length < 3) segment = tok;
  });
  if (!segment) {
    for (const raw of cells) {
      const text = (raw || "").trim();
      if (text.length > MAX_CELL_LEN) continue;
      const tok = findToken(text);
      if (tok) {
        segment = tok;
        break;
      }
    }
  }
  const rowText = cells.join(" ");
  const level = detectLevel(rowText) || "conditional";
  const remaining = cells.map((c) => (c || "").trim()).filter((text) => {
    if (!text) return false;
    const tok = findToken(text);
    if (tok && text.replace(tok, "").trim().length < 3) return false;
    if (detectLevel(text) && text.split(/\s+/).length <= 8) return false;
    return true;
  });
  let acceptedValues = null, label = null, fieldId = null;
  const FIELD_IDENTIFIER_RE = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+$/;
  remaining.forEach((text) => {
    const cleaned = segment ? text.replace(segment, "").trim() : text;
    if (!cleaned) return;
    if (!fieldId && FIELD_IDENTIFIER_RE.test(cleaned)) {
      fieldId = cleaned;
      return;
    }
    if (!acceptedValues && isValueListLike(cleaned)) acceptedValues = cleaned;
    else if (!label) label = cleaned;
  });
  return { segment, level, label: label || "(unnamed field - edit to add a name)", acceptedValues, fieldId };
}
export function classifyLine(line) {
  if ((line || "").length > 300) return null;
  const pseudoCells = line.split(/\t|\s{2,}| - /).map((s) => s.trim()).filter(Boolean);
  if (pseudoCells.length > 1) {
    const r = classifyCells(pseudoCells);
    if (r.segment) return r;
  }
  const tok = findToken(line);
  if (!tok) return null;
  const level = detectLevel(line) || "conditional";
  const acceptedMatch = line.match(/\b(?:accepted|valid|allowed)\s+values?[:\-]?\s*(.+)$/i);
  const acceptedValues = acceptedMatch ? acceptedMatch[1].trim() : null;
  let rest = line.replace(tok, "").trim();
  if (acceptedMatch) rest = rest.replace(acceptedMatch[0], "").trim();
  let label = rest.split(/[.;]/)[0].replace(/^[-:\s]+|[-:\s]+$/g, "").trim();
  if (label.length > 70) label = label.slice(0, 70).trim() + "...";
  return { segment: tok, level, label: label || "(unnamed field - edit to add a name)", acceptedValues };
}
export function detectSegmentHeader(text) {
  const t = (text || "").trim();
  if (!t || t.length > 40) return null;
  const leading = t.match(new RegExp(`^(${KNOWN_HL7_SEGMENTS.join("|")})\\b`, "i"));
  if (leading) return leading[1].toUpperCase();
  const trailing = t.match(new RegExp(`\\((${KNOWN_HL7_SEGMENTS.join("|")})\\)\\s*$`, "i"));
  return trailing ? trailing[1].toUpperCase() : null;
}
export function qualifyBareFieldNumber(text, currentSegment) {
  if (!currentSegment || !text || findToken(text)) return text;
  const m = text.match(/^(\d{1,2}(?:\.\d{1,2})?)\b/);
  if (!m) return text;
  return text.replace(m[0], `${currentSegment}-${m[0]}`);
}
export const ACCEPTED_CODE_STOPWORDS = new Set(["FOR", "AND", "OR", "THE", "ARE", "OF", "TO", "IN", "A", "I", "IF", "IS", "NOT", "TMS", "HL7"]);
export function acceptedCodesFrom(text) {
  const t = (text || "").trim();
  if (!t) return null;
  const m = t.match(/(?:accepted|valid|allowed)\s+values?\s*(?:are)?\s*:?\s*([\s\S]*)$/i);
  if (m) {
    const codes = [...m[1].matchAll(/\b[A-Z][A-Z0-9]{0,5}\b/g)].map((x) => x[0]).filter((c) => !ACCEPTED_CODE_STOPWORDS.has(c));
    const uniq = [...new Set(codes)];
    return uniq.length ? uniq.join(", ") : null;
  }
  return null;
}
export function singleCodeFrom(text) {
  const t = (text || "").trim().split("^")[0];
  return /^[A-Z]{2,6}$/.test(t) ? t : null;
}
export function alternateSegmentsFrom(text) {
  const out = [];
  const re = /alternate\s+segment\s*:?\s*([A-Z]{2,3}\d?)[\s-]+(\d+(?:\.\d+)?)/gi;
  let m;
  while (m = re.exec(text || "")) out.push(`${m[1].toUpperCase()}-${m[2]}`);
  return out;
}
export function sectionWorkflowFromHeading(text, current) {
  const t = (text || "").trim();
  if (/^appendix/i.test(t)) {
    if (/\bADT\b/i.test(t) && /segments|components|relevant/i.test(t)) return "adt-appendix";
    return "skip";
  }
  if (/outgoing|outbound/i.test(t)) return "result:ORU";
  if (/RDE\^?O\d\d|\(RDE\)|RX Segments/i.test(t)) return "order:RDE";
  if (/ORM\^?O01|\(ORM\)|OBX\/NTE Segments/i.test(t)) return "order:ORM";
  if (/incoming ADT|ADT message/i.test(t)) return "adt";
  if (/incoming CPOE/i.test(t)) return "order";
  if (/technical requirements/i.test(t)) return "skip";
  if (/interface requirements/i.test(t)) return "any";
  return current;
}
export function tableHeaderWorkflow(text, current) {
  if (/\((EHR)\)|outbound/i.test(text)) return "result:ORU";
  if (/\(ADT\)/i.test(text)) return "adt";
  if (/\(CPOE\)/i.test(text)) return /^order/.test(current) ? current : "order";
  return current;
}
export function isKnownRequirementSegment(seg) {
  if (/^(OBX|NTE|OBXNTE|RXC|RXE|RXR|RXO)\|/.test(seg)) return true;
  const t = (seg.match(/^([A-Z]{2,3}\d?)(?:\[\d+\])?[-(]/) || [])[1];
  return !!t && KNOWN_HL7_SEGMENTS.includes(t);
}
export const ADT_EVENT_LIST_RE = /^A\d{2}(\s*,\s*A\d{2})*$/;
export function runExtraction(orderedChunks) {
  const fromRows = [];
  const fromText = [];
  const appendixRows = [];
  const unmatched = [];
  const levelHintsWithoutSegment = [];
  const proseAliases = [];
  const conditionalHints = [];
  const supportedAdtEvents = new Set();
  let totalTokensSeen = 0;
  let currentSegment = null;
  let workflow = "any";
  let appendixEvents = null;
  let lastRowReq = null;
  orderedChunks.forEach((chunk) => {
    if (chunk.type === "row") {
      const nonEmptyCells = chunk.cells.filter((c) => c && c.trim());
      if (workflow === "skip") return;
      const rowJoined = nonEmptyCells.join(" ");
      [...rowJoined.matchAll(/\bADT-?\s*(A\d{2})\b/g)].forEach((m) => supportedAdtEvents.add(m[1]));
      if (workflow === "adt-appendix") {
        if (nonEmptyCells.length === 1 && ADT_EVENT_LIST_RE.test(nonEmptyCells[0].trim())) {
          appendixEvents = nonEmptyCells[0].split(",").map((s) => s.trim());
          appendixEvents.forEach((e) => supportedAdtEvents.add(e));
          return;
        }
        if (!appendixEvents || nonEmptyCells.length < 2) return;
        const segCell = nonEmptyCells.find((c) => /^[A-Z]{2,3}\d?(\[\d+\])?-\d+(\.\d+)?$/.test(c.trim()));
        if (!segCell) return;
        const attr = nonEmptyCells.find((c) => c !== segCell) || "";
        appendixRows.push({ segment: segCell.trim(), label: attr.replace(/\*/g, "").trim(), level: /\*/.test(attr) ? "required" : "optional", events: [...appendixEvents], source: "appendix" });
        return;
      }
      if (nonEmptyCells.length === 1) {
        const cell = nonEmptyCells[0];
        const headerHit = detectSegmentHeader(cell) || ((cell.length <= 60 && cell.match(new RegExp(`^(${KNOWN_HL7_SEGMENTS.join("|")})\\b.*\\bSegment\\b`, "i")) || [])[1] || "").toUpperCase() || null;
        if (headerHit) {
          currentSegment = headerHit;
          workflow = tableHeaderWorkflow(cell, workflow);
          lastRowReq = null;
          return;
        }
      }
      const qualifiedCells = chunk.cells.map((c) => qualifyBareFieldNumber(normalizeRxHybridNotation(c), currentSegment));
      const rowText = qualifiedCells.join(" ");
      const tokens = [...rowText.match(SEGMENT_TOKEN_RE) || [], ...rowText.match(OBX_TOKEN_RE) || []];
      if (tokens.length === 0) {
        if (/^result/.test(workflow) && chunk.cells.length >= 3 && /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)+$|^[A-Z]{4,}$/.test((chunk.cells[0] || "").trim())) {
          const id = chunk.cells[0].trim();
          fromRows.push({ segment: `OBX|${id}`, label: (chunk.cells[1] || id).trim(), level: "optional", acceptedValues: null, description: (chunk.cells[2] || "").trim(), workflow, source: "table" });
          return;
        }
        if (lastRowReq && !(chunk.cells[0] || "").trim() && nonEmptyCells.length >= 1) {
          const extra = chunk.cells.length >= 5 ? chunk.cells[2] || nonEmptyCells[0] : nonEmptyCells[0];
          lastRowReq.description = `${lastRowReq.description || ""} ${extra}`.trim();
          const codes = acceptedCodesFrom(lastRowReq.description);
          if (codes) lastRowReq.acceptedValues = codes;
          return;
        }
        const lvl = detectLevel(rowText);
        if (lvl === "conditional" || lvl === "optional") levelHintsWithoutSegment.push({ level: lvl, sourceLine: rowText.slice(0, 160) });
        return;
      }
      totalTokensSeen += tokens.length;
      if (workflow === "any" && !nonEmptyCells.some((c) => /^\d{1,2}(\.\d{1,2})?$/.test(c.trim()))) return;
      const r = classifyCells(qualifiedCells);
      if (r.segment && isKnownRequirementSegment(r.segment)) {
        const isResult = /^result/.test(workflow);
        const description = isResult ? chunk.cells[2] || "" : chunk.cells.length >= 5 ? chunk.cells[2] || "" : chunk.cells.slice(1).join(" ");
        const codes = isResult ? singleCodeFrom(chunk.cells[2]) : chunk.cells.slice(0, Math.max(1, chunk.cells.length - 2)).map((c) => acceptedCodesFrom(c)).find(Boolean) || (chunk.cells.length >= 5 ? singleCodeFrom(chunk.cells[2]) : null);
        r.acceptedValues = codes || null;
        r.description = description;
        if (isResult) r.level = /not be populated|\bif\b|only when|\bsee\b/i.test(description) ? "conditional" : "required";
        const alts = alternateSegmentsFrom(rowText);
        if (alts.length) r.aliases = alts.join(", ");
        r.workflow = workflow;
        r.source = "table";
        const attr = (chunk.cells[1] || "").trim();
        if (attr) r.label = attr;
        fromRows.push(r);
        lastRowReq = r;
      } else if (!r.segment) unmatched.push({ segment: tokens[0], sourceLine: qualifiedCells.join(" | ").slice(0, 160) });
    } else {
      const line = chunk.text;
      if (chunk.type === "header" || line.length < 90) {
        const next = sectionWorkflowFromHeading(line, workflow);
        if (next !== workflow && (chunk.type === "header" || /^(appendix|outgoing|incoming|cpoe orders|supported incoming|technical requirements|interface requirements)/i.test(line.trim()))) {
          workflow = next;
          appendixEvents = null;
        }
      }
      const headerHit = chunk.type === "header" ? detectSegmentHeader(line) : null;
      if (headerHit) {
        currentSegment = headerHit;
        return;
      }
      if (workflow === "skip" || workflow === "adt-appendix") return;
      const fallback = line.match(/no\s+[\w\s/]*?\bin\s+([A-Z]{2,3}\d?-\d+(?:\.\d+)?)\s*,\s*([A-Z]{2,3}\d?-\d+(?:\.\d+)?)\s+will be used/i);
      if (fallback) proseAliases.push({ workflow, target: fallback[2], alias: fallback[1] });
      const qualifiedLine = qualifyBareFieldNumber(normalizeRxHybridNotation(line), currentSegment);
      const tokens = [...qualifiedLine.match(SEGMENT_TOKEN_RE) || [], ...qualifiedLine.match(OBX_TOKEN_RE) || []];
      if (tokens.length === 0) {
        const lvl = detectLevel(qualifiedLine);
        if (lvl === "conditional" || lvl === "optional") levelHintsWithoutSegment.push({ level: lvl, sourceLine: qualifiedLine.slice(0, 160) });
        return;
      }
      totalTokensSeen += tokens.length;
      if (/^If\b[^.]*\b(?:is|are)\s+used\b/i.test(line.trim())) tokens.forEach((tk) => conditionalHints.push({ workflow, token: tk }));
      const r = classifyLine(qualifiedLine);
      if (r && r.segment && isKnownRequirementSegment(r.segment)) {
        r.workflow = workflow;
        r.source = "text";
        fromText.push(r);
      } else if (!r || !r.segment) unmatched.push({ segment: tokens[0], sourceLine: qualifiedLine.slice(0, 160) });
    }
  });
  let rows = fromRows;
  if (appendixRows.length > 0) {
    const generic = fromRows.filter((r) => r.workflow === "adt");
    const baseKey = (s) => normalizeSegment(stripOccurrenceSuffix(s)).replace(/\.1$/, "");
    const expanded = [];
    appendixRows.forEach((a) => {
      const g = generic.find((x) => baseKey(x.segment) === baseKey(a.segment)) || generic.find((x) => baseKey(x.segment).startsWith(baseKey(a.segment) + "."));
      const desc = g ? `${g.label || ""} ${g.description || ""}` : "";
      const notOn = (desc.match(/not\s+required\s+(?:on|in)\s+([A-Z0-9,\s]+?(?:messages?)?)\)?(?:$|[.;])/i) || [])[1] || "";
      const excluded = [...notOn.matchAll(/A\d{2}/g)].map((m) => m[0]).filter((e) => a.events.includes(e));
      const base = { segment: a.segment, label: a.label || (g && g.label) || a.segment, acceptedValues: g ? g.acceptedValues : null, description: g ? g.description : "", source: "table" };
      const main = a.events.filter((e) => !excluded.includes(e));
      if (main.length) expanded.push({ ...base, level: a.level, workflow: `adt:${main.join(",")}` });
      if (excluded.length) expanded.push({ ...base, level: "conditional", workflow: `adt:${excluded.join(",")}` });
    });
    const covered = new Set(appendixRows.map((a) => baseKey(a.segment)));
    rows = [...fromRows.filter((r) => r.workflow !== "adt" || !covered.has(baseKey(r.segment))), ...expanded];
  }
  const useText = rows.length < 10;
  const byKey = new Map();
  [...rows, ...useText ? fromText : []].forEach((r) => {
    if (r.workflow === "skip" || r.workflow === "adt-appendix") return;
    const key = `${r.workflow}::${normalizeSegment(r.segment)}`;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, { ...r });
      return;
    }
    if (prev.source === "text" && r.source === "table") {
      byKey.set(key, { ...r });
      return;
    }
    if (r.acceptedValues) {
      const merged = [...new Set([...(prev.acceptedValues || "").split(",").map((s) => s.trim()).filter(Boolean), ...r.acceptedValues.split(",").map((s) => s.trim())])];
      prev.acceptedValues = merged.join(", ");
    }
    const rank = { required: 3, conditional: 2, optional: 1 };
    if ((rank[r.level] || 0) > (rank[prev.level] || 0)) prev.level = r.level;
  });
  const fieldOf = (s) => (stripOccurrenceSuffix(s).match(/^([A-Z]{2,3}\d?)-(\d+)/) || []).slice(1).join("-");
  conditionalHints.forEach(({ workflow: wf, token }) => {
    [...byKey.values()].forEach((r) => {
      if (r.workflow === wf && r.level === "required" && fieldOf(r.segment) && fieldOf(r.segment) === fieldOf(token) && normalizeSegment(r.segment).replace(/\(.\)/, "").endsWith((token.match(/\.(\d+)/) || ["", ""])[0] || "")) r.level = "conditional";
    });
  });
  proseAliases.forEach(({ workflow: wf, target, alias }) => {
    const hit = [...byKey.values()].find((r) => r.workflow === wf && normalizeSegment(r.segment) === normalizeSegment(target));
    if (!hit) return;
    const list = (hit.aliases || "").split(",").map((s) => s.trim()).filter(Boolean);
    if (!list.includes(alias)) list.push(alias);
    hit.aliases = list.join(", ");
  });
  return { requirements: [...byKey.values()], unmatched, levelHintsWithoutSegment, supportedAdtEvents: [...supportedAdtEvents].sort(), totalChunks: orderedChunks.length, totalTokensSeen };
}
export function extractRequirementsFromText(text) {
  const lines = text.split(/\r\n|\r|\n/).map((l) => l.trim()).filter((l) => l.length > 2);
  return runExtraction(lines.map((text2) => ({ type: "text", text: text2 })));
}
export async function extractRequirementsFromDocx(file) {
  const arrayBuffer = await file.arrayBuffer();
  let orderedChunks = [];
  const tableCount = { value: 0 };
  let rowCount = 0;
  try {
    const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
    const doc = new DOMParser().parseFromString(htmlResult.value, "text/html");
    const walk = (node) => {
      Array.from(node.children || []).forEach((child) => {
        const tag = (child.tagName || "").toLowerCase();
        if (tag === "table") {
          tableCount.value += 1;
          const directRows = child.querySelectorAll(":scope > tbody > tr, :scope > tr");
          Array.from(directRows).forEach((tr) => {
            const cellEls = Array.from(tr.querySelectorAll(":scope > td, :scope > th"));
            const cells = cellEls.map((td) => fixRunTogetherWords(td.textContent.trim()));
            if (cells.some((c) => c)) {
              orderedChunks.push({ type: "row", cells });
              rowCount += 1;
            }
          });
        } else if (/^h[1-6]$/.test(tag)) {
          const text = fixRunTogetherWords(child.textContent.trim());
          if (text.length > 1) orderedChunks.push({ type: "header", text });
        } else if (tag === "p" || tag === "li") {
          const text = fixRunTogetherWords(child.textContent.trim());
          if (text.length > 2) orderedChunks.push({ type: "text", text });
        } else if (child.children && child.children.length) {
          walk(child);
        }
      });
    };
    walk(doc.body);
  } catch (e) {
  }
  if (orderedChunks.length === 0) {
    try {
      const rawResult = await mammoth.extractRawText({ arrayBuffer });
      const rawLines = rawResult.value.split(/\r\n|\r|\n/).map((l) => l.trim()).filter((l) => l.length > 2);
      orderedChunks = rawLines.map((text) => ({ type: "text", text }));
    } catch (e) {
    }
  }
  const result = runExtraction(orderedChunks);
  result.tablesFound = tableCount.value;
  result.tableRowsFound = rowCount;
  return result;
}

export const SAMPLE_SET_NAME = "Sample requirements";
export function useVendorRequirements() {
  const [vendor, setVendor] = useState("");
  const [vendorEntries, setVendorEntries] = useState([]);
  const [savedSetNames, setSavedSetNames] = useState([]);
  const [selectedSavedSet, setSelectedSavedSet] = useState("");
  const [saveAsName, setSaveAsName] = useState("");
  const [savedSetsError, setSavedSetsError] = useState(null);
  const [vendorHl7Text, setVendorHl7Text] = useState("");
  const [vendorHl7Summary, setVendorHl7Summary] = useState(null);
  const [vendorPasteText, setVendorPasteText] = useState("");
  const [pendingVendorFiles, setPendingVendorFiles] = useState([]);
  const [extractionLog, setExtractionLog] = useState([]);
  const [showUnmatched, setShowUnmatched] = useState({});
  async function refreshSavedSets() {
    try {
      const result = await window.storage.list("vendorset:", false);
      const names = (result?.keys || []).map((k) => k.startsWith("vendorset:") ? k.slice("vendorset:".length) : k);
      setSavedSetNames(names);
      setSavedSetsError(null);
      return names;
    } catch (err) {
      setSavedSetsError("Couldn't reach saved vendor sets - storage may be unavailable.");
      return [];
    }
  }
  useEffect(() => {
    (async () => {
      try {
        await window.storage.set(`vendorset:${SAMPLE_SET_NAME}`, JSON.stringify(EXAMPLE_SEED_REQUIREMENTS), false);
      } catch (err) {
      }
      await refreshSavedSets();
    })();
  }, []);
  async function loadSavedSet(name) {
    if (!name) return;
    try {
      const result = await window.storage.get(`vendorset:${name}`, false);
      const parsed = JSON.parse(result.value);
      setVendorEntries((prev) => {
        const existing = new Set(prev.map((e) => `${e.workflow || "any"}::${normalizeSegment(e.segment)}`));
        const additions = parsed.filter((r) => !existing.has(`${r.workflow || "any"}::${normalizeSegment(r.segment)}`)).map((r) => ({ id: newId(), ...r }));
        return [...prev, ...additions];
      });
      if (!vendor) setVendor(name.replace(/\s*\([^)]*\)\s*$/, ""));
    } catch (err) {
      setSavedSetsError(`Couldn't load "${name}".`);
    }
  }
  async function saveCurrentAsSet() {
    const name = saveAsName.trim();
    if (!name || vendorEntries.length === 0) return;
    try {
      const toSave = vendorEntries.map(({ id, ...rest }) => rest);
      await window.storage.set(`vendorset:${name}`, JSON.stringify(toSave), false);
      setSaveAsName("");
      await refreshSavedSets();
    } catch (err) {
      setSavedSetsError(`Couldn't save "${name}".`);
    }
  }
  async function deleteSavedSet(name) {
    if (!name) return;
    try {
      await window.storage.delete(`vendorset:${name}`, false);
      await refreshSavedSets();
      if (selectedSavedSet === name) setSelectedSavedSet("");
    } catch (err) {
      setSavedSetsError(`Couldn't delete "${name}".`);
    }
  }
  function updateVendorEntry(id, key, val) {
    setVendorEntries((prev) => prev.map((e) => e.id === id ? { ...e, [key]: val } : e));
  }
  function removeVendorEntry(id) {
    setVendorEntries((prev) => prev.filter((e) => e.id !== id));
  }
  function addVendorEntry(level = "required") {
    setVendorEntries((prev) => [...prev, { id: newId(), segment: "", label: "", level, acceptedValues: "", workflow: "any", aliases: "" }]);
  }
  function clearVendorEntries() {
    setVendorEntries([]);
    setVendor("");
    setExtractionLog([]);
    setVendorHl7Text("");
    setVendorHl7Summary(null);
    setVendorPasteText("");
    setSelectedSavedSet("");
  }
  function handleParseVendorHL7() {
    if (!vendorHl7Text.trim()) return;
    try {
      const { rows, msgType, trigger, workflow } = extractGenericHL7(vendorHl7Text);
      const wf = workflow && workflow !== "unknown" ? workflow : "any";
      setVendorEntries((prev) => [...prev, ...rows.map((r) => ({ id: newId(), segment: r.segment, label: r.meaning || r.value, level: "required", acceptedValues: "", workflow: wf }))]);
      setVendorHl7Summary({ count: rows.length, msgType, trigger, workflow });
    } catch (err) {
      setVendorHl7Summary({ count: 0, error: err.message || "Unknown parsing error" });
    }
  }
  function applyDocExtraction({ requirements, unmatched, levelHintsWithoutSegment, totalChunks, totalTokensSeen, tablesFound, tableRowsFound }, fileName) {
    setVendorEntries((prev) => {
      const existing = new Set(prev.map((e) => `${e.workflow || "any"}::${normalizeSegment(e.segment)}`));
      const additions = requirements.filter((r) => !existing.has(`${r.workflow || "any"}::${normalizeSegment(r.segment)}`)).map((r) => ({ id: newId(), segment: r.segment, label: r.label, level: r.level, acceptedValues: r.acceptedValues || "", workflow: r.workflow || "any", fieldId: r.fieldId || "", aliases: r.aliases || "" }));
      return [...prev, ...additions];
    });
    const tableNote = tablesFound !== void 0 ? ` Found ${tablesFound} table(s) with ${tableRowsFound} total row(s).` : "";
    setExtractionLog((prev) => [...prev, {
      file: fileName,
      addedCount: requirements.length,
      unmatched: unmatched.slice(0, 12),
      levelHintsWithoutSegment: (levelHintsWithoutSegment || []).slice(0, 12),
      diagnostics: `Scanned ${totalChunks} line(s)/row(s), found ${totalTokensSeen} HL7-looking token(s) total.${tableNote}`
    }]);
  }
  function handleVendorFileSelect(e) {
    const files = Array.from(e.target.files || []);
    setPendingVendorFiles((prev) => [...prev, ...files]);
    e.target.value = "";
  }
  function removePendingFile(idx) {
    setPendingVendorFiles((prev) => prev.filter((_, i) => i !== idx));
  }
  async function handleExtractPendingFiles() {
    if (pendingVendorFiles.length === 0) return;
    if (!isDocxExtractionAvailable()) {
      setExtractionLog((prev) => [...prev, { file: "(setup)", error: "The document-reading library isn't available in this session - paste the document's text into the box below instead." }]);
      return;
    }
    for (const file of pendingVendorFiles) {
      const ext = file.name.split(".").pop().toLowerCase();
      try {
        if (ext === "docx") applyDocExtraction(await extractRequirementsFromDocx(file), file.name);
        else if (ext === "txt" || ext === "csv") applyDocExtraction(extractRequirementsFromText(await file.text()), file.name);
        else setExtractionLog((prev) => [...prev, { file: file.name, error: "Unsupported format for auto-extraction (use .docx or .txt). Try pasting the text instead." }]);
      } catch (err) {
        setExtractionLog((prev) => [...prev, { file: file.name, error: `Could not read this file (${err.message || "unknown error"}). Try pasting the text instead.` }]);
      }
    }
    setPendingVendorFiles([]);
  }
  const groupedVendor = useMemo(() => ({
    required: vendorEntries.filter((e) => e.level === "required"),
    conditional: vendorEntries.filter((e) => e.level === "conditional"),
    optional: vendorEntries.filter((e) => e.level === "optional")
  }), [vendorEntries]);
  return {
    vendor,
    setVendor,
    vendorEntries,
    setVendorEntries,
    savedSetNames,
    selectedSavedSet,
    setSelectedSavedSet,
    saveAsName,
    setSaveAsName,
    savedSetsError,
    loadSavedSet,
    saveCurrentAsSet,
    deleteSavedSet,
    vendorHl7Text,
    setVendorHl7Text,
    vendorHl7Summary,
    handleParseVendorHL7,
    vendorPasteText,
    setVendorPasteText,
    pendingVendorFiles,
    handleVendorFileSelect,
    removePendingFile,
    handleExtractPendingFiles,
    extractionLog,
    applyDocExtraction,
    showUnmatched,
    setShowUnmatched,
    updateVendorEntry,
    removeVendorEntry,
    addVendorEntry,
    clearVendorEntries,
    groupedVendor
  };
}
