import { db } from "../lib/db";
import { env } from "../env";
import { decomposeIdea, sanitizeStructuredIdea } from "./1-decompose";
import { generateCollisionQueries } from "./2-collision-queries";
import { retrieveAndFilter } from "./3-retrieve";
import { selectClosestWork } from "./4-closest-work";
import { buildContributionMap } from "./5-contribution-map";
import { detectCollisions } from "./6-collisions";
import { generateReviewerAttack } from "./7-reviewer-attack";
import { generateRefinement } from "./8-refinement";
import { AnalysisResult, StructuredIdea } from "../types";

const PROMPT_VERSION = "v1";

export async function runStressTest(params: {
  sessionId: string;
  rawInput: string;
  rawAbstract?: string | null;
  version: number;
  /**
   * If the researcher reviewed and edited the "here's what ORBIIS understood"
   * screen, their (possibly corrected) structured idea is passed here and used
   * instead of re-running decomposition. Still sanitized — client input is never
   * trusted as-is, even though it came from the researcher's own edits.
   */
  structuredIdeaOverride?: StructuredIdea;
}): Promise<{ ideaId: string; result: AnalysisResult }> {
  const { sessionId, rawInput, rawAbstract, version, structuredIdeaOverride } = params;

  // CALL 1: decomposition (includes initial search queries) — skipped if the
  // researcher already confirmed/edited a structured idea.
  const structuredIdea = structuredIdeaOverride
    ? sanitizeStructuredIdea(structuredIdeaOverride)
    : await decomposeIdea(rawInput, rawAbstract);

  const idea = await db.researchIdea.create({
    data: {
      sessionId,
      version,
      rawInput,
      rawAbstract: rawAbstract ?? null,
      structuredJson: structuredIdea as any,
    },
  });

  // CALL 2: adversarial / collision-hunting queries
  const collisionQueries = await generateCollisionQueries(structuredIdea);

  // Retrieval + deterministic relevance filtering (no AI, transparent)
  const retrieval = await retrieveAndFilter(structuredIdea, collisionQueries);
  const papers = retrieval.papers;

  if (papers.length === 0) {
    throw new Error(
      "Semantic Scholar returned no usable results for this idea's search queries. Try rephrasing the idea with more specific terminology."
    );
  }

  // Persist papers + idea_papers linkage
  for (const p of papers) {
    const dbPaper = await db.paper.upsert({
      where: { semanticScholarId: p.paperId },
      update: {
        title: p.title,
        abstract: p.abstract,
        authorsJson: p.authors as any,
        year: p.year,
        venue: p.venue,
        doi: p.doi,
        citationCount: p.citationCount,
        url: p.url,
      },
      create: {
        semanticScholarId: p.paperId,
        title: p.title,
        abstract: p.abstract,
        authorsJson: p.authors as any,
        year: p.year,
        venue: p.venue,
        doi: p.doi,
        citationCount: p.citationCount,
        url: p.url,
        rawJson: p as any,
      },
    });

    await db.ideaPaper.upsert({
      where: { ideaId_paperId: { ideaId: idea.id, paperId: dbPaper.id } },
      update: { retrievalQuery: p.retrievalQuery },
      create: {
        ideaId: idea.id,
        paperId: dbPaper.id,
        retrievalQuery: p.retrievalQuery,
      },
    });
  }

  // CALL 3: closest existing work
  const closestWork = await selectClosestWork(structuredIdea, papers);

  // CALL 4: contribution map
  const { rows: contributionMap, potentialDifferentiation } = await buildContributionMap(
    structuredIdea,
    closestWork,
    papers
  );

  // CALL 5: novelty collisions
  const collisions = await detectCollisions(structuredIdea, papers);

  // CALL 6: reviewer attack
  const reviewerObjections = await generateReviewerAttack(structuredIdea, papers, closestWork, collisions);

  // CALL 7: refinement + potential contribution + closing decision
  const {
    refinements,
    potentialContribution,
    researchDecision,
    researchDecisionReason,
    biggestIssue,
    whatToInvestigateNext,
  } = await generateRefinement(structuredIdea, closestWork, collisions, reviewerObjections);

  const result: AnalysisResult = {
    structuredIdea,
    retrievedPapers: papers,
    closestWork,
    contributionMap,
    potentialDifferentiation,
    collisions,
    reviewerObjections,
    refinements,
    potentialContribution,
    researchDecision,
    researchDecisionReason,
    biggestIssue,
    whatToInvestigateNext,
  };

  await db.analysisRun.create({
    data: {
      ideaId: idea.id,
      model: env.AI_MODEL,
      promptVersion: PROMPT_VERSION,
      outputJson: result as any,
    },
  });

  return { ideaId: idea.id, result };
}
