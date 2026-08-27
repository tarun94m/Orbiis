import { useState } from "react";
import { IdeaField, StructuredIdea } from "../types";
import { VerifiedTag, AiTag } from "./Badge";

const FIELD_LABELS: Record<string, string> = {
  researchQuestion: "Research question",
  domain: "Domain",
  problem: "Problem",
  method: "Method",
  population: "Population",
  data: "Data",
  context: "Context",
  outcome: "Outcome",
};

const FIELD_KEYS = Object.keys(FIELD_LABELS);

// These fields tend to hold a full sentence rather than a short phrase — give them
// the full row width instead of squeezing them into the two-column grid.
const WIDE_FIELDS = new Set(["researchQuestion", "problem"]);

function autoResize(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

export function ConfirmIdea({
  original,
  onConfirm,
  onBack,
  submitting,
}: {
  original: StructuredIdea;
  onConfirm: (edited: StructuredIdea) => void;
  onBack: () => void;
  submitting: boolean;
}) {
  const [fields, setFields] = useState<Record<string, IdeaField>>(() => {
    const init: Record<string, IdeaField> = {};
    for (const k of FIELD_KEYS) init[k] = (original as any)[k];
    return init;
  });

  function handleChange(key: string, text: string) {
    const trimmed = text.trim();
    const originalField = (original as any)[key] as IdeaField;
    let next: IdeaField;
    if (!trimmed) {
      next = { value: null, status: "unknown", reason: null };
    } else if (trimmed === (originalField.value || "").trim()) {
      // Unedited — preserve ORBIIS's original status/reason rather than claiming the researcher stated it.
      next = originalField;
    } else {
      next = { value: trimmed, status: "explicit", reason: null };
    }
    setFields((f) => ({ ...f, [key]: next }));
  }

  function handleSubmit() {
    const edited: StructuredIdea = { ...original, ...fields } as StructuredIdea;
    onConfirm(edited);
  }

  return (
    <section className="confirm-panel">
      <p className="confirm-title">Here's what ORBIIS understood</p>
      <p className="confirm-subtitle">
        Review before the analysis runs — this is what the rest of the report will be based on. Anything ORBIIS
        inferred, rather than you stating it directly, is marked. Correct anything that's wrong, or leave a field
        blank if it's genuinely not part of the idea yet.
      </p>

      <div className="confirm-fields">
        {FIELD_KEYS.map((key) => {
          const field = fields[key];
          return (
            <div className={`confirm-field${WIDE_FIELDS.has(key) ? " confirm-field-wide" : ""}`} key={key}>
              <label htmlFor={`confirm-${key}`}>{FIELD_LABELS[key]}</label>
              <textarea
                id={`confirm-${key}`}
                rows={1}
                value={field.value ?? ""}
                placeholder="Not specified"
                ref={autoResize}
                onChange={(e) => {
                  handleChange(key, e.target.value);
                  autoResize(e.target);
                }}
                disabled={submitting}
              />
              <div className="confirm-field-meta">
                {!field.value ? null : field.status === "inferred" ? (
                  <>
                    <AiTag>inferred by ORBIIS</AiTag>
                    {field.reason && <span className="confirm-reason">{field.reason}</span>}
                  </>
                ) : (
                  <VerifiedTag>stated by you</VerifiedTag>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {original.claimedContribution && (
        <p className="confirm-claimed">
          <span className="label-ai">claimed contribution ORBIIS read from your idea</span> {original.claimedContribution}
        </p>
      )}

      <div className="confirm-actions">
        <button type="button" className="confirm-back" onClick={onBack} disabled={submitting}>
          ← Back
        </button>
        <button type="button" className="confirm-run" onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Running stress test…" : "Looks good — run the stress test"}
        </button>
      </div>
    </section>
  );
}
