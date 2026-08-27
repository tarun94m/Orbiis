import { Router } from "express";
import { db } from "../lib/db";
import { runStressTest } from "../pipeline/orchestrate";
import { decomposeIdea } from "../pipeline/1-decompose";

export const ideasRouter = Router();

/**
 * Starts a new session (no auth for MVP — session is just a container so idea
 * versions can be grouped and iterated on without requiring an account).
 */
ideasRouter.post("/sessions", async (_req, res) => {
  const session = await db.researchSession.create({ data: {} });
  res.json({ sessionId: session.id });
});

/**
 * Runs ONLY the decomposition step (call 1) and returns it for the researcher to
 * review/correct before the expensive retrieval + analysis pipeline runs. Stateless
 * — nothing is persisted here; persistence happens once /stress-test is called
 * with the (possibly edited) result.
 */
ideasRouter.post("/decompose", async (req, res) => {
  const { rawInput, rawAbstract } = req.body || {};

  if (typeof rawInput !== "string" || rawInput.trim().length < 10) {
    return res.status(400).json({
      error: "Please describe your research idea in a bit more detail (at least a sentence or two).",
    });
  }

  try {
    const structuredIdea = await decomposeIdea(
      rawInput.trim(),
      typeof rawAbstract === "string" && rawAbstract.trim() ? rawAbstract.trim() : null
    );
    res.json({ structuredIdea });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error("[decompose] failed:", err);
    res.status(502).json({
      error: err?.message || "Could not understand this idea. This is a real failure, not a fabricated result — please try again.",
    });
  }
});

/**
 * Runs the full stress-test pipeline on a research idea. If sessionId is
 * omitted, a new session is created implicitly. If ideaVersion context
 * (previousIdeaId) is provided, this is treated as a refinement iteration. If
 * `structuredIdea` is provided (the researcher confirmed/edited the decomposition),
 * it's used instead of re-running decomposition.
 */
ideasRouter.post("/stress-test", async (req, res) => {
  const { rawInput, rawAbstract, sessionId: incomingSessionId, previousVersion, structuredIdea } = req.body || {};

  if (typeof rawInput !== "string" || rawInput.trim().length < 10) {
    return res.status(400).json({
      error: "Please describe your research idea in a bit more detail (at least a sentence or two).",
    });
  }

  try {
    let sessionId = incomingSessionId;
    if (!sessionId) {
      const session = await db.researchSession.create({ data: {} });
      sessionId = session.id;
    }

    const version = typeof previousVersion === "number" ? previousVersion + 1 : 1;

    const { ideaId, result } = await runStressTest({
      sessionId,
      rawInput: rawInput.trim(),
      rawAbstract: typeof rawAbstract === "string" && rawAbstract.trim() ? rawAbstract.trim() : null,
      version,
      structuredIdeaOverride: structuredIdea && typeof structuredIdea === "object" ? structuredIdea : undefined,
    });

    res.json({ sessionId, ideaId, version, result });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error("[stress-test] failed:", err);
    res.status(502).json({
      error:
        err?.message ||
        "The stress test could not be completed. This is a real failure, not a fabricated result — please try again.",
    });
  }
});

/** Fetch a previously run idea + its latest analysis, for reload/share. */
ideasRouter.get("/ideas/:id", async (req, res) => {
  const idea = await db.researchIdea.findUnique({
    where: { id: req.params.id },
    include: {
      analysisRuns: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!idea) return res.status(404).json({ error: "Idea not found." });

  res.json({
    ideaId: idea.id,
    sessionId: idea.sessionId,
    version: idea.version,
    rawInput: idea.rawInput,
    rawAbstract: idea.rawAbstract,
    result: idea.analysisRuns[0]?.outputJson ?? null,
  });
});

/** List idea versions for a session, so the UI can show iteration history. */
ideasRouter.get("/sessions/:id/ideas", async (req, res) => {
  const ideas = await db.researchIdea.findMany({
    where: { sessionId: req.params.id },
    orderBy: { version: "asc" },
    select: { id: true, version: true, rawInput: true, createdAt: true },
  });
  res.json({ ideas });
});
