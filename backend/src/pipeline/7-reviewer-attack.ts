import { generateJSON, AI_SYSTEM_PROMPT } from "../lib/ai";
import { ClosestWorkItem, NormalizedPaper, NoveltyCollision, ReviewerObjection, StructuredIdea } from "../types";
import { coerceSeverity, validateIndices } from "../lib/validation";

const SCHEMA_HINT = `{ "objections": [ { "objection": string, "severity": "high|medium|low", "reason": string, "supportingPaperIndices": [number] } ] }`;

export async function generateReviewerAttack(
  idea: StructuredIdea,
  papers: NormalizedPaper[],
  closestWork: ClosestWorkItem[],
  collisions: NoveltyCollision[]
): Promise<ReviewerObjection[]> {
  const context = `CLOSEST WORK (indices refer to the paper list): ${JSON.stringify(
    closestWork.map((c) => ({ index: c.index, relevanceReason: c.relevanceReason, overlap: c.overlap }))
  )}\n\nCOLLISIONS FOUND: ${JSON.stringify(collisions)}`;

  const prompt = `Act as a skeptical peer reviewer or PhD supervisor trying to break this research idea. Generate 3-7 objections a reviewer might raise, grounded as much as possible in the evidence below. Each objection needs a severity and a reason. Cite supporting paper indices where the objection is genuinely evidence-backed. If an objection is reasonable but you cannot point to a specific supporting paper, still include it, but leave supportingPaperIndices empty — it will be labeled as AI reasoning only, not literature-backed.

STRUCTURED IDEA:
${JSON.stringify(idea, null, 2)}

${context}
`;

  const raw = await generateJSON<{ objections: any[] }>({ system: AI_SYSTEM_PROMPT, prompt, schemaHint: SCHEMA_HINT });

  const objections: ReviewerObjection[] = (raw.objections || [])
    .filter((o) => o && typeof o.objection === "string")
    .map((o) => {
      const supportingPaperIndices = validateIndices(o.supportingPaperIndices, papers.length);
      return {
        objection: o.objection,
        severity: coerceSeverity(o.severity),
        reason: typeof o.reason === "string" ? o.reason : "",
        supportingPaperIndices,
        supportStatus: supportingPaperIndices.length > 0 ? "supported" : "ai-reasoning-only",
      } as ReviewerObjection;
    })
    .slice(0, 7);

  return objections;
}
