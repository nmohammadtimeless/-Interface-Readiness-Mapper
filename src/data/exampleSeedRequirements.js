
export const EXAMPLE_SEED_REQUIREMENTS = [
  { segment: "MSH-1", label: "Field Separator", level: "required", acceptedValues: "", workflow: "any" },
  { segment: "MSH-2", label: "Encoding Characters", level: "required", acceptedValues: "", workflow: "any" },
  { segment: "MSH-7", label: "Date/Time of Message", level: "required", acceptedValues: "", workflow: "any" },
  { segment: "MSH-9.1", label: "Message Type", level: "required", acceptedValues: "", workflow: "any" },
  { segment: "MSH-10", label: "Message Control ID", level: "required", acceptedValues: "", workflow: "any" },
  { segment: "MSH-12", label: "Version ID", level: "required", acceptedValues: "", workflow: "any" },
  { segment: "PID-3.1", label: "Patient identifier (e.g. MRN)", level: "required", acceptedValues: "", workflow: "any" },
  { segment: "PID-5.1", label: "Patient last name", level: "required", acceptedValues: "", workflow: "adt" },
  { segment: "PID-7.1", label: "Patient date of birth", level: "conditional", acceptedValues: "", workflow: "adt" },
  { segment: "PV1-3.1", label: "Patient location / unit", level: "required", acceptedValues: "", workflow: "adt" },
  { segment: "PV1-3.2", label: "Room", level: "optional", acceptedValues: "", workflow: "adt" },
  { segment: "NK1-2.1", label: "Related party name", level: "optional", acceptedValues: "", workflow: "adt" },
  { segment: "ORC-1.1", label: "Order control code", level: "required", acceptedValues: "NW, CA, DC", workflow: "order" },
  { segment: "ORC-7.4", label: "Order date/time (or ORC-15.1, depending on build)", level: "required", acceptedValues: "", workflow: "order", aliases: "ORC-15.1" },
  { segment: "OBR-4.1", label: "Order / service name (alt: ODS-3.1)", level: "required", acceptedValues: "", workflow: "order", aliases: "ODS-3.1" },
  { segment: "OBXNTE|OBSERVATION_VALUE", label: "Observation value", level: "required", acceptedValues: "", workflow: "order", aliases: "Result Value, Reading" },
  { segment: "OBXNTE|OBSERVATION_UNITS", label: "Observation units", level: "conditional", acceptedValues: "", workflow: "order" },
  { segment: "OBXNTE|NOTES", label: "Free-text notes", level: "optional", acceptedValues: "", workflow: "order" },
  { segment: "RXO-1.2", label: "Order / service name (RX path; alt: OBR-4.1/ODS-3.1)", level: "required", acceptedValues: "", workflow: "order", aliases: "OBR-4.1, ODS-3.1" },
  { segment: "RXE-1.1", label: "Quantity / dosage (RX path)", level: "required", acceptedValues: "", workflow: "order" },
  { segment: "RXR-1.2", label: "Route (RX path)", level: "required", acceptedValues: "", workflow: "order" },
  { segment: "OBX|RESULT_ID", label: "Result identifier", level: "required", acceptedValues: "", workflow: "result" },
  { segment: "OBX|RESULT_VALUE", label: "Result value", level: "required", acceptedValues: "", workflow: "result" },
  { segment: "OBX|VERIFIED_BY", label: "Verified by (user ID)", level: "optional", acceptedValues: "", workflow: "result" }
];

export const FIELD_IDENTIFIER_REFERENCE = [
  { pattern: /^FEED_BASE$/, description: "Base ingredient and its caloric density for the feed preparation" },
  { pattern: /^FEED_BASE_[A-Z]$/, description: "Base ingredient for the feed preparation" },
  { pattern: /^FEED_BASECAL_?[A-Z]$/, description: "Corresponding base ingredient caloric density for the feed preparation" },
  { pattern: /^MILK_TYPE$/, description: "Required composition/properties of the human milk (EHM)/donor human milk (DHM) to be used in the feed preparation (i.e., skimmed, term, fore, hind, kosher, etc.)" },
  { pattern: /^FORTIFIER$/, description: "Ingredient added to a feed preparation to increase its caloric density and the target calorie goal" },
  { pattern: /^FORTIFIER_\d{1,2}$/, description: "Ingredient added to a feed preparation to increase its caloric density" },
  { pattern: /^FORTIFIERCAL_\d{1,2}$/, description: "Corresponding fortifier target calorie goal" },
  { pattern: /^MODULAR$/, description: "Ingredient added to the feed preparation and the specified amount (i.e., 0.01 grams/ml, 10 mls, etc.)" },
  { pattern: /^MODULAR_\d{1,2}$/, description: "Ingredient added to the feed preparation in a specified amount" },
  { pattern: /^MODULARAMT_\d{1,2}$/, description: "Corresponding specified amount for the modular ingredient" },
  { pattern: /^FEED_ROUTE$/, description: "Route by which the feed is to be administered" },
  { pattern: /^FEED_VOLUME$/, description: "Volume to be administered per feed" },
  { pattern: /^FEED_FREQUENCY$/, description: "Frequency at which the feed is to be administered" },
  { pattern: /^CONSENT$/, description: "Approval or Denial of Patient consent for specific feed base categories (i.e., Formula, DHM, Prolacta, etc.)" },
  { pattern: /^LABEL_NOTES$/, description: "Notes to appear on each container prepared against the feed order" },
  { pattern: /^MOD_BASE$/, description: "Ingredient that will not be mixed in during Prepare but will be administered separately to the patient or mixed into a prepared feed prior to administration" },
  { pattern: /^MOD_ROUTE$/, description: "Route by which the separate ingredient will be administered" },
  { pattern: /^MOD_VOLUME$/, description: "Volume of the separate ingredient to be administered" },
  { pattern: /^MOD_FREQUENCY$/, description: "Frequency of the separate ingredient is to be administered" }
];
export function descriptionForFieldIdentifier(name) {
  if (!name) return null;
  const upper = name.trim().toUpperCase();
  const match = FIELD_IDENTIFIER_REFERENCE.find((r) => r.pattern.test(upper));
  return match ? match.description : null;
}
