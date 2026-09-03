// Shared sanitizing/joining for deputy organizing units. A course may belong
// to the deputy itself and/or up to two of its units; the organizingUnit
// display string (printed on the certificate) joins them with the Persian
// "و" conjunction.
export const MAX_COURSE_UNITS = 2;
export const MAX_DEPUTY_UNITS = 30;
export const MAX_UNIT_LENGTH = 60;

/**
 * Normalizes a raw units array: trims, drops empties, dedupes
 * (case-insensitive), caps at `max`. Returns null for non-array input so
 * callers can distinguish "not provided" from "provided but empty".
 */
export function sanitizeUnits(input, { max = MAX_COURSE_UNITS } = {}) {
  if (!Array.isArray(input)) return null;
  const seen = new Set();
  const units = [];
  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const unit = raw.trim().slice(0, MAX_UNIT_LENGTH);
    if (!unit) continue;
    const key = unit.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    units.push(unit);
    if (units.length >= max) break;
  }
  return units;
}

/** "واحد پژوهش و واحد فناوری" — the certificate/print form of the units. */
export function joinUnits(units) {
  return (units || []).filter(Boolean).join(" و ");
}
