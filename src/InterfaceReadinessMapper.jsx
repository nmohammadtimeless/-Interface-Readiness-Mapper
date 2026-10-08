import React, { useState } from "react";
import { Upload, ClipboardList, RefreshCw, Building2, Stethoscope, ChevronRight, ChevronDown, ChevronUp, Info, ListChecks, FileWarning, Wand2, ScanText, Plus, Trash2, AlertTriangle } from "lucide-react";
import ClientRow from "./components/ClientRow";
import LevelBadge from "./components/LevelBadge";
import ReadinessGauge from "./components/ReadinessGauge";
import SignalPath from "./components/SignalPath";
import StatusBadge from "./components/StatusBadge";
import VendorRow from "./components/VendorRow";
import { LEVEL_STYLE, STATUS_ORDER, STATUS_STYLE_MAP } from "./constants/styles";
import { descriptionForFieldIdentifier } from "./data/exampleSeedRequirements";
import { useClientMessage } from "./hooks/useClientMessage";
import { useCompatibilityReport } from "./hooks/useCompatibilityReport";
import { extractRequirementsFromText, useVendorRequirements } from "./hooks/useVendorRequirements";
import { ALL_LISTED_IDENTIFIERS, FIELD_IDENTIFIER_GROUPS, GROUPING_ID_OPTIONS, NA_IDENTIFIER, OMIT_IDENTIFIER, OTHER_IDENTIFIER, identifierNameOf, splitMessageIntoSegments, suggestIdentifiers } from "./utils/aliasMatching";

export default function InterfaceReadinessMapper() {
  const {
    ehr,
    setEhr,
    clientEntries,
    hl7Text,
    setHl7Text,
    hl7Summary,
    handleParseHL7,
    updateClientEntry,
    removeClientEntry,
    addClientEntry,
    clearClientEntries
  } = useClientMessage();
  const {
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
  } = useVendorRequirements();
  const [workflowLabel, setWorkflowLabel] = useState("");
  const {
    showReport,
    setShowReport,
    activeStatuses,
    toggleStatus,
    setActiveStatuses,
    actionableUnmappedFields,
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
  } = useCompatibilityReport({ clientEntries, vendorEntries, setVendorEntries, hl7Text, hl7Summary, workflowLabel });
  return (
    <div
      className="max-w-6xl mx-auto p-6 space-y-6 bg-[#EEF2F8] min-h-screen"
      style={{ fontFamily: "'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif" }}
    >
      <style>
        {`
            @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');
            .hl7-mono { font-family: 'IBM Plex Mono', ui-monospace, monospace; }
            .signal-teal { color: #005399; }
            .signal-amber { color: #B8792A; }
            .signal-brick { color: #A8433A; }
          `}
      </style>
      <div
        className="rounded-lg px-5 py-4 flex items-center justify-between gap-4"
        style={{ backgroundColor: "#263B7E" }}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="hl7-mono text-2xl font-semibold text-white tracking-tight flex items-baseline">
              <span>EHR</span>
              <span className="text-[#7A93D6] mx-2 font-normal">|</span>
              <span>Vendor</span>
            </div>
            <span
              className="hl7-mono text-[11px] text-[#9FB4E8] border border-[#3A519C] rounded px-1.5 py-0.5 mt-0.5"
            >
              {"MSH|^~\\&|"}
            </span>
          </div>
          <h1 className="text-sm font-medium text-[#C3D6F5] flex items-center gap-2">
            <ListChecks className="text-[#35C8EA]" size={16} />
            Interface Readiness Mapper
          </h1>
        </div>
        <div className="hidden sm:block text-right">
          <div className="text-[10px] uppercase tracking-widest text-[#7A93D6]">Diagnostic scope</div>
          <div className="text-xs text-[#C3D6F5] max-w-[220px]">
            One HL7 message, one vendor spec, field-by-field
          </div>
        </div>
      </div>
      <p className="text-sm text-stone-500 max-w-3xl -mt-2">
        Client fields come from a real HL7 message. Vendor fields come from their requirements doc, shown as required / conditional / optional with accepted values - not raw pasted text.
      </p>
      <div
        className="bg-white border border-stone-200 rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-4 shadow-sm"
      >
        <div>
          <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">EHR system</label>
          <input
            type="text"
            value={ehr}
            onChange={(e) => setEhr(e.target.value)}
            className="hl7-mono mt-1 w-full border border-stone-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#005399]/30 focus:border-[#005399]"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">
            Vendor application
          </label>
          <input
            type="text"
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            placeholder="e.g. Vendor System Name"
            className="hl7-mono mt-1 w-full border border-stone-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#005399]/30 focus:border-[#005399]"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">Workflow label</label>
          <input
            type="text"
            value={workflowLabel}
            onChange={(e) => setWorkflowLabel(e.target.value)}
            className="mt-1 w-full border border-stone-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#005399]/30 focus:border-[#005399]"
          />
        </div>
      </div>
      <SignalPath
        ehr={ehr}
        vendor={vendor}
        hasClient={clientEntries.length > 0}
        hasVendor={vendorEntries.length > 0}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
          <div
            className="text-white px-4 py-3 flex items-center justify-between gap-2"
            style={{ backgroundColor: "#005399" }}
          >
            <div className="flex items-center gap-2">
              <Building2 size={18} />
              <div>
                <div className="font-medium text-sm flex items-center gap-2">
                  {"Client side \u2014 "}
                  {ehr}
                  <span
                    className={`inline-block w-1.5 h-1.5 rounded-full ${clientEntries.length > 0 ? "bg-[#35C8EA]" : "bg-white/25"}`}
                    title={clientEntries.length > 0 ? "Fields loaded" : "No fields yet"}
                  />
                </div>
                <div className="text-xs" style={{ color: "#CFE6F9" }}>Paste a real HL7 message</div>
              </div>
            </div>
            <button
              onClick={clearClientEntries}
              className="text-[11px] bg-white/15 hover:bg-white/25 text-white border border-white/30 rounded px-2 py-1 self-start"
            >
              Clear all
            </button>
          </div>
          <div className="p-4 border-b border-stone-100 space-y-2">
            <div className="flex items-center justify-between">
              <label
                className="flex items-center gap-2 text-xs font-medium text-stone-500 uppercase tracking-wide"
              >
                <ScanText size={13} />
                {" Paste raw HL7 message"}
              </label>
              <button
                onClick={handleParseHL7}
                className="px-3 py-1.5 text-xs text-white hover:bg-[#00417A] rounded-md flex items-center gap-1 font-medium flex-shrink-0 shadow-sm"
                style={{ backgroundColor: "#005399" }}
              >
                <Wand2 size={13} />
                {" Parse message"}
              </button>
            </div>
            <textarea
              value={hl7Text}
              onChange={(e) => setHl7Text(e.target.value)}
              rows={5}
              placeholder={"MSH|^~\\&|...\nPID|1|MPID014569|MRN06579||DUCK^DONALD^D...\nPV1|1||NICU^101^A1..."}
              className="w-full text-xs hl7-mono border border-stone-200 rounded px-2 py-1"
            />
            {hl7Summary && hl7Summary.error && <div className="text-xs bg-red-50 border border-red-200 rounded p-2 text-red-800">
              {"Parsing failed: "}
              {hl7Summary.error}
              . Please share this message so it can be fixed.
            </div>}
            {hl7Summary && !hl7Summary.error && <div className="text-xs bg-green-50 border border-green-200 rounded p-2 text-green-800">
              {"Extracted "}
              {hl7Summary.count}
              {" field(s) - replaces the list below."}
              {hl7Summary.msgType && <div className="mt-1 font-medium">
                {"Detected message type: "}
                {hl7Summary.msgType}
                ^
                {hl7Summary.trigger}
                {" ("}
                {hl7Summary.workflow}
                {" workflow)"}
              </div>}
              {!hl7Summary.msgType && <div className="mt-1 text-amber-700">
                Could not detect a message type (no MSH-9 found) - the report will compare against all loaded vendor requirements regardless of workflow.
              </div>}
            </div>}
          </div>
          <div className="p-4 max-h-[420px] overflow-y-auto">
            {clientEntries.length === 0 && <div className="text-xs text-stone-400 italic">
              No entries yet - paste a message above or add a row manually.
            </div>}
            {clientEntries.map((entry) => <ClientRow key={entry.id} entry={entry} onChange={updateClientEntry} onRemove={removeClientEntry} />)}
            <button
              onClick={addClientEntry}
              className="mt-2 px-2 py-1 text-xs border border-stone-300 rounded-md text-stone-600 flex items-center gap-1"
            >
              <Plus size={12} />
              {" Add row manually"}
            </button>
          </div>
        </div>
        <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
          <div
            className="text-white px-4 py-3 flex items-center justify-between gap-2"
            style={{ backgroundColor: "#263B7E" }}
          >
            <div className="flex items-center gap-2">
              <Stethoscope size={18} />
              <div>
                <div className="font-medium text-sm flex items-center gap-2">
                  Vendor side
                  {vendor ? ` \u2014 ${vendor}` : ""}
                  <span
                    className={`inline-block w-1.5 h-1.5 rounded-full ${vendorEntries.length > 0 ? "bg-[#35C8EA]" : "bg-white/25"}`}
                    title={vendorEntries.length > 0 ? "Requirements loaded" : "No requirements yet"}
                  />
                </div>
                <div className="text-xs" style={{ color: "#CFE6F9" }}>
                  Load a saved vendor's requirements, upload a doc, or paste a sample message
                </div>
              </div>
            </div>
            <button
              onClick={clearVendorEntries}
              className="text-[11px] bg-white/15 hover:bg-white/25 text-white border border-white/30 rounded px-2 py-1 self-start"
            >
              Clear all
            </button>
          </div>
          <div className="p-4 border-b border-stone-100 space-y-2">
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">
              Saved vendor requirement sets
            </label>
            <div className="flex items-center gap-2">
              <select
                value={selectedSavedSet}
                onChange={(e) => setSelectedSavedSet(e.target.value)}
                className="flex-1 text-xs border border-stone-300 rounded px-2 py-1.5 bg-white"
              >
                <option value="">Select a saved set...</option>
                {savedSetNames.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
              <button
                onClick={() => loadSavedSet(selectedSavedSet)}
                disabled={!selectedSavedSet}
                className="text-xs px-2 py-1.5 border border-stone-300 rounded text-stone-700 disabled:opacity-40"
              >
                Load
              </button>
              <button
                onClick={() => deleteSavedSet(selectedSavedSet)}
                disabled={!selectedSavedSet}
                className="text-stone-400 hover:text-red-500 disabled:opacity-30"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={saveAsName}
                onChange={(e) => setSaveAsName(e.target.value)}
                placeholder="Save current list as..."
                className="flex-1 text-xs border border-stone-300 rounded px-2 py-1.5"
              />
              <button
                onClick={saveCurrentAsSet}
                disabled={!saveAsName.trim() || vendorEntries.length === 0}
                className="text-xs px-2 py-1.5 border border-stone-300 rounded text-stone-700 disabled:opacity-40"
              >
                Save as...
              </button>
            </div>
            {savedSetsError && <div className="text-[11px] text-red-600">{savedSetsError}</div>}
          </div>
          <div className="p-4 border-b border-stone-100 space-y-2">
            <label
              className="flex items-center gap-2 text-xs font-medium text-stone-500 uppercase tracking-wide"
            >
              <Upload size={13} />
              {" Upload requirements document (.docx or .txt)"}
            </label>
            <input
              type="file"
              multiple={true}
              accept=".docx,.txt,.csv"
              onChange={handleVendorFileSelect}
              className="text-xs w-full text-stone-500"
            />
            {pendingVendorFiles.length > 0 && <ul className="space-y-1">
              {pendingVendorFiles.map((f, i) => <li
                key={i}
                className="text-xs text-stone-600 flex items-center justify-between bg-stone-50 rounded px-2 py-1"
              >
                <span>{f.name}</span>
                <button onClick={() => removePendingFile(i)} className="text-stone-400 hover:text-red-500">
                  <Trash2 size={12} />
                </button>
              </li>)}
            </ul>}
            <button
              onClick={handleExtractPendingFiles}
              disabled={pendingVendorFiles.length === 0}
              className="px-3 py-1.5 text-xs hover:bg-[#00417A] text-white rounded-md flex items-center gap-1 font-medium shadow-sm disabled:opacity-40"
              style={{ backgroundColor: "#005399" }}
            >
              <ScanText size={13} />
              {" Extract from uploaded document(s)"}
            </button>
            <div className="text-[11px] text-stone-400">
              PDF isn't supported for auto-extraction - paste the relevant text below instead.
            </div>
            <textarea
              value={vendorPasteText}
              onChange={(e) => setVendorPasteText(e.target.value)}
              rows={3}
              className="w-full text-xs border border-stone-200 rounded px-2 py-1"
            />
            <button
              onClick={() => vendorPasteText.trim() && applyDocExtraction(extractRequirementsFromText(vendorPasteText), "pasted text")}
              className="px-3 py-1.5 text-xs hover:bg-[#00417A] text-white rounded-md flex items-center gap-1 font-medium shadow-sm"
              style={{ backgroundColor: "#005399" }}
            >
              <Wand2 size={13} />
              {" Extract from pasted text"}
            </button>
            {extractionLog.map((log, i) => <div key={i} className="text-xs bg-blue-50 border border-blue-200 rounded p-2 text-blue-900">
              {log.error ? <div className="text-red-700">{log.file}{": "}{log.error}</div> : <>
                <div>
                  <strong>{log.file}</strong>
                  {": added "}
                  {log.addedCount}
                  {" requirement row(s) below."}
                </div>
                <div className="text-blue-600 text-[11px] mt-0.5">{log.diagnostics}</div>
                {log.unmatched.length > 0 && <div className="mt-1">
                  <button
                    onClick={() => setShowUnmatched((prev) => ({ ...prev, [i]: !prev[i] }))}
                    className="flex items-center gap-1 text-blue-700 underline"
                  >
                    {showUnmatched[i] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    {log.unmatched.length}
                    {" reference(s) found with no usable label nearby - review manually"}
                  </button>
                  {showUnmatched[i] && <ul className="mt-1 pl-4 list-disc space-y-0.5">
                    {log.unmatched.map((u, j) => <li key={j} className="hl7-mono">{u.segment}{' - "'}{u.sourceLine}"</li>)}
                  </ul>}
                </div>}
                {log.levelHintsWithoutSegment && log.levelHintsWithoutSegment.length > 0 && <div className="mt-1">
                  <button
                    onClick={() => setShowUnmatched((prev) => ({ ...prev, [`lh${i}`]: !prev[`lh${i}`] }))}
                    className="flex items-center gap-1 text-amber-700 underline"
                  >
                    {showUnmatched[`lh${i}`] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    {log.levelHintsWithoutSegment.length}
                    {" line(s) mention conditional/optional but have no segment code nearby - couldn't auto-add, add manually"}
                  </button>
                  {showUnmatched[`lh${i}`] && <ul className="mt-1 pl-4 list-disc space-y-0.5">
                    {log.levelHintsWithoutSegment.map((u, j) => <li key={j}>[{u.level}] "{u.sourceLine}"</li>)}
                  </ul>}
                </div>}
              </>}
            </div>)}
            <label
              className="flex items-center gap-2 text-xs font-medium text-stone-500 uppercase tracking-wide pt-1"
            >
              <ScanText size={13} />
              {" Or paste a sample of the vendor's translated HL7 message"}
            </label>
            <textarea
              value={vendorHl7Text}
              onChange={(e) => setVendorHl7Text(e.target.value)}
              rows={3}
              className="w-full text-xs hl7-mono border border-stone-200 rounded px-2 py-1"
            />
            <button
              onClick={handleParseVendorHL7}
              className="px-3 py-1.5 text-xs hover:bg-[#00417A] text-white rounded-md flex items-center gap-1 font-medium shadow-sm"
              style={{ backgroundColor: "#005399" }}
            >
              <Wand2 size={13} />
              {" Parse sample message"}
            </button>
            {vendorHl7Summary && <div className="text-xs bg-blue-50 border border-blue-200 rounded p-2 text-blue-900">
              {"Added "}
              {vendorHl7Summary.count}
              {" field(s), marked required."}
              {vendorHl7Summary.msgType && <div className="mt-1 font-medium">
                {"Detected message type: "}
                {vendorHl7Summary.msgType}
                ^
                {vendorHl7Summary.trigger}
                {" ("}
                {vendorHl7Summary.workflow}
                {" workflow) - tagged accordingly."}
              </div>}
            </div>}
          </div>
          <div className="p-4 max-h-[460px] overflow-y-auto space-y-4">
            {["required", "conditional", "optional"].map((level) => <div key={level}>
              <div
                className={`flex items-center justify-between px-2 py-1 rounded border ${LEVEL_STYLE[level].header} mb-1`}
              >
                <span className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${LEVEL_STYLE[level].dot}`} />
                  {" "}
                  {level}
                  {" ("}
                  {groupedVendor[level].length}
                  )
                </span>
                <button
                  onClick={() => addVendorEntry(level)}
                  className="text-[11px] flex items-center gap-0.5 opacity-70 hover:opacity-100"
                >
                  <Plus size={11} />
                  {" add"}
                </button>
              </div>
              {groupedVendor[level].length === 0 && <div className="text-[11px] text-stone-400 italic pl-2 pb-1">none yet</div>}
              {groupedVendor[level].map((entry) => <VendorRow key={entry.id} entry={entry} onChange={updateVendorEntry} onRemove={removeVendorEntry} />)}
            </div>)}
          </div>
        </div>
      </div>
      {actionableUnmappedFields.length > 0 && <div className="bg-white border border-amber-300 rounded-lg p-4 space-y-3">
        <div className="text-sm font-semibold text-amber-800 flex items-center gap-2">
          <Wand2 size={16} />
          {" Message translation - confirm what these client fields mean before generating the report"}
        </div>
        <div className="text-xs text-stone-500">
          {"The client message uses "}
          {actionableUnmappedFields.length}
          {" field(s) that don't match anything in the loaded requirements yet - by name (an OBX/NTE identifier) or by position (e.g. a different field number within the same segment). If one of these is just the vendor's requirement written differently, map it below - this is applied as an alias, so the report can recognize it correctly."}
        </div>
        <div className="space-y-2">
          {actionableUnmappedFields.map(({ entry: c, options: rowOptions }, i) => {
            const idName = identifierNameOf(c.segment);
            return <div
              key={i}
              className="flex flex-wrap items-center gap-2 text-sm bg-amber-50 border border-amber-100 rounded-md p-2"
            >
              <div className="flex-1 min-w-0">
                <span className="hl7-mono text-xs text-stone-700">{idName || c.segment}</span>
                <span className="text-stone-400 text-xs">{' = "'}{c.value}"</span>
              </div>
              <ChevronRight size={14} className="text-stone-400 flex-shrink-0" />
              <select
                className="text-xs border border-stone-300 rounded px-2 py-1 flex-1 min-w-0 bg-white"
                value={translationOther[c.segment] !== void 0 ? "__OTHER__" : ""}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "__NA__") dismissTranslation(c.segment);
                  else if (v === "__OTHER__") setTranslationOther((prev) => ({ ...prev, [c.segment]: "" }));
                  else if (v) {
                    setTranslationOther((prev) => {
                      const next = { ...prev };
                      delete next[c.segment];
                      return next;
                    });
                    applyTranslation(c.segment, v);
                  }
                }}
              >
                <option value="">This means... (select a requirement)</option>
                {rowOptions.length > 0 && <optgroup label="Suggested requirements">
                  {rowOptions.map((opt) => <option key={opt.vendorEntryId + "::" + opt.display} value={opt.vendorEntryId}>
                    {"\u2605 " + opt.display}
                  </option>)}
                </optgroup>}
                <optgroup label="Not a match">
                  <option value="__NA__">N/A - not applicable (hide this field)</option>
                  <option value="__OTHER__">Other - type the vendor field...</option>
                </optgroup>
              </select>
              {translationOther[c.segment] !== void 0 && <div className="flex items-center gap-1 w-full sm:w-auto">
                <input
                  type="text"
                  autoFocus={true}
                  placeholder="e.g. PV1-7.2"
                  value={translationOther[c.segment]}
                  onChange={(e) => setTranslationOther((prev) => ({ ...prev, [c.segment]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") applyTranslationOther(c.segment, translationOther[c.segment]);
                  }}
                  className="hl7-mono text-xs border border-amber-400 rounded px-2 py-1 w-32 bg-white"
                />
                <button
                  onClick={() => applyTranslationOther(c.segment, translationOther[c.segment])}
                  className="text-xs px-2 py-1 rounded text-white"
                  style={{ backgroundColor: "#005399" }}
                >
                  Apply
                </button>
              </div>}
            </div>;
          })}
        </div>
      </div>}
      {messageRules && messageRules.summary && <div className="bg-white border border-stone-300 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm font-semibold text-[#263B7E] flex items-center gap-2">
            <ListChecks size={16} />
            {" Message rules check - TMNP Interface Requirements v6.0.0"}
          </div>
          <div className="flex gap-1.5 text-[11px]">
            {["fail", "warn", "info", "pass"].map((s) => <span
              key={s}
              className={"px-2 py-0.5 rounded-full border " + ({ fail: "bg-red-50 text-red-700 border-red-200", warn: "bg-amber-50 text-amber-800 border-amber-200", info: "bg-blue-50 text-blue-700 border-blue-200", pass: "bg-emerald-50 text-emerald-700 border-emerald-200" })[s]}
            >
              {s === "fail" ? "Fails" : s === "warn" ? "Warnings" : s === "info" ? "Notes" : "Passed"}
              {" "}
              {messageRules.checks.filter((c) => c.status === s).length}
            </span>)}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <div className="bg-[#EEF2F8] rounded-md p-2">
            <div className="text-[10px] uppercase tracking-wide text-stone-500">Message</div>
            <div className="hl7-mono text-stone-800">
              {messageRules.summary.msgType || "?"}
              {messageRules.summary.trigger ? "^" + messageRules.summary.trigger : ""}
            </div>
          </div>
          <div className="bg-[#EEF2F8] rounded-md p-2">
            <div className="text-[10px] uppercase tracking-wide text-stone-500">Handled as</div>
            <div className="text-stone-800">{messageRules.summary.kind || "-"}</div>
          </div>
          <div className="bg-[#EEF2F8] rounded-md p-2">
            <div className="text-[10px] uppercase tracking-wide text-stone-500">TMS action</div>
            <div className="text-stone-800">{messageRules.summary.action || "-"}</div>
          </div>
        </div>
        <div className="space-y-1">
          {["fail", "warn", "info", "pass"].flatMap((s) => messageRules.checks.filter((c) => c.status === s)).map((c, i) => <div key={i} className="flex items-start gap-2 text-xs border-b border-stone-100 py-1">
            <span
              className={"flex-shrink-0 w-14 text-center text-[10px] uppercase font-semibold rounded px-1 py-0.5 " + ({ fail: "bg-red-100 text-red-700", warn: "bg-amber-100 text-amber-800", info: "bg-blue-100 text-blue-700", pass: "bg-emerald-100 text-emerald-700" })[c.status]}
            >
              {c.status}
            </span>
            <span className="flex-1 text-stone-700">{c.text}</span>
            {c.ref && <span className="flex-shrink-0 text-[10px] text-stone-400 max-w-[180px] text-right">{c.ref}</span>}
          </div>)}
        </div>
      </div>}
      {/(^|\s)(OBX|NTE)\|/.test(hl7Text || "") && /\|(ORM|RDE)\^/.test(hl7Text || "") && <div className="bg-white border border-[#005399]/30 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm font-semibold text-[#005399] flex items-center gap-2">
            <Wand2 size={16} />
            {" Field identifiers - map each OBX-3.1 / NTE-3.1 label to a TMNP field identifier"}
          </div>
          <button
            onClick={applySuggestedIdentifiers}
            className="text-xs px-2 py-1 border border-stone-300 rounded-md text-stone-600 hover:bg-stone-50"
          >
            Fill obvious ones (route, frequency, volume, fortifier, consent)
          </button>
        </div>
        <div className="text-xs text-stone-500">
          Per the requirements doc, the identifier goes in OBX-3.1 (or NTE-3.1); for OBX the original text stays in OBX-3.2. Labels left as sent are not recognized by TMS and map to the order's Notes section.
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs text-stone-600 bg-[#EEF2F8] rounded-md p-2">
          <label className="flex items-center gap-2">
            Calorie format:
            <select
              className="text-xs border border-stone-300 rounded px-2 py-1 bg-white"
              value={calorieFormat}
              onChange={(e) => setCalorieFormat(e.target.value)}
            >
              <option value="as-mapped">As mapped</option>
              <option value="one">One segment - FEED_BASE^grp^name^cal</option>
              <option value="separate">Separate segments - FEED_BASE_A + FEED_BASECAL_A</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={applyMilkDefault}
              onChange={(e) => setApplyMilkDefault(e.target.checked)}
            />
            Default breast milk / donor milk bases to 20 kcal/oz when no calories are sent
          </label>
        </div>
        <div className="space-y-2">
          {clientIdentifierFields.map((r) => <div
            key={r.key}
            className="flex items-center gap-2 text-sm bg-stone-50 border border-stone-200 rounded-md p-2"
          >
            <div className="flex-1 min-w-0">
              <span className="hl7-mono text-[10px] text-stone-400 mr-1">{r.seg}</span>
              <span className="hl7-mono text-xs text-stone-700">{r.label}</span>
              <span className="text-stone-400 text-xs">{' = "'}{r.value}"</span>
            </div>
            <ChevronRight size={14} className="text-stone-400 flex-shrink-0" />
            {(() => {
              const cur = identifierMap[r.key] || "";
              const selectVal = !cur ? "" : cur === NA_IDENTIFIER || cur === OMIT_IDENTIFIER || cur === OTHER_IDENTIFIER || ALL_LISTED_IDENTIFIERS.has(cur) ? cur : OTHER_IDENTIFIER;
              const sugg = suggestIdentifiers(r.label, r.value);
              return <div className="flex-1 min-w-0 flex items-center gap-1">
                <select
                  className="hl7-mono text-xs border border-stone-300 rounded px-2 py-1 flex-1 min-w-0 bg-white"
                  value={selectVal}
                  onChange={(e) => setFieldIdentifier(r.key, e.target.value)}
                >
                  <option value="">Keep as sent (goes to Notes)</option>
                  {sugg.length > 0 && <optgroup label="Suggested for this field">
                    {sugg.map((id) => <option key={"s-" + id} value={id}>{"\u2605 " + id}</option>)}
                  </optgroup>}
                  <optgroup label="Not a match">
                    <option value={NA_IDENTIFIER}>N/A - not applicable</option>
                    <option value={OTHER_IDENTIFIER}>Other - type an identifier...</option>
                  </optgroup>
                  {FIELD_IDENTIFIER_GROUPS.map((g) => <optgroup key={g.label} label={g.label}>
                    {g.options.map(([id, text]) => <option key={id} value={id} title={descriptionForFieldIdentifier(id) || ""}>{text}</option>)}
                  </optgroup>)}
                  <option value={OMIT_IDENTIFIER}>Leave out of transformed message</option>
                </select>
                {selectVal === OTHER_IDENTIFIER && <input
                  type="text"
                  autoFocus={cur === OTHER_IDENTIFIER}
                  placeholder="e.g. FEED_BASE_F"
                  className="hl7-mono text-xs border border-[#005399]/50 rounded px-2 py-1 w-36 bg-white"
                  value={cur === OTHER_IDENTIFIER ? "" : cur}
                  onChange={(e) => {
                    const v = e.target.value.toUpperCase().replace(/\s+/g, "_");
                    setFieldIdentifier(r.key, v || OTHER_IDENTIFIER);
                  }}
                />}
              </div>;
            })()}
            <select
              title="Grouping ID (OBX-4.1 / NTE-3.2) - links this line to a specific feed base"
              className="hl7-mono text-xs border border-stone-300 rounded px-1 py-1 w-20 bg-white"
              value={groupMap[r.key] || ""}
              onChange={(e) => setFieldGroup(r.key, e.target.value)}
            >
              <option value="">Grp: -</option>
              {GROUPING_ID_OPTIONS.map((g) => <option key={g} value={g}>{"Grp: " + g}</option>)}
            </select>
          </div>)}
        </div>
      </div>}
      {hl7Text.trim() && <div className="bg-white border border-stone-300 rounded-lg p-4 space-y-2">
        <div className="text-sm font-semibold text-stone-700 flex items-center gap-2">
          <ScanText size={16} />
          {" Current message - as sent by the EHR ("}
          {splitMessageIntoSegments(hl7Text).length}
          {" segment(s))"}
        </div>
        <div className="text-xs text-stone-500">
          {transformedMessage.changedLineNumbers.length > 0 ? "Compare with the transformed message below. Lines that get rewritten are marked in amber." : "No lines are rewritten for this message, so this is exactly what the vendor receives."}
        </div>
        <pre
          className="text-xs hl7-mono bg-stone-100 text-stone-800 border border-stone-200 rounded-md p-3 overflow-x-auto whitespace-pre-wrap"
        >
          {splitMessageIntoSegments(hl7Text).map((line, i) => {
            const willChange = transformedMessage.changedLineNumbers.length > 0 && !transformedMessage.text.split("\n").includes(line);
            return <div key={i} className={willChange ? "bg-amber-200/70 -mx-3 px-3" : ""}>{line}</div>;
          })}
        </pre>
      </div>}
      {hl7Text.trim() && transformedMessage.changedLineNumbers.length > 0 && <div className="bg-white border border-blue-200 rounded-lg p-4 space-y-2">
        <div className="text-sm font-semibold text-blue-800 flex items-center gap-2">
          <RefreshCw size={16} />
          {" Transformed message - "}
          {transformedMessage.changedLineNumbers.length}
          {" line(s) rewritten to vendor terminology"}
        </div>
        <div className="text-xs text-stone-500">
          Built from the field identifiers chosen above. OBX: identifier replaces OBX-3.1, OBX-3.2 and the value are kept. NTE: written as IDENTIFIER^^value(^related value). Highlighted lines were changed.
        </div>
        {(transformedMessage.defaultedCalories || []).length > 0 && <div className="text-xs text-blue-800 bg-blue-50 border border-blue-200 rounded-md p-2">
          {"No calories sent - defaulted to 20 kcal/oz (EHM/DHM default): "}
          {transformedMessage.defaultedCalories.join("; ")}
        </div>}
        {(transformedMessage.droppedLines || []).length > 0 && <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-2">
          {"Left out of the transformed message (you chose to omit): "}
          {transformedMessage.droppedLines.map((l, i) => <span key={i} className="hl7-mono block">{l}</span>)}
        </div>}
        <pre
          className="text-xs hl7-mono bg-stone-900 text-stone-100 rounded-md p-3 overflow-x-auto whitespace-pre-wrap"
        >
          {transformedMessage.text.split("\n").map((line, i) => <div
            key={i}
            className={transformedMessage.changedLineNumbers.includes(i) ? "bg-blue-800/60 -mx-3 px-3" : ""}
          >
            {line}
          </div>)}
        </pre>
      </div>}
      <div className="flex items-center justify-between bg-white border border-stone-200 rounded-lg p-4">
        <div className="text-sm text-stone-500 flex items-center gap-2">
          <Info size={15} />
          {" Confirm the required / conditional / optional grouping above reflects the actual requirements doc, then generate the report."}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowReport(false)}
            className="px-3 py-2 text-sm border border-stone-300 rounded-md text-stone-600 flex items-center gap-1"
          >
            <RefreshCw size={14} />
            {" Reset report"}
          </button>
          <button
            onClick={() => setShowReport(true)}
            className="px-4 py-2 text-sm bg-[#005399] text-white hover:bg-[#00417A] rounded-md flex items-center gap-1 font-medium"
          >
            {"Generate compatibility report "}
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
      {report && <div className="bg-white border border-stone-200 rounded-lg p-5 space-y-5">
        <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
          <ClipboardList size={18} className="text-stone-600" />
          <h2 className="text-lg font-semibold text-stone-800">
            {"Compatibility report \u2014 "}
            {ehr}
            {" \u2192 "}
            {vendor}
            {" ("}
            {workflowLabel}
            )
          </h2>
        </div>
        {report.detectedWorkflow ? <div
          className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800"
        >
          <Info size={16} className="mt-0.5" />
          <div>
            {"Detected client message workflow: "}
            <strong>{report.detectedWorkflow}</strong>
            {". All "}
            {report.totalLoaded}
            {" loaded vendor requirements are shown below; "}
            {report.notApplicableCount}
            {' are tagged for a different workflow and marked "not applicable" rather than scored as missing.'}
          </div>
        </div> : <div
          className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-800"
        >
          <AlertTriangle size={16} className="mt-0.5" />
          <div>
            {"Could not detect a message type from the client message (no MSH-9 found or unrecognized type) - all "}
            {report.totalLoaded}
            {" loaded vendor requirements were compared regardless of workflow."}
          </div>
        </div>}
        {(report.translatedFields.length > 0 || report.disregardedSegmentTypes.length > 0) && <div className="border border-stone-200 rounded-md p-3 space-y-2 bg-stone-50">
          <div className="text-xs font-semibold text-stone-600 uppercase tracking-wide">
            {"Translation & scope summary"}
          </div>
          {report.translatedFields.length > 0 && <div className="text-sm text-stone-700">
            <div className="font-medium mb-1">
              {report.translatedFields.length}
              {" field(s) translated from EHR terminology to vendor terminology:"}
            </div>
            <ul className="space-y-0.5 pl-1">
              {report.translatedFields.map((t, i) => <li key={i} className="text-xs hl7-mono text-stone-600">
                "
                {t.rawSegment.replace(/^(OBX|NTE|OBXNTE)\|/, "")}
                {'" \u2192 '}
                <span className="text-blue-700">{t.vendorSegment}</span>
                {" ("}
                {t.vendorLabel}
                )
              </li>)}
            </ul>
          </div>}
          {report.disregardedSegmentTypes.length > 0 && <div className="text-sm text-stone-700">
            <div className="font-medium">
              {report.disregardedFieldCount}
              {" field(s) disregarded entirely - segments not referenced by any loaded vendor requirement:"}
            </div>
            <div className="text-xs text-stone-500 hl7-mono mt-0.5">{report.disregardedSegmentTypes.join(", ")}</div>
          </div>}
        </div>}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <ReadinessGauge pct={report.readinessPct} />
          <div className="bg-white border border-stone-200 rounded-md p-3">
            <div className="text-xs signal-teal font-medium">{"Required \u2014 aligned"}</div>
            <div className="text-2xl font-semibold" style={{ color: "#005399" }}>{report.requiredAligned}</div>
            <div className="text-xs text-stone-400">{"of "}{report.required.length}</div>
          </div>
          <div className="bg-white border border-stone-200 rounded-md p-3">
            <div className="text-xs signal-brick font-medium">{"Required \u2014 missing"}</div>
            <div className="text-2xl font-semibold" style={{ color: "#A8433A" }}>{report.requiredMissing}</div>
          </div>
          <div className="bg-white border border-stone-200 rounded-md p-3">
            <div className="text-xs signal-amber font-medium">Value mismatches</div>
            <div className="text-2xl font-semibold" style={{ color: "#B8792A" }}>
              {report.requiredValueMismatch}
            </div>
          </div>
          <div className="bg-white border border-stone-200 rounded-md p-3">
            <div className="text-xs text-stone-500 font-medium">Conditional fields</div>
            <div className="text-2xl font-semibold text-stone-700">{report.conditional.length}</div>
            <div className="text-xs text-stone-400">verify manually</div>
          </div>
        </div>
        {(report.requiredMissing > 0 || report.requiredValueMismatch > 0) && <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-800">
          <FileWarning size={16} className="mt-0.5" />
          <div>Resolve missing required fields and value mismatches below before go-live.</div>
        </div>}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs text-stone-500 mr-1">
            {activeStatuses.size === 0 ? "Showing everything relevant to this message (not-applicable rows hidden - click that chip to see them):" : "Showing only:"}
          </span>
          {STATUS_ORDER.map((status) => {
            const count = report.statusCounts[status] || 0;
            const active = activeStatuses.has(status);
            const style = STATUS_STYLE_MAP[status];
            return <button
              key={status}
              onClick={() => toggleStatus(status)}
              className={`text-xs px-2 py-1 rounded-full border flex items-center gap-1 ${active ? style.cls : "bg-white text-stone-400 border-stone-200"}`}
            >
              {style.text}
              {" "}
              <span className="font-semibold">{count}</span>
            </button>;
          })}
          {activeStatuses.size > 0 && <button
            onClick={() => setActiveStatuses(new Set())}
            className="text-xs px-2 py-1 rounded-full border border-stone-200 text-stone-500"
          >
            Show all
          </button>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-xs text-stone-500 uppercase tracking-wide border-b border-stone-200">
                <th className="py-2 pr-3">Vendor segment</th>
                <th className="py-2 pr-3">Field</th>
                <th className="py-2 pr-3">Level</th>
                <th className="py-2 pr-3">Workflow</th>
                <th className="py-2 pr-3">Accepted values</th>
                <th className="py-2 pr-3">Client segment</th>
                <th className="py-2 pr-3">Client value</th>
                <th className="py-2 pr-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const visibleRows = activeStatuses.size === 0 ? report.rows.filter((r) => r.status !== "not-applicable") : report.rows.filter((r) => activeStatuses.has(r.status));
                if (visibleRows.length === 0) return <tr>
                  <td colSpan={8} className="py-4 text-center text-sm text-stone-400 italic">
                    No rows match the selected filters.
                  </td>
                </tr>;
                return visibleRows.map((r, i) => <tr key={i} className={`border-b border-stone-100 align-top ${!r.applicable ? "opacity-50" : ""}`}>
                  <td className="py-2 pr-3 hl7-mono text-xs text-stone-700">{r.vendorSegment}</td>
                  <td className="py-2 pr-3 text-stone-600">{r.label}</td>
                  <td className="py-2 pr-3">
                    <LevelBadge level={r.level} />
                  </td>
                  <td className="py-2 pr-3 text-xs text-stone-500 uppercase">{r.workflow}</td>
                  <td className="py-2 pr-3 text-stone-500 text-xs">{r.acceptedValues || "-"}</td>
                  <td className="py-2 pr-3 hl7-mono text-xs text-stone-600">{r.clientSegment || "-"}</td>
                  <td className="py-2 pr-3 text-stone-600">{r.clientValue || "-"}</td>
                  <td className="py-2 pr-3">
                    <StatusBadge status={r.status} reason={r.notApplicableReason} />
                  </td>
                </tr>);
              })()}
            </tbody>
          </table>
        </div>
        {report.extra.length > 0 && <div>
          <div className="text-sm font-semibold text-stone-700 mb-2">
            {"Extra fields sent by the EHR (not required by "}
            {vendor || "the vendor"}
            )
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-xs text-stone-500 uppercase tracking-wide border-b border-stone-200">
                  <th className="py-2 pr-3">Segment</th>
                  <th className="py-2 pr-3">Meaning</th>
                  <th className="py-2 pr-3">Value</th>
                </tr>
              </thead>
              <tbody>
                {report.extra.map((c, i) => <tr key={i} className="border-b border-stone-100">
                  <td className="py-2 pr-3 hl7-mono text-xs text-stone-600">{c.segment}</td>
                  <td className="py-2 pr-3 text-stone-600">
                    {c.isUnrecognizedIdentifier ? <span
                      className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-stone-100 text-stone-500 border border-stone-200"
                    >
                      not mapped to a field identifier - TMS puts this in Notes
                    </span> : c.meaning || "-"}
                  </td>
                  <td className="py-2 pr-3 text-stone-600">{c.value}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
        </div>}
        <div className="bg-stone-50 rounded-md p-4">
          <div className="text-sm font-semibold text-stone-700 mb-2">Summary for the team</div>
          <ul className="text-sm text-stone-600 space-y-1 list-disc pl-5">
            <li>
              {report.required.length}
              {" required fields; "}
              {report.requiredAligned}
              {" aligned, "}
              {report.requiredMissing}
              {" missing, "}
              {report.requiredValueMismatch}
              {" sent but with a value outside the accepted list."}
            </li>
            {report.requiredMissing > 0 && <li>
              {"Missing: "}
              {report.rows.filter((r) => r.status === "missing").map((r) => `${r.label} (${r.vendorSegment})`).join(", ")}
              .
            </li>}
            {report.requiredValueMismatch > 0 && <li>
              {"Value mismatches: "}
              {report.rows.filter((r) => r.status === "value-mismatch").map((r) => `${r.label} sent "${r.clientValue}", expected one of: ${r.acceptedValues}`).join("; ")}
              .
            </li>}
            <li>
              {report.conditional.length}
              {" conditional fields depend on business logic this tool can't evaluate - confirm manually whether the condition applies."}
            </li>
            <li>
              {report.extra.length}
              {" field(s) sent by the EHR aren't required by "}
              {vendor || "the vendor"}
              {" - informational only."}
            </li>
          </ul>
        </div>
      </div>}
      <div className="text-center text-[11px] text-stone-400 pt-2">
        {"\xA9 2026 @Timeless Medical All rights reserved."}
      </div>
    </div>
  );
}
