import { StressTestResponse, StructuredIdea } from "./types";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return res.json();
}

/** Runs only the decomposition step, for the researcher to review/correct before the full pipeline runs. */
export async function runDecompose(params: { rawInput: string; rawAbstract?: string }): Promise<{ structuredIdea: StructuredIdea }> {
  const res = await fetch("/api/decompose", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return handle<{ structuredIdea: StructuredIdea }>(res);
}

export async function runStressTest(params: {
  rawInput: string;
  rawAbstract?: string;
  sessionId?: string;
  previousVersion?: number;
  /** The researcher's confirmed/edited understanding — skips re-running decomposition when provided. */
  structuredIdea?: StructuredIdea;
}): Promise<StressTestResponse> {
  const res = await fetch("/api/stress-test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return handle<StressTestResponse>(res);
}

export async function fetchIdea(id: string) {
  const res = await fetch(`/api/ideas/${id}`);
  return handle<any>(res);
}
