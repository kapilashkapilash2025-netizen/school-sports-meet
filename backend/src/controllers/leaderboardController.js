import {
  addManualEvent,
  deleteManualEvents,
  getEventPointsBreakdown,
  getHouseChampion,
  getLeaderboard,
  saveManualEventPoints,
  upsertOfficialSheetPoints
} from "../services/leaderboardService.js";

export async function leaderboardHandler(_req, res, next) {
  try {
    const rows = await getLeaderboard();
    res.json(rows);
  } catch (error) {
    next(error);
  }
}

export async function houseChampionHandler(_req, res, next) {
  try {
    const champion = await getHouseChampion();
    res.json(champion);
  } catch (error) {
    next(error);
  }
}

export async function loadOfficialSheetPointsHandler(_req, res, next) {
  try {
    const rows = await upsertOfficialSheetPoints();
    res.json({
      message: "Official result sheet points loaded successfully.",
      leaderboard: rows
    });
  } catch (error) {
    next(error);
  }
}

export async function eventPointsBreakdownHandler(_req, res, next) {
  try {
    const rows = await getEventPointsBreakdown();
    res.json(rows);
  } catch (error) {
    next(error);
  }
}

export async function addManualEventHandler(req, res, next) {
  try {
    const rows = await addManualEvent(req.body.event_name, req.body.event_type, req.body.chart_group);
    res.status(201).json(rows);
  } catch (error) {
    next(error);
  }
}

export async function saveManualEventPointsHandler(req, res, next) {
  try {
    const leaderboard = await saveManualEventPoints(req.body.events || []);
    res.json({
      message: "Event results saved successfully.",
      leaderboard
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteManualEventsHandler(req, res, next) {
  try {
    const rows = await deleteManualEvents(req.body.event_ids || []);
    res.json({
      message: "Selected events deleted successfully.",
      rows
    });
  } catch (error) {
    next(error);
  }
}
