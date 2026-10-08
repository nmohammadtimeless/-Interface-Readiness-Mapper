import { descriptionForFieldIdentifier } from "../data/exampleSeedRequirements";
import { KNOWN_HL7_SEGMENTS, comp, normalizeHL7Raw, segmentsAlign, stripOccurrenceSuffix, stripPipePrefix } from "./hl7";
export const STANDARD_WORKFLOWS = new Set(["adt", "order", "result", "any"]);
export function detectedContextOf(summary) {
  if (!summary || !summary.workflow || summary.workflow === "unknown") return null;
  return `${summary.workflow}|${(summary.trigger || "").toUpperCase()}|${(summary.msgType || "").toUpperCase()}`;
}
export function workflowMatches(reqWorkflow, detectedWorkflow, workflowLabelText) {
  const tag = (reqWorkflow || "any").trim();
  if (tag === "" || tag.toLowerCase() === "any") return true;
  const [base, list] = tag.split(":");
  if (STANDARD_WORKFLOWS.has(base)) {
    if (!detectedWorkflow) return true;
    const [dWf, dTrig, dType] = detectedWorkflow.split("|");
    if (base !== dWf) return false;
    if (!list) return true;
    const items = list.split(",").map((s) => s.trim().toUpperCase());
    return items.includes(dTrig) || items.includes(dType);
  }
  return (workflowLabelText || "").toLowerCase().includes(tag.toLowerCase());
}
export function identifierNameOf(seg) {
  const stripped = stripOccurrenceSuffix(seg || "").replace(/\.2$/, "");
  const m = stripped.match(/^(?:OBX|NTE|OBXNTE)\|(.+)$/);
  return m ? m[1] : null;
}
export function normalizeAliasText(s) {
  return (s || "").trim().toUpperCase().replace(/[\s_]+/g, " ");
}
export function matchesAlias(clientSeg, vendorAliases) {
  if (!vendorAliases) return false;
  const aliasList = vendorAliases.split(",").map((a) => a.trim()).filter(Boolean);
  if (aliasList.some((a) => segmentsAlign(clientSeg, a))) return true;
  const clientName = identifierNameOf(clientSeg);
  if (!clientName) return false;
  const clientNorm = normalizeAliasText(clientName);
  return aliasList.map((a) => normalizeAliasText(a)).includes(clientNorm);
}
export function matchesAliasByName(rawIdentifierName, vendorAliases) {
  if (!vendorAliases || !rawIdentifierName) return false;
  const norm = normalizeAliasText(rawIdentifierName);
  return vendorAliases.split(",").map((a) => normalizeAliasText(a)).filter(Boolean).includes(norm);
}
export const LETTERS_A_E = ["A", "B", "C", "D", "E"];
export const NUMS_01_05 = ["01", "02", "03", "04", "05"];
export const FIELD_IDENTIFIER_GROUPS = [
  { label: "Feed base - base + calories in ONE segment", options: [["FEED_BASE", "FEED_BASE  (name^calories together)"]] },
  { label: "Feed base - base and calories in SEPARATE segments", options: [
    ...LETTERS_A_E.map((l) => [`FEED_BASE_${l}`, `FEED_BASE_${l}  (base name only)`]),
    ...LETTERS_A_E.map((l) => [`FEED_BASECAL_${l}`, `FEED_BASECAL_${l}  (calories for base ${l})`])
  ] },
  { label: "Fortifier - ONE segment", options: [["FORTIFIER", "FORTIFIER  (name^target calories)"]] },
  { label: "Fortifier - SEPARATE segments", options: [
    ...NUMS_01_05.map((n) => [`FORTIFIER_${n}`, `FORTIFIER_${n}  (fortifier name only)`]),
    ...NUMS_01_05.map((n) => [`FORTIFIERCAL_${n}`, `FORTIFIERCAL_${n}  (target calories for fortifier ${n})`])
  ] },
  { label: "Modular", options: [
    ["MODULAR", "MODULAR  (name^amount together)"],
    ...NUMS_01_05.slice(0, 3).map((n) => [`MODULAR_${n}`, `MODULAR_${n}  (modular name only)`]),
    ...NUMS_01_05.slice(0, 3).map((n) => [`MODULARAMT_${n}`, `MODULARAMT_${n}  (amount for modular ${n})`]),
    ["MOD_BASE", "MOD_BASE  (standalone modular)"],
    ["MOD_VOLUME", "MOD_VOLUME"],
    ["MOD_ROUTE", "MOD_ROUTE"],
    ["MOD_FREQUENCY", "MOD_FREQUENCY"]
  ] },
  { label: "Feed details", options: [
    ["FEED_ROUTE", "FEED_ROUTE"],
    ["FEED_FREQUENCY", "FEED_FREQUENCY"],
    ["FEED_VOLUME", "FEED_VOLUME"],
    ["MILK_TYPE", "MILK_TYPE"],
    ["LABEL_NOTES", "LABEL_NOTES"],
    ["CONSENT", "CONSENT  (category^YES/NO)"]
  ] }
];
export const GROUPING_ID_OPTIONS = ["P", "S", "T", "1", "2", "3", "4", "5"];
export const CALORIE_FAMILIES = [
  { one: "FEED_BASE", base: "FEED_BASE_", cal: "FEED_BASECAL_", suffixes: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""), re: /^FEED_BASE_([A-Z])$/, calRe: /^FEED_BASECAL_([A-Z])$/ },
  { one: "FORTIFIER", base: "FORTIFIER_", cal: "FORTIFIERCAL_", suffixes: Array.from({ length: 99 }, (_, i) => String(i + 1).padStart(2, "0")), re: /^FORTIFIER_(\d{2})$/, calRe: /^FORTIFIERCAL_(\d{2})$/ },
  { one: "MODULAR", base: "MODULAR_", cal: "MODULARAMT_", suffixes: Array.from({ length: 99 }, (_, i) => String(i + 1).padStart(2, "0")), re: /^MODULAR_(\d{2})$/, calRe: /^MODULARAMT_(\d{2})$/ }
];
export const HUMAN_MILK_RE = /breast\s*milk|breastmilk|\bEHM\b|\bDHM\b|donor\s*(human\s*)?milk|mother'?s?\s*(own\s*)?milk|\bMOM\b/i;
export const DEFAULT_HUMAN_MILK_KCAL = "20";
export const OMIT_IDENTIFIER = "__OMIT__";
export const NA_IDENTIFIER = "__NA__";
export const OTHER_IDENTIFIER = "__OTHER__";
export const ALL_LISTED_IDENTIFIERS = new Set(FIELD_IDENTIFIER_GROUPS.flatMap((g) => g.options.map((o) => o[0])));
export function suggestIdentifiers(label, value) {
  const t = label || "";
  const out = [];
  const push = (x) => {
    if (!out.includes(x)) out.push(x);
  };
  const one = suggestIdentifier(t);
  if (one) push(one);
  if (/calori|kcal|density/i.test(t)) {
    push("FEED_BASECAL_A");
    push("FORTIFIERCAL_01");
    push("FEED_BASE");
  }
  if (/base|milk|formula|diet|feed type/i.test(t) && !/fortif|consent|route|freq|volume|rate|schedule/i.test(t)) {
    push("FEED_BASE");
    push("FEED_BASE_A");
    if (/milk/i.test(t)) push("MILK_TYPE");
  }
  if (/fortif/i.test(t)) push("FORTIFIER_01");
  if (/modular|additive|thicken|protein|oil/i.test(t)) {
    push("MODULAR");
    push("MOD_BASE");
  }
  if (/note|comment|instruction|label/i.test(t)) push("LABEL_NOTES");
  if (/rate|volume|ml/i.test(t)) push("FEED_VOLUME");
  return out.slice(0, 4);
}
export const SUGGESTION_RULES = [
  { test: /fortifier/i, id: "FORTIFIER" },
  { test: /\broute\b/i, id: "FEED_ROUTE" },
  { test: /schedule|frequency/i, id: "FEED_FREQUENCY" },
  { test: /goal rate|volume/i, id: "FEED_VOLUME" },
  { test: /consent/i, id: "CONSENT" },
  { test: /label note/i, id: "LABEL_NOTES" },
  { test: /milk type/i, id: "MILK_TYPE" },
  { test: /modular/i, id: "MODULAR" }
];
export function suggestIdentifier(label) {
  const r = SUGGESTION_RULES.find((x) => x.test.test(label || ""));
  return r ? r.id : null;
}
export function identifierKey(label) {
  return (label || "").trim().toUpperCase().replace(/\s+/g, " ");
}
export function consentCategoryFromLabel(text) {
  if (/ni-?q/i.test(text)) return "Ni-Q";
  if (/prolacta/i.test(text)) return "Prolacta";
  if (/donor/i.test(text)) return "Donor Milk";
  if (/formula/i.test(text)) return "Formula";
  return "";
}
export function splitMessageIntoSegments(rawText) {
  const out = [];
  normalizeHL7Raw(rawText).split(/\r\n|\r|\n/).forEach((l) => {
    const line = l.trim();
    if (!line) return;
    const name = line.split("|")[0];
    if (KNOWN_HL7_SEGMENTS.includes(name) || out.length === 0) out.push(line);
    else out[out.length - 1] = out[out.length - 1] + " " + line;
  });
  return out;
}
export function readIdentifierLine(line) {
  const parts = line.split("|");
  const seg = parts[0];
  if (seg === "OBX") {
    const c = (parts[3] || "").split("^");
    const label = (c[0] || "").trim();
    const v = (parts[5] || "").split("^");
    if (descriptionForFieldIdentifier(label)) {
      return { seg, label, recognized: true, group: (parts[4] || "").trim(), value: (v[0] || "").trim(), related: (v[1] || "").trim() };
    }
    return { seg, label, recognized: false, group: "", value: (parts[5] || "").trim(), related: "" };
  }
  if (seg === "NTE") {
    const c = (parts[3] || "").split("^");
    const label = (c[0] || "").trim();
    if (descriptionForFieldIdentifier(label)) {
      return { seg, label, recognized: true, group: (c[1] || "").trim(), value: (c[2] || "").trim(), related: (c[3] || "").trim() };
    }
    return { seg, label, recognized: false, group: "", value: c.slice(1).filter((x) => x !== "").join("^").trim(), related: "" };
  }
  return null;
}
export function listClientIdentifierFields(rawText) {
  if (!rawText || !rawText.trim()) return [];
  const rows = [];
  const byKey = {};
  splitMessageIntoSegments(rawText).forEach((line) => {
    const r = readIdentifierLine(line);
    if (!r || !r.label || r.recognized) return;
    const key = identifierKey(r.label);
    if (byKey[key]) return;
    byKey[key] = { key, label: r.label, seg: r.seg, value: r.value };
    rows.push(byKey[key]);
  });
  return rows;
}
export function buildTransformedMessage(rawText, vendorEntries, identifierMap, opts) {
  if (!rawText || !rawText.trim()) return { text: "", changedLineNumbers: [], droppedLines: [], defaultedCalories: [] };
  const mshLine = splitMessageIntoSegments(rawText).find((l) => l.startsWith("MSH|"));
  const msgTypeForTransform = mshLine ? ((mshLine.split("|")[8] || "").split("^")[0] || "").toUpperCase() : "";
  if (msgTypeForTransform && !["ORM", "RDE"].includes(msgTypeForTransform)) return { text: splitMessageIntoSegments(rawText).join("\n"), changedLineNumbers: [], droppedLines: [], defaultedCalories: [] };
  const options = opts || {};
  const map = identifierMap || {};
  const groupMap = options.groupMap || {};
  const calorieFormat = options.calorieFormat || "as-mapped";
  const applyMilkDefault = options.applyMilkDefault !== false;
  const segments = splitMessageIntoSegments(rawText);
  const identifierFor = (label) => {
    const chosen = map[identifierKey(label)];
    if (chosen === NA_IDENTIFIER || chosen === OTHER_IDENTIFIER) return null;
    if (chosen) return chosen;
    const confirmed = vendorEntries.find((v) => v.segment && /^(OBX|NTE|OBXNTE)\|/.test(v.segment) && matchesAliasByName(label, v.aliases));
    if (confirmed) return stripPipePrefix(confirmed.segment).replace(/\.\d+$/, "").toUpperCase();
    return null;
  };
  const positionalMoves = [];
  vendorEntries.forEach((v) => {
    if (!v.segment || /^(OBX|NTE|OBXNTE)\|/.test(v.segment)) return;
    (v.userAliases || "").split(",").map((a) => a.trim()).filter(Boolean).forEach((a) => {
      const from = a.match(/^([A-Z0-9]{3})-(\d+)(?:\.(\d+))?$/);
      const to = stripOccurrenceSuffix(v.segment).match(/^([A-Z0-9]{3})-(\d+)(?:\.(\d+))?$/);
      if (from && to && a !== v.segment) positionalMoves.push({ from, to });
    });
  });
  let items = [];
  const dropped = [];
  let odsItem = null;
  const odsValues = [];
  const structural = { OBX: false, NTE: false };
  segments.forEach((line) => {
    const parts = line.split("|");
    const seg = parts[0];
    if (seg === "ODS") {
      const val = (parts[3] || "").trim();
      if (!odsItem) {
        odsItem = { kind: "ods", original: line };
        items.push(odsItem);
      } else odsItem.merged = true;
      if (val && !odsValues.includes(val)) odsValues.push(val);
      return;
    }
    if (seg === "OBX" || seg === "NTE") {
      const r = readIdentifierLine(line);
      if (!r || !r.label) {
        items.push({ kind: "line", seg, text: line, original: line });
        return;
      }
      if (r.recognized) {
        items.push({ kind: "id", seg, parts, id: r.label.toUpperCase(), group: r.group, value: r.value, related: r.related, original: line, fromLabel: false });
        return;
      }
      const id = identifierFor(r.label);
      if (id === OMIT_IDENTIFIER) {
        dropped.push(line);
        structural[seg] = true;
        return;
      }
      if (!id) {
        items.push({ kind: "line", seg, text: line, original: line });
        return;
      }
      let value = r.value;
      let related = "";
      if (id === "CONSENT") {
        const cat = consentCategoryFromLabel(r.label + " " + value);
        const yn = /^y/i.test(value) ? "YES" : /^n/i.test(value) ? "NO" : value.toUpperCase();
        if (cat && !/\^/.test(value)) {
          value = cat;
          related = yn;
        }
      }
      items.push({ kind: "id", seg, parts, id, group: groupMap[identifierKey(r.label)] || "", value, related, original: line, fromLabel: true });
      return;
    }
    let newLine = line;
    positionalMoves.forEach(({ from, to }) => {
      if (from[1] !== seg || to[1] !== seg) return;
      const p = newLine.split("|");
      const fIdx = seg === "MSH" ? Number(from[2]) - 1 : Number(from[2]);
      const tIdx = seg === "MSH" ? Number(to[2]) - 1 : Number(to[2]);
      const srcField = p[fIdx] || "";
      const srcVal = from[3] ? comp(srcField, Number(from[3])) : srcField;
      if (!srcVal) return;
      while (p.length <= tIdx) p.push("");
      if (to[3]) {
        const tc = (p[tIdx] || "").split("^");
        while (tc.length < Number(to[3])) tc.push("");
        if (tc[Number(to[3]) - 1] === srcVal) return;
        tc[Number(to[3]) - 1] = srcVal;
        p[tIdx] = tc.join("^");
      } else {
        if (p[tIdx] === srcVal) return;
        p[tIdx] = srcVal;
      }
      newLine = p.join("|");
    });
    items.push({ kind: "line", seg, text: newLine, original: line });
  });
  const idItems = (seg) => items.filter((it) => it.kind === "id" && it.seg === seg);
  const numberOf = (v) => {
    const m = (v || "").match(/\d+(\.\d+)?/);
    return m ? m[0] : v;
  };
  const isNumericish = (v) => /^\s*\d+(\.\d+)?\b/.test(v || "") && !/[a-z]{3,}/i.test((v || "").replace(/kcal\/oz|cal\/oz|kcal|ml|g\b/gi, ""));
  ["OBX", "NTE"].forEach((seg) => {
    CALORIE_FAMILIES.forEach((fam) => {
      const group = idItems(seg).filter((it) => it.id === fam.one && it.fromLabel);
      const byGroup = {};
      group.forEach((it) => (byGroup[it.group] = byGroup[it.group] || []).push(it));
      Object.values(byGroup).forEach((g) => {
        const textItems = g.filter((it) => !isNumericish(it.value));
        const numItems = g.filter((it) => isNumericish(it.value));
        if (textItems.length === 1 && numItems.length === 1 && !textItems[0].related) {
          textItems[0].related = numberOf(numItems[0].value);
          numItems[0].kind = "removed";
          structural[seg] = true;
        }
      });
    });
    idItems(seg).forEach((it) => {
      if (CALORIE_FAMILIES.some((f) => f.calRe.test(it.id))) it.value = numberOf(it.value);
    });
  });
  const newCalItem = (baseItem, id, value, extra) => ({ kind: "id", seg: baseItem.seg, parts: baseItem.parts, id, group: baseItem.group, value, related: "", original: "", inserted: true, ...extra || {} });
  if (calorieFormat === "one" || calorieFormat === "separate") {
    ["OBX", "NTE"].forEach((seg) => {
      CALORIE_FAMILIES.forEach((fam) => {
        if (calorieFormat === "one") {
          idItems(seg).filter((it) => fam.re.test(it.id)).forEach((baseIt) => {
            const suffix = baseIt.id.match(fam.re)[1];
            const calIt = idItems(seg).find((c) => c.id === fam.cal + suffix);
            baseIt.id = fam.one;
            if (calIt) {
              baseIt.related = calIt.value;
              calIt.kind = "removed";
            }
            structural[seg] = structural[seg] || !!calIt;
          });
        } else {
          const used = new Set(idItems(seg).map((it) => (it.id.match(fam.re) || [])[1]).filter(Boolean));
          const pool = fam.suffixes.filter((s) => !used.has(s));
          idItems(seg).filter((it) => it.id === fam.one).forEach((baseIt) => {
            const suffix = pool.shift();
            baseIt.id = fam.base + suffix;
            if (baseIt.related) {
              const idx = items.indexOf(baseIt);
              items.splice(idx + 1, 0, newCalItem(baseIt, fam.cal + suffix, baseIt.related));
              baseIt.related = "";
              structural[seg] = true;
            }
          });
        }
      });
    });
  }
  const anyNteMapped = idItems("NTE").length > 0;
  const hasFeedBase = items.some((it) => it.kind === "id" && /^FEED_BASE(_[A-Z])?$/.test(it.id));
  if (anyNteMapped && odsValues.length > 0 && !hasFeedBase) {
    const firstNte = items.findIndex((it) => it.seg === "NTE" && it.kind !== "removed");
    const template = { seg: "NTE", parts: ["NTE", "", "", ""], group: "" };
    const synth = calorieFormat === "separate" ? newCalItem(template, "FEED_BASE_A", odsValues.join(", ")) : newCalItem(template, "FEED_BASE", odsValues.join(", "));
    items.splice(firstNte, 0, synth);
    structural.NTE = true;
  }
  const defaulted = [];
  if (applyMilkDefault) {
    ["OBX", "NTE"].forEach((seg) => {
      idItems(seg).forEach((it) => {
        if (!HUMAN_MILK_RE.test(it.value || "")) return;
        if (it.id === "FEED_BASE" && !it.related) {
          it.related = DEFAULT_HUMAN_MILK_KCAL;
          defaulted.push(`${it.id}: ${it.value}`);
        } else {
          const m = it.id.match(/^FEED_BASE_([A-Z])$/);
          if (!m) return;
          if (idItems(seg).some((c) => c.id === "FEED_BASECAL_" + m[1])) return;
          const idx = items.indexOf(it);
          items.splice(idx + 1, 0, newCalItem(it, "FEED_BASECAL_" + m[1], DEFAULT_HUMAN_MILK_KCAL));
          structural[seg] = true;
          defaulted.push(`${it.id}: ${it.value}`);
        }
      });
    });
  }
  items = items.filter((it) => it.kind !== "removed");
  const counters = { OBX: 0, NTE: 0 };
  const nextSetId = (seg, orig) => {
    counters[seg]++;
    return structural[seg] || !orig ? String(counters[seg]) : orig;
  };
  const out = [];
  const changed = [];
  items.forEach((it) => {
    let text;
    if (it.kind === "ods") {
      text = it.merged ? `ODS|D||${odsValues.join(", ")}|` : it.original;
    } else if (it.kind === "id" && it.seg === "OBX") {
      const p = [...it.parts];
      while (p.length < 6) p.push("");
      p[1] = nextSetId("OBX", it.inserted ? "" : p[1]);
      if (it.inserted) {
        p[2] = "NM";
        p[3] = it.id;
      } else {
        const c = (p[3] || "").split("^");
        c[0] = it.id;
        p[3] = c.join("^");
      }
      p[4] = it.group || "";
      p[5] = it.related ? `${it.value}^${it.related}` : it.value;
      if (it.inserted) p.length = 6;
      text = p.join("|");
    } else if (it.kind === "id") {
      text = `NTE|${nextSetId("NTE", it.inserted ? "" : it.parts[1])}||${it.id}^${it.group || ""}^${it.value}${it.related ? "^" + it.related : ""}|`;
    } else if (it.seg === "OBX" || it.seg === "NTE") {
      const p = it.text.split("|");
      p[1] = nextSetId(it.seg, p[1]);
      text = p.join("|");
    } else {
      text = it.text;
    }
    const strip = (x) => (x || "").replace(/\|+$/, "");
    if (strip(text) === strip(it.original)) text = it.original;
    else changed.push(out.length);
    out.push(text);
  });
  return { text: out.join("\n"), changedLineNumbers: changed, droppedLines: dropped, defaultedCalories: defaulted };
}
