import { useState } from "react";
import { extractGenericHL7 } from "../utils/hl7";
import { newId } from "../utils/id";

export function useClientMessage() {
  const [ehr, setEhr] = useState("Epic");
  const [clientEntries, setClientEntries] = useState([]);
  const [hl7Text, setHl7Text] = useState("");
  const [hl7Summary, setHl7Summary] = useState(null);
  function handleParseHL7() {
    if (!hl7Text.trim()) return;
    try {
      const { rows, msgType, trigger, workflow } = extractGenericHL7(hl7Text);
      setClientEntries(rows.map((r) => ({ id: newId(), ...r })));
      setHl7Summary({ count: rows.length, msgType, trigger, workflow });
    } catch (err) {
      setHl7Summary({ count: 0, error: err.message || "Unknown parsing error" });
    }
  }
  function updateClientEntry(id, key, val) {
    setClientEntries((prev) => prev.map((e) => e.id === id ? { ...e, [key]: val } : e));
  }
  function removeClientEntry(id) {
    setClientEntries((prev) => prev.filter((e) => e.id !== id));
  }
  function addClientEntry() {
    setClientEntries((prev) => [...prev, { id: newId(), segment: "", meaning: "", value: "" }]);
  }
  function clearClientEntries() {
    setClientEntries([]);
    setHl7Text("");
    setHl7Summary(null);
  }
  return {
    ehr,
    setEhr,
    clientEntries,
    setClientEntries,
    hl7Text,
    setHl7Text,
    hl7Summary,
    handleParseHL7,
    updateClientEntry,
    removeClientEntry,
    addClientEntry,
    clearClientEntries
  };
}
