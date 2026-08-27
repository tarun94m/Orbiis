import { useState } from "react";
import { NormalizedPaper } from "../types";

/**
 * "3 supporting papers ▸" collapsed by default, expands to the actual titles/years
 * with jump links. Used anywhere a claim cites evidence, so the researcher isn't
 * forced to read every citation to get through the report, but can inspect any of
 * them in one click. An empty list renders an explicit "no evidence linked" line
 * rather than nothing, per the rule that absence of evidence must be stated, not hidden.
 */
export function EvidenceDisclosure({
  indices,
  papers,
}: {
  indices: number[];
  papers: NormalizedPaper[];
}) {
  const [open, setOpen] = useState(false);

  if (indices.length === 0) {
    return <p className="evidence-none">No evidence linked for this item.</p>;
  }

  return (
    <div className="evidence-disclosure">
      <button type="button" className="evidence-toggle" onClick={() => setOpen(!open)}>
        {open ? "Hide" : "Show"} {indices.length} supporting paper{indices.length === 1 ? "" : "s"} {open ? "▾" : "▸"}
      </button>
      {open && (
        <ul className="evidence-disclosure-list">
          {indices.map((idx) => {
            const p = papers[idx];
            if (!p) return null;
            return (
              <li key={idx}>
                <a href={`#paper-${idx}`}>{p.title}</a>
                {p.year ? ` (${p.year})` : ""}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
