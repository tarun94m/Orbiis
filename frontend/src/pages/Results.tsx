import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { fetchIdea, runStressTest } from "../api";
import { AnalysisResult, ResearchDecision, StressTestResponse } from "../types";
import { OverlapBadge, SeverityBadge, AiTag, VerifiedTag, NextStepTag } from "../components/Badge";
import { PaperCard } from "../components/PaperCard";
import { EvidenceDisclosure } from "../components/EvidenceDisclosure";

type EvidenceFilter = "all" | "closest" | "collision" | "supporting";

/** Short label for the top-of-page summary status pill. */
const DECISION_SUMMARY_LABEL: Record<ResearchDecision, string> = {
  proceed: "Promising direction",
  refine: "Needs refinement",
  rethink: "Significant overlap",
  insufficient_evidence: "Insufficient evidence",
};

/** Fuller, decision-oriented label for the closing Research Decision section. */
const DECISION_FULL_LABEL: Record<ResearchDecision, string> = {
  proceed: "PROCEED",
  refine: "REFINE",
  rethink: "RETHINK",
  insufficient_evidence: "INSUFFICIENT EVIDENCE",
};

const STATUS_CLASS: Record<ResearchDecision, string> = {
  proceed: "status-good",
  refine: "status-warn",
  rethink: "status-bad",
  insufficient_evidence: "status-neutral",
};

const SEVERITY_RANK: Record<string, number> = { high: 3, medium: 2, low: 1 };

export default function Results() {
  const { id } = useParams();
  const location = useLocation() as { state?: { response?: StressTestResponse } };
  const navigate = useNavigate();

  const [data, setData] = useState<StressTestResponse | null>(location.state?.response ?? null);
  const [rawInput, setRawInput] = useState<string>("");
  const [loading, setLoading] = useState(!location.state?.response);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<EvidenceFilter>("all");
  const [refineOpen, setRefineOpen] = useState(false);
  const [refineText, setRefineText] = useState("");
  const [refining, setRefining] = useState(false);

  useEffect(() => {
    if (data || !id) return;
    setLoading(true);
    fetchIdea(id)
      .then((idea) => {
        if (!idea.result) {
          setError("No analysis found for this idea.");
          return;
        }
        setData({ sessionId: idea.sessionId, ideaId: idea.ideaId, version: idea.version, result: idea.result });
        setRawInput(idea.rawInput);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (data) setRefineText(rawInput);
  }, [rawInput]);

  const result = data?.result;

  // Strongest evidence against the idea, for the top summary: prefer the highest-severity
  // collisions (that's specifically evidence of overlap risk), up to 2; fall back to the
  // top closest-work match if no collisions were found.
  const strongestEvidence = useMemo(() => {
    if (!result) return [];
    if (result.collisions.length > 0) {
      const sorted = [...result.collisions].sort(
        (a, b) => (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0)
      );
      const items: { paper: (typeof result.retrievedPapers)[number]; index: number; reason: string }[] = [];
      const seen = new Set<number>();
      for (const col of sorted) {
        const idx = col.supportingPaperIndices[0];
        if (idx === undefined || seen.has(idx)) continue;
        const paper = result.retrievedPapers[idx];
        if (!paper) continue;
        items.push({ paper, index: idx, reason: col.summary });
        seen.add(idx);
        if (items.length === 2) break;
      }
      if (items.length > 0) return items;
    }
    if (result.closestWork.length > 0) {
      const top = result.closestWork[0];
      const paper = result.retrievedPapers[top.index];
      if (paper) return [{ paper, index: top.index, reason: top.relevanceReason }];
    }
    return [];
  }, [result]);

  // The strongest potentially-differentiated dimension, if the contribution map found one.
  const differentiatedDimension = useMemo(() => {
    if (!result) return null;
    return result.contributionMap.find((r) => r.overlapLevel === "none" || r.overlapLevel === "low") ?? null;
  }, [result]);

  const closestPaperIndices = useMemo(() => new Set(result?.closestWork.map((c) => c.index) ?? []), [result]);
  const collisionPaperIndices = useMemo(
    () => new Set(result?.collisions.flatMap((c) => c.supportingPaperIndices) ?? []),
    [result]
  );
  const supportingPaperIndices = useMemo(
    () => new Set(result?.reviewerObjections.flatMap((o) => o.supportingPaperIndices) ?? []),
    [result]
  );

  async function handleRefine() {
    if (!data || refineText.trim().length < 10) return;
    setRefining(true);
    setError(null);
    try {
      const res = await runStressTest({
        rawInput: refineText,
        sessionId: data.sessionId,
        previousVersion: data.version,
      });
      navigate(`/idea/${res.ideaId}`, { state: { response: res } });
      setData(res);
      setRefineOpen(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRefining(false);
    }
  }

  if (loading) return <main className="results loading-state">Loading assessment…</main>;
  if (error) return <main className="results loading-state error">{error}</main>;
  if (!result) return null;

  const s = result.structuredIdea;

  const filteredPapers = result.retrievedPapers
    .map((p, i) => ({ p, i }))
    .filter(({ i }) => {
      if (filter === "all") return true;
      if (filter === "closest") return closestPaperIndices.has(i);
      if (filter === "collision") return collisionPaperIndices.has(i);
      if (filter === "supporting") return supportingPaperIndices.has(i);
      return true;
    });

  return (
    <main className="results">
      <div className="results-actions">
        <button type="button" className="export-btn" onClick={() => window.print()}>
          Export / print report
        </button>
      </div>

      <section className="results-header">
        <p className="eyebrow">Research idea stress test · v{data?.version}</p>
        <blockquote className="idea-quote">{rawInput || s.researchQuestion.value || "Your research idea"}</blockquote>
      </section>

      <section className="stress-summary" id="stress-summary">
        <p className="stress-summary-title">Research idea stress test</p>
        <div className="stress-summary-status">
          <span className={`status-pill ${STATUS_CLASS[result.researchDecision]}`}>
            {DECISION_SUMMARY_LABEL[result.researchDecision]}
          </span>
        </div>
        <div className="stress-summary-grid">
          <div className="stress-summary-block">
            <p className="stress-summary-block-label">Biggest issue</p>
            <p>{result.biggestIssue}</p>
          </div>

          <div className="stress-summary-block">
            <p className="stress-summary-block-label">Strongest evidence against the idea</p>
            {strongestEvidence.length > 0 ? (
              strongestEvidence.map((item) => (
                <div className="stress-summary-overlap-item" key={item.index}>
                  <p className="stress-summary-overlap-paper">{item.paper.title}</p>
                  <p className="stress-summary-overlap-meta">
                    {item.paper.year ?? "n.d."} · <a href={`#paper-${item.index}`}>view evidence ↓</a>
                  </p>
                  <p>{item.reason}</p>
                </div>
              ))
            ) : (
              <>
                <p>No direct match was identified in the retrieved set.</p>
                <p className="muted">This does not establish novelty. Similar work may exist outside the retrieved set.</p>
              </>
            )}
          </div>

          <div className="stress-summary-block">
            <p className="stress-summary-block-label">What may still be different</p>
            <p>
              <AiTag>AI interpretation — not a novelty determination</AiTag>
            </p>
            {differentiatedDimension && (
              <p className="stress-summary-overlap-paper">
                {differentiatedDimension.dimension}: {differentiatedDimension.proposedValue}
              </p>
            )}
            <p>{result.potentialContribution.possibleDifferentiation}</p>
          </div>

          <div className="stress-summary-block next-step">
            <p className="stress-summary-block-label">What to investigate next</p>
            <p>
              <NextStepTag /> {result.whatToInvestigateNext}
            </p>
          </div>
        </div>

        <a href="#section-01" className="stress-summary-jump">
          View detailed evidence ↓
        </a>
      </section>

      {/* 1. Proposed contribution */}
      <Section id="section-01" number="01" title="Your proposed contribution">
        <div className="fact-grid">
          <Fact label="Research question" field={s.researchQuestion} />
          <Fact label="Domain" field={s.domain} />
          <Fact label="Problem" field={s.problem} />
          <Fact label="Method" field={s.method} />
          <Fact label="Population" field={s.population} />
          <Fact label="Data" field={s.data} />
          <Fact label="Context" field={s.context} />
          <Fact label="Outcome" field={s.outcome} />
        </div>
        {s.claimedContribution && (
          <p className="claimed-contribution">
            <span className="label-ai">claimed contribution</span> {s.claimedContribution}
          </p>
        )}
        {s.contributionDimensions.length > 0 && (
          <div className="dim-chips">
            {s.contributionDimensions.map((d, i) => (
              <span className="dim-chip" key={i}>
                {d.dimension}: {d.value} <em>({d.importance})</em>
              </span>
            ))}
          </div>
        )}
      </Section>

      {/* 2. Contribution map */}
      <Section number="02" title="Contribution map" subtitle="Your proposed contribution vs. existing literature, dimension by dimension.">
        <p className="evidence-disclaimer">
          <AiTag>AI interpretation</AiTag> Every overlap rating below is the model's reading of the retrieved
          abstracts, not a verified fact. Treat it as a starting point for your own judgment, not a conclusion.
        </p>
        <table className="contribution-table">
          <thead>
            <tr>
              <th>Dimension</th>
              <th>Proposed value</th>
              <th>Overlap (AI interpretation)</th>
              <th>Note</th>
              <th>Evidence</th>
            </tr>
          </thead>
          <tbody>
            {result.contributionMap.map((row, i) => (
              <tr key={i}>
                <td>{row.dimension}</td>
                <td>{row.proposedValue}</td>
                <td>
                  <OverlapBadge level={row.overlapLevel} />
                </td>
                <td className="muted">{row.note}</td>
                <td>
                  <EvidenceDisclosure indices={row.supportingPaperIndices} papers={result.retrievedPapers} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="callout">
          <AiTag>AI interpretation</AiTag> {result.potentialDifferentiation}
        </p>
      </Section>

      {/* 3. Closest existing work */}
      <Section number="03" title="Closest existing work" subtitle={`${result.closestWork.length} papers identified as most relevant.`}>
        <p className="evidence-disclaimer">
          <span className="verified-tag">verified</span> title, authors, year, venue, DOI, abstract, and citation
          count come directly from Semantic Scholar. <AiTag>AI interpretation</AiTag> relevance and difference
          notes are the model's reading, not verified fact.
        </p>
        <div className="paper-grid">
          {result.closestWork.map((c, i) => {
            const paper = result.retrievedPapers[c.index];
            if (!paper) return null;
            return (
              <PaperCard
                key={i}
                id={`paper-${c.index}`}
                paper={paper}
                badges={["Closest match"]}
                reason={c.relevanceReason}
                difference={c.difference}
              />
            );
          })}
          {result.closestWork.length === 0 && <p className="muted">No sufficiently close work was identified in the retrieved set.</p>}
        </div>
      </Section>

      {/* 4. Potential overlap to investigate */}
      <Section
        number="04"
        title="Potential overlap to investigate"
        subtitle="Evidence that could weaken or narrow your novelty claim — not just supporting evidence."
      >
        {result.collisions.length === 0 && (
          <div className="no-match-block">
            <p className="muted">No direct match was identified in the retrieved set.</p>
            <p className="muted">This does not establish novelty. Similar work may exist outside the retrieved set.</p>
          </div>
        )}
        <div className="collision-list">
          {result.collisions.map((col, i) => (
            <div className="collision-card" key={i}>
              <div className="collision-head">
                <SeverityBadge level={col.severity} />
                <AiTag>potential overlap</AiTag>
              </div>
              <p className="collision-summary">{col.summary}</p>
              <div className="sim-diff">
                <div>
                  <p className="sim-diff-label">Similar</p>
                  <ul>
                    {col.similar.map((s2, j) => (
                      <li key={j}>{s2}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="sim-diff-label">Different</p>
                  <ul>
                    {col.different.map((d2, j) => (
                      <li key={j}>{d2}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <p className="collision-implication">
                <span className="label-ai">potential implication</span> {col.potentialImplication}
              </p>
              <EvidenceDisclosure indices={col.supportingPaperIndices} papers={result.retrievedPapers} />
            </div>
          ))}
        </div>
      </Section>

      {/* 5. Reviewer attack — conceptual centerpiece */}
      <Section
        number="05"
        title="Try to break this contribution"
        subtitle="Reviewer-style objections based on the retrieved literature and AI reasoning."
      >
        <div className="objection-list">
          {result.reviewerObjections.map((o, i) => (
            <div className="objection-card" key={i}>
              <div className="objection-head">
                <SeverityBadge level={o.severity} label="reviewer concern" />
                {o.supportStatus === "supported" ? (
                  <VerifiedTag>literature-backed</VerifiedTag>
                ) : (
                  <AiTag>AI reasoning only</AiTag>
                )}
              </div>
              <p className="diff-label">Objection</p>
              <p className="objection-text">{o.objection}</p>
              <p className="diff-label">Why it matters</p>
              <p className="objection-reason muted">{o.reason}</p>
              {o.supportStatus !== "supported" && (
                <p className="objection-reason muted">
                  No directly supporting paper was identified. This is an AI-generated reviewer concern, not a
                  literature finding.
                </p>
              )}
              <p className="diff-label">Evidence</p>
              <EvidenceDisclosure indices={o.supportingPaperIndices} papers={result.retrievedPapers} />
            </div>
          ))}
        </div>
      </Section>

      {/* 6. Potential differentiation — established vs. possible vs. what must still be proven */}
      <Section number="06" title="Potential differentiation" subtitle="This is not a novelty guarantee — it reflects only the sources searched.">
        <div className="differentiation-block">
          <p className="diff-label">What appears established</p>
          <p>{result.potentialContribution.establishedInLiterature}</p>
        </div>
        <div className="differentiation-block">
          <p className="diff-label">Possible differentiation</p>
          <p>{result.potentialContribution.possibleDifferentiation}</p>
        </div>
        <div className="differentiation-block emphasis">
          <p className="diff-label">But what must be proven</p>
          <p>{result.potentialContribution.butWhatMustBeProven}</p>
        </div>
      </Section>

      {/* 7. Strengthen the idea */}
      <Section number="07" title="Strengthen the research idea">
        <div className="refinement-list">
          {result.refinements.map((r, i) => (
            <div className="refinement-card" key={i}>
              <p className="refinement-weakness">
                <span className="label-ai">current weakness</span> {r.currentWeakness}
              </p>
              <p className="refinement-suggestion">
                <span className="label-ai">what needs to change</span> {r.whatNeedsToChange}
              </p>
              <p className="refinement-suggestion">
                <NextStepTag>possible research question</NextStepTag> {r.possibleResearchQuestion}
              </p>
              <p className="refinement-why muted">
                <span className="label-ai">what would establish the contribution</span>{" "}
                {r.whatWouldEstablishContribution}
              </p>
            </div>
          ))}
        </div>

        <div className="potential-contribution-box">
          <p className="pcb-title">AI-generated refinement based on retrieved evidence</p>
          <p className="pcb-statement">"{result.potentialContribution.refinedContributionStatement}"</p>
          {result.potentialContribution.claimsToAvoid.length > 0 && (
            <div className="claims-avoid">
              <p className="sim-diff-label">Avoid claiming</p>
              <ul>
                {result.potentialContribution.claimsToAvoid.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <button type="button" className="refine-toggle" onClick={() => setRefineOpen(!refineOpen)}>
          {refineOpen ? "Cancel" : "Refine this idea →"}
        </button>
        {refineOpen && (
          <div className="refine-panel">
            <textarea rows={5} value={refineText} onChange={(e) => setRefineText(e.target.value)} />
            {error && <p className="form-error">{error}</p>}
            <button type="button" onClick={handleRefine} disabled={refining}>
              {refining ? "Running stress test…" : "Re-run stress test"}
            </button>
          </div>
        )}
      </Section>

      {/* 8. Research decision */}
      <Section number="08" title="Research decision">
        <div className={`decision-box decision-${result.researchDecision}`}>
          <p className="decision-label">{DECISION_FULL_LABEL[result.researchDecision]}</p>
          <p className="decision-reason">{result.researchDecisionReason}</p>
          <p className="decision-disclaimer">
            ORBIIS assessment based only on the retrieved literature and AI interpretation. It is not a novelty
            determination.
          </p>
        </div>
      </Section>

      {/* 9. Evidence */}
      <Section number="09" title="Evidence" subtitle={`${result.retrievedPapers.length} papers retrieved from Semantic Scholar.`}>
        <div className="evidence-filters">
          {(["all", "closest", "collision", "supporting"] as EvidenceFilter[]).map((f) => (
            <button key={f} className={filter === f ? "filter-active" : ""} onClick={() => setFilter(f)}>
              {f === "all" ? "All" : f === "closest" ? "Closest" : f === "collision" ? "Collision" : "Supporting evidence"}
            </button>
          ))}
        </div>
        <div className="paper-grid">
          {filteredPapers.map(({ p, i }) => {
            const badges: string[] = [];
            if (closestPaperIndices.has(i)) badges.push("Closest match");
            if (collisionPaperIndices.has(i)) badges.push("Collision evidence");
            if (supportingPaperIndices.has(i)) badges.push("Supporting evidence");
            return <PaperCard key={p.paperId} id={`paper-${i}`} paper={p} badges={badges} />;
          })}
        </div>
      </Section>
    </main>
  );
}

function Section({
  id,
  number,
  title,
  subtitle,
  children,
}: {
  id?: string;
  number: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="report-section" id={id}>
      <div className="report-section-head">
        <span className="section-number">{number}</span>
        <div>
          <h2>{title}</h2>
          {subtitle && <p className="section-subtitle">{subtitle}</p>}
        </div>
      </div>
      <div className="report-section-body">{children}</div>
    </section>
  );
}

function Fact({ label, field }: { label: string; field: { value: string | null; status: string; reason: string | null } }) {
  return (
    <div className="fact">
      <p className="fact-label">{label}</p>
      {!field.value ? (
        <p className="fact-value unknown">Not specified</p>
      ) : (
        <>
          <p className="fact-value">{field.value}</p>
          {field.status === "inferred" && (
            <details className="fact-inferred">
              <summary>Inferred</summary>
              {field.reason && <p className="fact-reason">{field.reason}</p>}
            </details>
          )}
        </>
      )}
    </div>
  );
}
