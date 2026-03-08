/**
 * Serialize/deserialize farm data for Firestore.
 * Converts Date objects to ISO strings for storage and back when loading.
 * Removes undefined values (Firestore rejects them).
 */

const DATE_KEY = "__date";

function replacer(_key: string, value: unknown): unknown {
  if (value === undefined) return undefined; // omit from output
  if (value instanceof Date) {
    return { [DATE_KEY]: value.toISOString() };
  }
  if (typeof value === "number" && (Number.isNaN(value) || !Number.isFinite(value))) {
    return null;
  }
  return value;
}

function reviver(_key: string, value: unknown): unknown {
  if (typeof value === "object" && value !== null && DATE_KEY in value) {
    const str = (value as Record<string, string>)[DATE_KEY];
    if (typeof str === "string") {
      return new Date(str);
    }
  }
  return value;
}

/** Recursively remove undefined (Firestore rejects it) */
function sanitizeForFirestore(obj: unknown): unknown {
  if (obj === undefined) return null;
  if (obj === null) return null;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore);
  }
  if (typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v === undefined) continue;
      out[k] = sanitizeForFirestore(v);
    }
    return out;
  }
  return obj;
}

export function serializeFarmData(data: { nodes: unknown[]; groups: unknown[]; profile: unknown }): Record<string, unknown> {
  const parsed = JSON.parse(JSON.stringify(data, replacer));
  return sanitizeForFirestore(parsed) as Record<string, unknown>;
}

/** Firestore does not support nested arrays. Store as a single JSON string. */
export function toFirestoreDocument(data: { nodes: unknown[]; groups: unknown[]; profile: unknown }): { json: string } {
  const serialized = serializeFarmData(data);
  return { json: JSON.stringify(serialized) };
}

/** Read from Firestore document (handles both json string and legacy object format). */
export function fromFirestoreDocument(doc: Record<string, unknown>): {
  nodes: unknown[];
  groups: unknown[];
  profile: unknown;
} {
  if (typeof doc.json === "string") {
    const parsed = JSON.parse(doc.json);
    return deserializeFarmData(parsed);
  }
  return deserializeFarmData(doc);
}

export function deserializeFarmData(data: Record<string, unknown>): {
  nodes: unknown[];
  groups: unknown[];
  profile: unknown;
} {
  return JSON.parse(JSON.stringify(data), reviver);
}
