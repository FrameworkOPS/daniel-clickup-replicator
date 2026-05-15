// Pull the client name out of a form-vendor webhook payload.
// Each vendor sends a different shape — pick the parser via FORM_VENDOR.

export function extractClientName(vendor, payload, fieldKey) {
  switch ((vendor || "generic").toLowerCase()) {
    case "typeform":
      return fromTypeform(payload, fieldKey);
    case "jotform":
      return fromJotform(payload, fieldKey);
    case "tally":
      return fromTally(payload, fieldKey);
    default:
      return payload?.[fieldKey] ?? null;
  }
}

// Typeform: payload.form_response.answers[] — match by field.ref === fieldKey
function fromTypeform(payload, fieldKey) {
  const answers = payload?.form_response?.answers ?? [];
  const hit = answers.find((a) => a?.field?.ref === fieldKey);
  if (!hit) return null;
  return hit.text ?? hit.email ?? hit.choice?.label ?? null;
}

// Jotform: payload.rawRequest is a JSON string; keys look like "q3_clientName".
// Match by either exact key or by label suffix.
function fromJotform(payload, fieldKey) {
  let raw = payload?.rawRequest ?? payload;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (raw[fieldKey]) return String(raw[fieldKey]);
  const match = Object.entries(raw).find(([k]) => k.endsWith(`_${fieldKey}`) || k === fieldKey);
  return match ? String(match[1]) : null;
}

// Tally: payload.data.fields[] — match by label === fieldKey (or key).
function fromTally(payload, fieldKey) {
  const fields = payload?.data?.fields ?? [];
  const hit = fields.find((f) => f.label === fieldKey || f.key === fieldKey);
  return hit?.value ?? null;
}
