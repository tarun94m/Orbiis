import { generateJSON, AI_SYSTEM_PROMPT } from "../lib/ai";
import {
  ClosestWorkItem,
  NoveltyCollision,
  PotentialContribution,
  RefinementSuggestion,
  ResearchDecision,
  ReviewerObjection,
  StructuredIdea,
} from "../types";

const SCHEMA_HINT = `{
  "refinements": [ { "currentWeakness": string, "whatNeedsToChange": string, "possibleResearchQuestion": string, "whatWouldEstablishContribution": string } ],
  "potentialContribution": { "establishedInLiterature": string, "possibleDifferentiation": string, "butWhatMustBeProven": string, "claimsToAvoid": [string], "refinedContributionStatement": string },
  "biggestIssue": string,
  "whatToInvestigateNext": string,
  "researchDecision": "proceed" | "refine" | "rethink" | "insufficient_evidence",
  "researchDecisionReason": string
}`;

export async function generateRefinement(
  idea: StructuredIdea,
  closestWork: ClosestWorkItem[],
  collisions: NoveltyCollision[],
  objections: ReviewerObjection[]
): Promise<{
  refinements: RefinementSuggestion[];
  potentialContribution: PotentialContribution;
  researchDecision: ResearchDecision;
  researchDecisionReason: string;
  biggestIssue: string;
  whatToInvestigateNext: string;
}> {
  const prompt = `Based on everything found so far, produce the closing synthesis for a research idea stress test.

1. Exactly 3 refinements. Each must be SPECIFIC to this idea, not generic advice like "make the research question more specific." For each: what's currently missing (currentWeakness), which specific dimension needs narrowing (whatNeedsToChange), a more testable version of the question (possibleResearchQuestion), and what evidence/experiment/comparison would actually be needed to establish the contribution (whatWouldEstablishContribution). Do not invent experimental details the input doesn't support — if genuinely unclear, say what's unknown rather than fabricating a method.

2. A "potentialContribution" with three distinct parts:
   - establishedInLiterature: what the retrieved literature already appears to cover.
   - possibleDifferentiation: what appears less represented in the retrieved set. Do NOT phrase this as "combining A and B is novel." Instead: name what's established (A, B individually), name the specific combination/application that's less represented, and be explicit that the combination alone is not sufficient — state what research problem it would need to solve that existing approaches don't.
   - butWhatMustBeProven: what the researcher would concretely need to demonstrate for this to become a real contribution, not just a rewording of the idea.
   - claimsToAvoid: overclaiming phrases to avoid (e.g. "first to..."), specific to this idea.
   - refinedContributionStatement: one bounded, falsifiable sentence — not a rewrite of the original idea, a narrower and more defensible version of it.

3. biggestIssue: ONE OR TWO SENTENCES naming the single most important weakness in this idea, based on the collisions and objections found. Be direct — this is the headline of the whole report.

4. whatToInvestigateNext: ONE concrete, specific action the researcher should take before proceeding (e.g. a specific paper to read closely, a specific comparison to run, a specific term to search). Not generic advice.

5. researchDecision — pick exactly one, based on the evidence gathered, not a vibe:
   - "proceed": no major overlap was found, though novelty is still not established (never claim novelty is established).
   - "refine": the idea has a potentially useful direction but real overlap or contribution ambiguity remains.
   - "rethink": substantial overlap or a fundamental weakness was identified.
   - "insufficient_evidence": the retrieval/evidence quality (few papers, thin abstracts, few collisions or closest-work matches) is not sufficient to make a useful assessment — use this rather than guessing when the evidence is thin.
   researchDecisionReason: one sentence grounding the decision in what was actually found (e.g. "Two literature-backed collisions with high severity were found" or "Only 4 papers were retrieved and none closely matched the method").

Never use the words "novel," "unique contribution," "no collision," or imply novelty has been established or confirmed anywhere in this output. If no collisions were found, that must be phrased as "no direct match was identified in the retrieved set" — not as evidence of novelty.

STRUCTURED IDEA:
${JSON.stringify(idea, null, 2)}

CLOSEST WORK COUNT: ${closestWork.length}
COLLISIONS: ${JSON.stringify(collisions)}
REVIEWER OBJECTIONS: ${JSON.stringify(objections)}
`;

  const raw = await generateJSON<any>({ system: AI_SYSTEM_PROMPT, prompt, schemaHint: SCHEMA_HINT });

  const refinements: RefinementSuggestion[] = (Array.isArray(raw.refinements) ? raw.refinements : [])
    .filter((r: any) => r && r.currentWeakness && r.whatNeedsToChange)
    .slice(0, 3)
    .map((r: any) => ({
      currentWeakness: String(r.currentWeakness),
      whatNeedsToChange: String(r.whatNeedsToChange),
      possibleResearchQuestion: String(r.possibleResearchQuestion || ""),
      whatWouldEstablishContribution: String(r.whatWouldEstablishContribution || ""),
    }));

  const pc = raw.potentialContribution || {};
  const potentialContribution: PotentialContribution = {
    establishedInLiterature: String(pc.establishedInLiterature || "Not enough evidence to characterize."),
    possibleDifferentiation: String(pc.possibleDifferentiation || "Not enough evidence to characterize."),
    butWhatMustBeProven: String(pc.butWhatMustBeProven || "Not enough evidence to characterize."),
    claimsToAvoid: Array.isArray(pc.claimsToAvoid) ? pc.claimsToAvoid.map(String) : [],
    refinedContributionStatement: String(pc.refinedContributionStatement || ""),
  };

  const allowedDecisions: ResearchDecision[] = ["proceed", "refine", "rethink", "insufficient_evidence"];
  const researchDecision: ResearchDecision = allowedDecisions.includes(raw.researchDecision)
    ? raw.researchDecision
    : "insufficient_evidence";

  return {
    refinements,
    potentialContribution,
    researchDecision,
    researchDecisionReason: String(raw.researchDecisionReason || ""),
    biggestIssue: String(raw.biggestIssue || "Not enough evidence was retrieved to identify a specific issue."),
    whatToInvestigateNext: String(raw.whatToInvestigateNext || "Broaden the search terms and re-run the stress test."),
  };
}
