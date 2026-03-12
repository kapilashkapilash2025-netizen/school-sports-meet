export function normalizeScoringMode(mode) {
  const value = String(mode || "").toLowerCase().replace(/\s+/g, "_");

  if (["rank", "position"].includes(value)) return "position";
  if (["points", "point", "score"].includes(value)) return "score";
  if (["win_loss_draw", "win/loss/draw", "winlossdraw", "outcome"].includes(value)) {
    return "outcome";
  }

  return null;
}

export function toUiScoringType(internalMode) {
  if (internalMode === "position") return "rank";
  if (internalMode === "score") return "points";
  if (internalMode === "outcome") return "win_loss_draw";
  return internalMode;
}
