import { searchMultiple, SemanticScholarPaper } from "../lib/semanticScholar";
import { NormalizedPaper, StructuredIdea } from "../types";

function normalize(p: SemanticScholarPaper, query: string | null): NormalizedPaper {
  return {
    paperId: p.paperId,
    title: p.title || "Untitled",
    authors: (p.authors || []).map((a) => a.name).filter(Boolean),
    year: p.year ?? null,
    venue: p.venue ?? null,
    abstract: p.abstract ?? null,
    doi: p.externalIds?.DOI ?? null,
    citationCount: typeof p.citationCount === "number" ? p.citationCount : null,
    url: p.url ?? (p.paperId ? `https://www.semanticscholar.org/paper/${p.paperId}` : null),
    retrievalQuery: query,
  };
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 3)
  );
}

/**
 * Deterministic relevance score (no AI): keyword/title overlap with the idea's
 * core terms, plus a small recency boost. This is a coarse filter to keep the
 * candidate set to a reasonable size before any AI call sees it — it is not
 * presented to the user as a novelty judgment.
 */
function scorePaper(paper: NormalizedPaper, ideaTerms: Set<string>): number {
  const titleTokens = tokenize(paper.title);
  const abstractTokens = paper.abstract ? tokenize(paper.abstract) : new Set<string>();

  let overlapScore = 0;
  for (const term of ideaTerms) {
    if (titleTokens.has(term)) overlapScore += 2;
    if (abstractTokens.has(term)) overlapScore += 1;
  }

  let recencyBoost = 0;
  if (paper.year) {
    const age = new Date().getFullYear() - paper.year;
    if (age <= 3) recencyBoost = 2;
    else if (age <= 7) recencyBoost = 1;
  }

  const citationSignal = paper.citationCount ? Math.min(Math.log10(paper.citationCount + 1), 3) : 0;

  return overlapScore + recencyBoost + citationSignal;
}

export interface RetrievalResult {
  papers: NormalizedPaper[];
  queriesUsed: string[];
  candidateCountBeforeFilter: number;
  retrievedAt: string;
}

export async function retrieveAndFilter(idea: StructuredIdea, extraQueries: string[]): Promise<RetrievalResult> {
  const queries = Array.from(new Set([...(idea.searchQueries || []), ...extraQueries])).filter(Boolean);

  if (queries.length === 0) {
    throw new Error("No search queries were available to retrieve literature. Retrieval cannot proceed.");
  }

  const { papers: rawPapers, queryByPaperId } = await searchMultiple(queries, 15);

  const normalized = rawPapers.map((p) => normalize(p, queryByPaperId[p.paperId] ?? null));

  const ideaTerms = new Set<string>();
  for (const field of [idea.researchQuestion, idea.problem, idea.method, idea.domain, idea.context, idea.outcome]) {
    if (field.value) tokenize(field.value).forEach((t) => ideaTerms.add(t));
  }
  for (const dim of idea.contributionDimensions || []) {
    tokenize(dim.value).forEach((t) => ideaTerms.add(t));
  }

  const scored = normalized
    .map((p) => ({ paper: p, score: scorePaper(p, ideaTerms) }))
    .sort((a, b) => b.score - a.score);

  const kept = scored.slice(0, 50).map((s) => s.paper);

  return {
    papers: kept,
    queriesUsed: queries,
    candidateCountBeforeFilter: normalized.length,
    retrievedAt: new Date().toISOString(),
  };
}
