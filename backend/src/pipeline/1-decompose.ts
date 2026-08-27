import { generateJSON, AI_SYSTEM_PROMPT } from "../lib/ai";
import { StructuredIdea } from "../types";
import { coerceConfidence, coerceIdeaField } from "../lib/validation";

const FIELD_SCHEMA = `{ "value": string | null, "status": "explicit" | "inferred" | "unknown", "reason": string | null }`;

const SCHEMA_HINT = `{
  "researchQuestion": ${FIELD_SCHEMA},
  "domain": ${FIELD_SCHEMA},
  "problem": ${FIELD_SCHEMA},
  "method": ${FIELD_SCHEMA},
  "population": ${FIELD_SCHEMA},
  "data": ${FIELD_SCHEMA},
  "context": ${FIELD_SCHEMA},
  "outcome": ${FIELD_SCHEMA},
  "claimedContribution": string | null,
  "contributionDimensions": [ { "dimension": "methodological|theoretical|empirical|dataset|contextual|population|evaluation|application|integration|replication", "value": string, "importance": "high|medium|low|unknown" } ],
  "searchQueries": [string, string, string]
}`;

const DECOMPOSE_PROMPT_RULES = `Reconstruct the structure of this research idea. For EVERY one of the 8 fields below, you must assign exactly one status:

- "explicit": the researcher directly stated this. reason must be null.
- "inferred": not directly stated, but conservatively and strongly implied by the specific wording used. reason MUST explain which part of the wording justifies the inference, in one short sentence.
- "unknown": genuinely cannot be determined from the input. value MUST be null.

Do not default to filling in plausible-sounding details "because that's common in this field." A missing population, dataset, or method is a valid and expected outcome for an informal idea — leave it unknown rather than guessing what a typical study in this area would use.

Field-specific rules — follow these exactly:

- researchQuestion: only mark "explicit" if the input is phrased as a question or a direct claim of what will be tested. If the input is a topic/goal statement rather than a question, you may phrase the underlying question as "inferred" — but do not invent variables, populations, or causal relationships the wording doesn't support.
- domain: may be inferred from terminology when there is strong evidence. Do not over-specialize into a narrower sub-field than the wording supports.
- problem: defined as the specific difficulty, limitation, inefficiency, uncertainty, risk, unresolved issue, missing capability, or practical/research challenge that the researcher explicitly describes as something they want to investigate or address. Recognize this even when it's phrased indirectly in normal academic language — e.g. a "because X currently lacks Y" clause, a "current approaches rely on Z, which leads to W" clause, or any sentence naming what's currently wrong, missing, or costly. If the input contains such a clause, mark problem "explicit" and quote/paraphrase that clause as the value — do not mark it unknown just because it isn't in a standalone "the problem is..." sentence. Distinguish three cases:
  (a) EXPLICIT — the researcher actually describes a difficulty/limitation/gap, even if embedded in a longer sentence. E.g. "product designers currently make early-stage decisions without access to manufacturing information" → explicit, value = that clause.
  (b) INFERRED — the researcher states only an objective or outcome that strongly implies a challenge, with no difficulty actually described. E.g. "improve design decisions under uncertainty" → inferred, value = "Uncertainty in early-stage design decision-making", reason must cite the wording that implies it.
  (c) UNKNOWN — the input is a bare topic/goal with neither a stated difficulty nor wording strong enough to imply one. E.g. "data-driven approaches for product realization" → unknown, value null.
  Do not turn every research objective into an explicit problem, but do not miss a genuinely stated difficulty just because it's embedded in a subordinate clause rather than its own sentence.
- method: BE ESPECIALLY CONSERVATIVE. Never infer "experimental study," "survey," "machine learning model," "case study," etc. merely because that method would be common in this field. Only mark method as explicit/inferred when the wording itself names or strongly implies an approach (e.g. "using computer vision" → method inferred as "computer vision-based approach"; "using a randomized controlled trial" → explicit). If the wording only names a topic or goal with no approach mentioned, method is unknown.
- population: only infer when the input actually names the subjects/users/organizations studied. Never manufacture a population (e.g. "manufacturing workers," "patients," "PhD students") that isn't named or strongly implied.
- data: only identify when data is mentioned or strongly implied by name (e.g. "sensor data," "chest X-rays"). A method like "using computer vision" does NOT by itself imply a specific dataset — leave data unknown unless the data source itself is named.
- context: can often be inferred from explicit environmental/domain wording (e.g. "early-stage product prototyping in automotive manufacturing" → context explicit/inferred as that full phrase).
- outcome: infer only what the idea actually seeks to improve, explain, predict, or measure, using the researcher's own terms. Do not invent specific metrics (accuracy, F1 score, productivity, etc.) the wording doesn't mention.

Also generate 2-5 short, literature-search-ready queries (not full sentences) that would find the closest existing work, based only on what's actually known from the fields above.`;

export async function decomposeIdea(rawInput: string, rawAbstract?: string | null): Promise<StructuredIdea> {
  const prompt = `${DECOMPOSE_PROMPT_RULES}

RESEARCH IDEA (raw input):
"""${rawInput}"""

${rawAbstract ? `ADDITIONAL RESEARCH QUESTION / ABSTRACT PROVIDED BY THE USER:\n"""${rawAbstract}"""` : ""}
`;

  const raw = await generateJSON<any>({ system: AI_SYSTEM_PROMPT, prompt, schemaHint: SCHEMA_HINT });
  return sanitizeStructuredIdea(raw);
}

/**
 * Coerces a raw object — whether straight from the AI or submitted by the client
 * after the researcher edited the "here's what ORBIIS understood" screen — into a
 * safe StructuredIdea. Used for both paths so client edits get exactly the same
 * invariant enforcement (no status/value mismatch) as AI output.
 */
export function sanitizeStructuredIdea(raw: any): StructuredIdea {
  raw = raw || {};

  const structured: StructuredIdea = {
    researchQuestion: coerceIdeaField(raw.researchQuestion),
    domain: coerceIdeaField(raw.domain),
    problem: coerceIdeaField(raw.problem),
    method: coerceIdeaField(raw.method),
    population: coerceIdeaField(raw.population),
    data: coerceIdeaField(raw.data),
    context: coerceIdeaField(raw.context),
    outcome: coerceIdeaField(raw.outcome),
    claimedContribution:
      typeof raw.claimedContribution === "string" && raw.claimedContribution.trim() ? raw.claimedContribution.trim() : null,
    contributionDimensions: Array.isArray(raw.contributionDimensions)
      ? raw.contributionDimensions
          .filter((d: any) => d && typeof d.dimension === "string" && typeof d.value === "string")
          .map((d: any) => ({
            dimension: d.dimension,
            value: d.value,
            importance: coerceConfidence(d.importance),
          }))
      : [],
    searchQueries: Array.isArray(raw.searchQueries)
      ? raw.searchQueries.filter((q: any) => typeof q === "string" && q.trim().length > 0).slice(0, 5)
      : [],
  };

  if (structured.searchQueries.length === 0) {
    // Fall back to a query built from whatever fields are actually known, rather than failing retrieval entirely.
    const fallback = [structured.method.value, structured.problem.value, structured.domain.value]
      .filter((v): v is string => Boolean(v))
      .join(" ");
    if (fallback.trim()) structured.searchQueries = [fallback];
  }

  return structured;
}
