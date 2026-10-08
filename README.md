# -Interface-Readiness-Mapper

Browser-based tool that compares a real HL7 v2 message from the EHR against a vendor's interface requirements document and produces a field-by-field readiness report.

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173).

## Build

```bash
npm run build
npm run preview
```

## What it does

- Parses ADT, ORM, RDE and ORU messages, including OBR, ODS, OBX, NTE, RXO, RXE, RXR and RXC segments.
- Reads the vendor requirements document (.docx or pasted text) section by section: ADT per event, CPOE ORM, CPOE RDE and outbound ORU.
- Message rules check for the TMNP Interface Requirements v6.0.0: supported ADT events, required fields per event, order type from OBR-4.1 / ODS-3.1 / RXO-1.2 (Standard, OIT, NPO, CONSENT), feed base, fortifier, modular, consent and grouping rules, RX component rules and ORU result checks.
- Field identifier mapping for OBX/NTE labels with suggestions, N/A and Other options, one-segment or separate-segment calorie format, and the EHM/DHM 20 kcal/oz default.
- Shows the current message and the transformed message side by side, then generates the compatibility report.

## Project structure

```
src/
  components/   ClientRow, LevelBadge, ReadinessGauge, SignalPath, StatusBadge, VendorRow
  constants/    styles.js
  data/         exampleSeedRequirements.js (seed requirements + TMNP field identifier reference)
  hooks/        useClientMessage.js, useCompatibilityReport.js, useVendorRequirements.js
  utils/        aliasMatching.js, hl7.js, id.js
  InterfaceReadinessMapper.jsx
  index.css
  main.jsx
