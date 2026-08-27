export function OverlapBadge({ level }: { level: string }) {
  return <span className={`badge overlap-${level}`}>{level}</span>;
}

export function SeverityBadge({ level, label = "severity" }: { level: string; label?: string }) {
  return <span className={`badge severity-${level}`}>{level} {label}</span>;
}

export function AiTag({ children = "AI interpretation" }: { children?: string }) {
  return <span className="ai-tag">{children}</span>;
}

export function VerifiedTag({ children = "verified · Semantic Scholar" }: { children?: string }) {
  return <span className="verified-tag">{children}</span>;
}

/** Level 3 of the evidence hierarchy: recommendations derived from the above, not evidence itself. */
export function NextStepTag({ children = "suggested next step" }: { children?: string }) {
  return <span className="next-step-tag">{children}</span>;
}
