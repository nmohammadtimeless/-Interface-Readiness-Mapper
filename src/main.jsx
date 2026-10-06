import React from "react";
import ReactDOM from "react-dom/client";
import InterfaceReadinessMapper from "./InterfaceReadinessMapper";
import "./index.css";

const STORAGE_PREFIX = "ehr-vendor-mapper:";
window.storage = {
  async get(key) {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (raw === null) throw new Error(`key not found: ${key}`);
    return { key, value: raw, shared: false };
  },
  async set(key, value) {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, value);
      return { key, value, shared: false };
    } catch (err) {
      return null;
    }
  },
  async delete(key) {
    try {
      const existed = localStorage.getItem(STORAGE_PREFIX + key) !== null;
      localStorage.removeItem(STORAGE_PREFIX + key);
      return { key, deleted: existed, shared: false };
    } catch (err) {
      return null;
    }
  },
  async list(prefix = "") {
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const fullKey = localStorage.key(i);
        if (fullKey && fullKey.startsWith(STORAGE_PREFIX)) {
          const bareKey = fullKey.slice(STORAGE_PREFIX.length);
          if (bareKey.startsWith(prefix)) keys.push(bareKey);
        }
      }
      return { keys, prefix, shared: false };
    } catch (err) {
      return { keys: [], prefix, shared: false };
    }
  }
};
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <InterfaceReadinessMapper />
  </React.StrictMode>
);

