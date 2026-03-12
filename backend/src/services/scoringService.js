import { normalizeScoringMode } from "../utils/scoringMode.js";
import { scoreByOutcome, scoreByPosition } from "../utils/scoring.js";

export function buildScoredEntries(mode, entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw Object.assign(new Error("Result entries are required"), { statusCode: 400 });
  }

  const normalizedMode = normalizeScoringMode(mode);
  if (!normalizedMode) {
    throw Object.assign(new Error("Unsupported scoring mode"), { statusCode: 400 });
  }

  if (normalizedMode === "position") {
    return entries.map((entry) => ({
      ...entry,
      points_awarded: scoreByPosition(Number(entry.position || 0)),
      score_value: null,
      outcome: null
    }));
  }

  if (normalizedMode === "outcome") {
    return entries.map((entry) => {
      const normalized = String(entry.outcome || "").toLowerCase();
      if (!["win", "loss", "draw"].includes(normalized)) {
        throw Object.assign(new Error("Invalid outcome value"), { statusCode: 400 });
      }
      return {
        ...entry,
        outcome: normalized,
        points_awarded: scoreByOutcome(normalized),
        score_value: null,
        position: null
      };
    });
  }

  if (normalizedMode === "score") {
    return entries.map((entry) => {
      const score = Number(entry.score);
      if (Number.isNaN(score)) {
        throw Object.assign(new Error("Invalid points value"), { statusCode: 400 });
      }
      return {
        ...entry,
        score_value: score,
        points_awarded: score,
        position: null,
        outcome: null
      };
    });
  }

  throw Object.assign(new Error("Unsupported scoring mode"), { statusCode: 400 });
}
