import { generateJSON, AI_SYSTEM_PROMPT } from "../lib/ai";
import { StructuredIdea } from "../types";

const SCHEMA_HINT = `{ "queries": [string, string, string, string, string] }`;

/**
 * These queries exist specifically to try to find evidence AGAINST the user's
 * novelty claim — not just supporting evidence. This is what makes ORBIIS a
 * stress test rather than a literature summary.
 */
export async function generateCollisionQueries(idea: StructuredIdea): Promise<string[]> {
  const prompt = `Given this structured research idea, generate 3-6 short literature-search queries specifically designed to find work that could WEAKEN or INVALIDATE the claimed contribution — not queries that merely confirm the idea. Include: exact contribution terms, method+domain combinations, method+alternate population, method+alternate context, and at least one query using alternative/synonymous terminology a different author might have used for the same idea.

STRUCTURED IDEA:
${JSON.stringify(idea, null, 2)}
`;

  const raw = await generateJSON<{ queries: string[] }>({ system: AI_SYSTEM_PROMPT, prompt, schemaHint: SCHEMA_HINT });
  return Array.isArray(raw.queries) ? raw.queries.filter((q) => typeof q === "string" && q.trim()).slice(0, 6) : [];
}
