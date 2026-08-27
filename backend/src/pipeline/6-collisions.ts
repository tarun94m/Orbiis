import { generateJSON, AI_SYSTEM_PROMPT } from "../lib/ai";
import { NormalizedPaper, NoveltyCollision, StructuredIdea } from "../types";
import { coerceSeverity, validateIndices } from "../lib/validation";

const SCHEMA_HINT = `{ "collisions": [ { "summary": string, "similar": [string], "different": [string], "potentialImplication": string, "severity": "high|medium|low", "supportingPaperIndices": [number] } ] }`;

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

/**
 * Actively hunts for evidence that could invalidate or weaken the claimed
 * contribution — this is not a supporting-evidence summary.
 */
export async function detectCollisions(idea: StructuredIdea, papers: NormalizedPaper[]): Promise<NoveltyCollision[]> {
  if (papers.length === 0) return [];

  const prompt = `You are actively trying to find reasons the following research idea's claimed contribution might NOT be as novel as claimed — potential overlap ("novelty collisions") with the papers below. Phrase every finding as a potential overlap to investigate, never as a confirmed conflict — you are flagging what the researcher should go check, not issuing a verdict. For each one found: summarize it, list concrete similarities, list concrete differences, state the potential implication for the novelty claim (e.g. "your current novelty claim may be too broad"), rate severity, and cite the supporting paper indices. Only report a potential collision where the abstract/metadata actually supports it — do not speculate if the evidence doesn't back it. If you find no genuine potential collisions in the supplied papers, return an empty array.

STRUCTURED IDEA:
${JSON.stringify(idea, null, 2)}

CANDIDATE PAPERS:
${paperSummaryList(papers)}
`;

  const raw = await generateJSON<{ collisions: any[] }>({ system: AI_SYSTEM_PROMPT, prompt, schemaHint: SCHEMA_HINT });

  const collisions: NoveltyCollision[] = (raw.collisions || [])
    .map((c) => {
      const supportingPaperIndices = validateIndices(c.supportingPaperIndices, papers.length);
      if (supportingPaperIndices.length === 0) return null; // collision claims require evidence
      return {
        summary: typeof c.summary === "string" ? c.summary : "",
        similar: Array.isArray(c.similar) ? c.similar.filter((s: any) => typeof s === "string") : [],
        different: Array.isArray(c.different) ? c.different.filter((s: any) => typeof s === "string") : [],
        potentialImplication: typeof c.potentialImplication === "string" ? c.potentialImplication : "",
        severity: coerceSeverity(c.severity),
        supportingPaperIndices,
      } as NoveltyCollision;
    })
    .filter((x): x is NoveltyCollision => x !== null);

  return collisions;
}
