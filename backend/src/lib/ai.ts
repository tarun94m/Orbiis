import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../env";

/**
 * ORBIIS never treats AI as the source of truth for papers — it is only used to
 * decompose ideas, generate search queries, and reason over real Semantic Scholar
 * metadata that is passed into the prompt. This module is a thin, swappable
 * abstraction: the rest of the app calls `generateStructured`, and only this file
 * knows which underlying provider/model is in use. Swapping providers means adding
 * a branch here, not touching the pipeline.
 */

export interface GenerateStructuredParams {
  system: string;
  prompt: string;
  /** Optional plain-language description of expected JSON shape, injected into the prompt for the model. */
  schemaHint?: string;
}

export interface AIProvider {
  generateStructured(params: GenerateStructuredParams): Promise<string>;
}

class GeminiProvider implements AIProvider {
  private client: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async generateStructured(params: GenerateStructuredParams): Promise<string> {
    const model = this.client.getGenerativeModel({
      model: env.AI_MODEL || "gemini-2.0-flash",
      systemInstruction: params.system,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    const fullPrompt = params.schemaHint
      ? `${params.prompt}\n\nReturn ONLY valid JSON matching this shape (no markdown fences, no commentary):\n${params.schemaHint}`
      : params.prompt;

    const result = await model.generateContent(fullPrompt);
    return result.response.text();
  }
}

function buildProvider(): AIProvider {
  switch (env.AI_PROVIDER) {
    case "gemini":
    default:
      return new GeminiProvider(env.AI_API_KEY);
  }
}

const provider = buildProvider();

function stripFences(text: string): string {
  return text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

/**
 * Calls the AI provider and parses the response as JSON. Retries once with a
 * correction prompt if parsing fails. Throws a descriptive error if it still
 * fails — callers must surface this as a graceful error, never invent output.
 */
export async function generateJSON<T>(params: GenerateStructuredParams): Promise<T> {
  const raw = await provider.generateStructured(params);
  try {
    return JSON.parse(stripFences(raw)) as T;
  } catch (err) {
    // Retry once with an explicit correction instruction.
    const retryRaw = await provider.generateStructured({
      ...params,
      prompt: `${params.prompt}\n\nYour previous response could not be parsed as JSON. Respond again with ONLY valid, parseable JSON and nothing else.`,
    });
    try {
      return JSON.parse(stripFences(retryRaw)) as T;
    } catch (err2) {
      throw new Error(
        `AI response could not be parsed as valid JSON after one retry. This step failed safely without inventing output.`
      );
    }
  }
}

export const AI_SYSTEM_PROMPT = `You are an academic research analyst embedded in a tool called ORBIIS.
Your job is to help a researcher stress-test a proposed research contribution against real literature.

Hard rules:
- You are not allowed to invent papers, findings, authors, dates, citations, or study results.
- Use only the supplied paper metadata and abstracts when making literature-supported claims.
- If the supplied evidence does not establish a claim, explicitly mark it unsupported.
- Do not infer that a topic is globally unexplored merely because it is absent from the supplied papers.
- Distinguish between: evidence directly present in papers, reasonable synthesis, and speculative interpretation.
- You cannot establish absolute novelty. Your job is to identify potential overlap and potential differentiation within the supplied literature only.
- Never say "there is no research on X" — say "we found limited evidence addressing X in the retrieved literature."
- Never say "this is definitely a research gap" — say "potentially underrepresented area."
- You must never use the words "novel," "novelty confirmed," "unique contribution," or "nobody has done this," and never state or imply that ORBIIS has established novelty or that a topic is unexplored. If no overlapping paper was found in the retrieved set, phrase it exactly as "no direct match was identified in the retrieved set" — and remember that is not evidence that no similar work exists elsewhere, only that none was found in this search.
- Always return strictly valid JSON with no markdown fences and no commentary outside the JSON.`;
