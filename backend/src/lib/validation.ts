/**
 * The AI references papers by index into the retrieved paper array. These indices
 * must be validated before being trusted anywhere in the app: must be an integer,
 * and must be in range. Invalid indices are dropped, never guessed at.
 */
export function validateIndices(indices: unknown, maxExclusive: number): number[] {
  if (!Array.isArray(indices)) return [];
  const valid = new Set<number>();
  for (const raw of indices) {
    const n = typeof raw === "number" ? raw : Number(raw);
    if (Number.isInteger(n) && n >= 0 && n < maxExclusive) {
      valid.add(n);
    }
  }
  return Array.from(valid).sort((a, b) => a - b);
}

const ALLOWED_SEVERITY = new Set(["high", "medium", "low"]);
export function coerceSeverity(v: unknown, fallback: "high" | "medium" | "low" = "medium") {
  return typeof v === "string" && ALLOWED_SEVERITY.has(v) ? (v as "high" | "medium" | "low") : fallback;
}

const ALLOWED_OVERLAP = new Set(["high", "medium", "low", "none"]);
export function coerceOverlap(v: unknown): "high" | "medium" | "low" | "none" {
  return typeof v === "string" && ALLOWED_OVERLAP.has(v) ? (v as any) : "none";
}

const ALLOWED_CONFIDENCE = new Set(["high", "medium", "low", "unknown"]);
export function coerceConfidence(v: unknown): "high" | "medium" | "low" | "unknown" {
  return typeof v === "string" && ALLOWED_CONFIDENCE.has(v) ? (v as any) : "unknown";
}

const ALLOWED_FIELD_STATUS = new Set(["explicit", "inferred", "unknown"]);

/**
 * Coerces a raw (AI or client-submitted) field object into the strict three-state
 * shape. The invariant `status === "unknown" implies value === null` is enforced
 * here, not trusted from the caller — if there's no usable value, the status is
 * forced to "unknown" regardless of what was claimed, and only "inferred" is ever
 * allowed to carry a reason.
 */
export function coerceIdeaField(raw: unknown): { value: string | null; status: "explicit" | "inferred" | "unknown"; reason: string | null } {
  const r = (raw ?? {}) as any;
  const value = typeof r.value === "string" && r.value.trim() ? r.value.trim() : null;
  let status = typeof r.status === "string" && ALLOWED_FIELD_STATUS.has(r.status) ? r.status : "unknown";
  if (!value) status = "unknown";
  const reason = status === "inferred" && typeof r.reason === "string" && r.reason.trim() ? r.reason.trim() : null;
  return { value: status === "unknown" ? null : value, status, reason };
}
