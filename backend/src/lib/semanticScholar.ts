import fetch from "node-fetch";
import { env } from "../env";

const BASE_URL = "https://api.semanticscholar.org/graph/v1";

const PAPER_FIELDS = [
  "paperId",
  "title",
  "abstract",
  "authors",
  "year",
  "venue",
  "citationCount",
  "externalIds",
  "url",
].join(",");

export interface SemanticScholarPaper {
  paperId: string;
  title: string;
  abstract?: string | null;
  authors?: { authorId?: string; name: string }[];
  year?: number | null;
  venue?: string | null;
  citationCount?: number | null;
  externalIds?: { DOI?: string } | null;
  url?: string | null;
}

interface SearchResponse {
  total: number;
  offset: number;
  data: SemanticScholarPaper[];
}

function headers(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (env.SEMANTIC_SCHOLAR_API_KEY) {
    h["x-api-key"] = env.SEMANTIC_SCHOLAR_API_KEY;
  }
  return h;
}

/**
 * Search Semantic Scholar for a single query. Never fabricates results —
 * on failure this throws, and callers must surface a real error rather than
 * substituting fallback papers.
 */
export async function searchPapers(query: string, limit = 20): Promise<SemanticScholarPaper[]> {
  const url = `${BASE_URL}/paper/search?query=${encodeURIComponent(query)}&limit=${limit}&fields=${PAPER_FIELDS}`;

  const res = await fetch(url, { headers: headers() });

  if (!res.ok) {
    if (res.status === 429) {
      // Basic backoff-and-retry once for rate limiting.
      await new Promise((r) => setTimeout(r, 1500));
      const retry = await fetch(url, { headers: headers() });
      if (!retry.ok) {
        throw new Error(`Semantic Scholar search failed for "${query}" (status ${retry.status}) after retry`);
      }
      const retryJson = (await retry.json()) as SearchResponse;
      return retryJson.data || [];
    }
    throw new Error(`Semantic Scholar search failed for "${query}" (status ${res.status})`);
  }

  const json = (await res.json()) as SearchResponse;
  return json.data || [];
}

/**
 * Runs multiple search queries, retrieves candidates, and deduplicates by paperId.
 * Returns the papers along with a map of which query(ies) surfaced each paper,
 * so retrieval stays transparent and auditable.
 */
export async function searchMultiple(
  queries: string[],
  limitPerQuery = 15
): Promise<{ papers: SemanticScholarPaper[]; queryByPaperId: Record<string, string> }> {
  const seen = new Map<string, SemanticScholarPaper>();
  const queryByPaperId: Record<string, string> = {};

  for (const q of queries) {
    try {
      const results = await searchPapers(q, limitPerQuery);
      for (const p of results) {
        if (!p.paperId) continue;
        if (!seen.has(p.paperId)) {
          seen.set(p.paperId, p);
          queryByPaperId[p.paperId] = q;
        }
      }
    } catch (err) {
      // A single failed query shouldn't kill the whole retrieval — log and continue.
      // eslint-disable-next-line no-console
      console.error(`[semanticScholar] query failed: "${q}"`, err);
    }
  }

  return { papers: Array.from(seen.values()), queryByPaperId };
}
