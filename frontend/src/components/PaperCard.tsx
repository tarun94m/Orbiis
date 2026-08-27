import { useState } from "react";
import { NormalizedPaper } from "../types";
import { VerifiedTag } from "./Badge";

export function PaperCard({
  paper,
  badges = [],
  reason,
  difference,
  id,
}: {
  paper: NormalizedPaper;
  badges?: string[];
  reason?: string;
  difference?: string;
  id?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <article className="paper-card" id={id}>
      <div className="paper-card-top">
        <VerifiedTag />
        {badges.map((b) => (
          <span key={b} className={`badge chip-${b.toLowerCase().replace(/\s+/g, "-")}`}>
            {b}
          </span>
        ))}
      </div>
      <h4 className="paper-title">
        {paper.url ? (
          <a href={paper.url} target="_blank" rel="noreferrer">
            {paper.title}
          </a>
        ) : (
          paper.title
        )}
      </h4>
      <p className="paper-meta">
        {paper.authors.slice(0, 4).join(", ")}
        {paper.authors.length > 4 ? " et al." : ""}
        {paper.year ? ` · ${paper.year}` : ""}
        {paper.venue ? ` · ${paper.venue}` : ""}
        {typeof paper.citationCount === "number" ? ` · ${paper.citationCount} citations` : ""}
      </p>
      {paper.doi && <p className="paper-doi">DOI: {paper.doi}</p>}

      {reason && (
        <p className="paper-reason">
          <span className="label-ai">why it's relevant · AI interpretation</span> {reason}
        </p>
      )}
      {difference && (
        <p className="paper-difference">
          <span className="label-ai">what appears different · AI interpretation</span> {difference}
        </p>
      )}

      {paper.abstract && (
        <div className="paper-abstract">
          <button type="button" className="link-btn" onClick={() => setOpen(!open)}>
            {open ? "Hide abstract" : "View abstract"}
          </button>
          {open && <p>{paper.abstract}</p>}
        </div>
      )}
    </article>
  );
}
