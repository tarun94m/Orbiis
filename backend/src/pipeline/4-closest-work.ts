import { generateJSON, AI_SYSTEM_PROMPT } from "../lib/ai";
import { ClosestWorkItem, NormalizedPaper, StructuredIdea } from "../types";
import { coerceOverlap, validateIndices } from "../lib/validation";

const SCHEMA_HINT = `{ "items": [ { "index": number, "relevanceReason": string, "overlap": { "problem": "high|medium|low|none", "method": "high|medium|low|none", "data": "high|medium|low|none", "context": "high|medium|low|none", "evaluation": "high|medium|low|none" }, "difference": string } ] }`;

function paperSummaryList(papers: NormalizedPaper[]): string {
  return papers
    .map(
      (p, i) =>
        `[${i}] "${p.title}" (${p.year ?? "n.d."}) — ${p.venue ?? "unknown venue"}. Abstract: ${
          p.abstract ? p.abstract.slice(0, 500) : "not available"
        }`
    )
    .join("\n\n");
}

export async function selectClosestWork(
  idea: StructuredIdea,
  papers: NormalizedPaper[]
): Promise<ClosestWorkItem[]> {
  if (papers.length === 0) return [];

  const prompt = `Here is a structured research idea and a numbered list of candidate papers retrieved from Semantic Scholar. Select the 5-10 papers most relevant to the proposed contribution. For each, rate overlap with the idea on each dimension using only high/medium/low/none, based only on the abstract/metadata given — do not guess beyond what's provided. These overlap labels will be shown to the user explicitly as AI interpretations, not verified facts, so be conservative and honest.

STRUCTURED IDEA:
${JSON.stringify(idea, null, 2)}

CANDIDATE PAPERS:
${paperSummaryList(papers)}
`;

  const raw = await generateJSON<{ items: any[] }>({ system: AI_SYSTEM_PROMPT, prompt, schemaHint: SCHEMA_HINT });

  const items: ClosestWorkItem[] = (raw.items || [])
    .map((it) => {
      const idx = validateIndices([it.index], papers.length);
      if (idx.length === 0) return null;
      return {
        index: idx[0],
        relevanceReason: typeof it.relevanceReason === "string" ? it.relevanceReason : "Not specified.",
        overlap: {
          problem: coerceOverlap(it.overlap?.problem),
          method: coerceOverlap(it.overlap?.method),
          data: coerceOverlap(it.overlap?.data),
          context: coerceOverlap(it.overlap?.context),
          evaluation: coerceOverlap(it.overlap?.evaluation),
        },
        difference: typeof it.difference === "string" ? it.difference : "Not specified.",
      } as ClosestWorkItem;
    })
    .filter((x): x is ClosestWorkItem => x !== null)
    .slice(0, 10);

  return items;
}
