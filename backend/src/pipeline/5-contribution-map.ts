import { generateJSON, AI_SYSTEM_PROMPT } from "../lib/ai";
import { ClosestWorkItem, ContributionMapRow, NormalizedPaper, StructuredIdea } from "../types";
import { coerceOverlap, validateIndices } from "../lib/validation";

const SCHEMA_HINT = `{ "rows": [ { "dimension": "Problem|Method|Data|Population|Context|Evaluation|Outcome|Application", "proposedValue": string, "overlapLevel": "high|medium|low|none", "note": string, "supportingPaperIndices": [number] } ], "potentialDifferentiation": string }`;

export async function buildContributionMap(
  idea: StructuredIdea,
  closestWork: ClosestWorkItem[],
  papers: NormalizedPaper[]
): Promise<{ rows: ContributionMapRow[]; potentialDifferentiation: string }> {
  const closestSummary = closestWork
    .map((c) => {
      const p = papers[c.index];
      return `- [${c.index}] "${p?.title}" — overlap: problem=${c.overlap.problem}, method=${c.overlap.method}, data=${c.overlap.data}, context=${c.overlap.context}, evaluation=${c.overlap.evaluation}`;
    })
    .join("\n");

  const prompt = `Build a contribution map comparing the proposed research idea against the retrieved literature, dimension by dimension (Problem, Method, Data, Population, Context, Evaluation, Outcome, Application — include only dimensions where the idea has a stated value). For each dimension: state the proposed value, an overlap level with existing literature (this is your interpretation, not a measurement — be conservative), a short note, and the indices (from the bracketed numbers below) of the specific closest-work papers that back that overlap rating. If you cannot point to a specific paper for a dimension's overlap rating, leave supportingPaperIndices empty rather than guessing — an empty list is a valid, honest answer and will be shown to the user as "no evidence linked," not hidden or treated as an error. Then write one short paragraph identifying potential differentiation. Use cautious language: "potential differentiation", "potentially underrepresented", "possible overlap" — never claim novelty as fact.

STRUCTURED IDEA:
${JSON.stringify(idea, null, 2)}

CLOSEST WORK (indices refer to the retrieved paper list):
${closestSummary || "No closest work identified."}
`;

  const raw = await generateJSON<{ rows: any[]; potentialDifferentiation: string }>({
    system: AI_SYSTEM_PROMPT,
    prompt,
    schemaHint: SCHEMA_HINT,
  });

  const rows: ContributionMapRow[] = (raw.rows || [])
    .filter((r) => r && typeof r.dimension === "string")
    .map((r) => ({
      dimension: r.dimension,
      proposedValue: typeof r.proposedValue === "string" ? r.proposedValue : "unknown",
      overlapLevel: coerceOverlap(r.overlapLevel),
      note: typeof r.note === "string" ? r.note : "",
      supportingPaperIndices: validateIndices(r.supportingPaperIndices, papers.length),
    }));

  return {
    rows,
    potentialDifferentiation:
      typeof raw.potentialDifferentiation === "string"
        ? raw.potentialDifferentiation
        : "Insufficient evidence to characterize potential differentiation.",
  };
}
