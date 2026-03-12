import {
  listAthleticsEvents,
  listAthleticsResults,
  saveAthleticsResult
} from "../services/athleticsService.js";

export async function athleticsEventsHandler(_req, res, next) {
  try {
    const rows = await listAthleticsEvents();
    res.json(rows);
  } catch (error) {
    next(error);
  }
}

export async function athleticsResultsHandler(req, res, next) {
  try {
    const rows = await listAthleticsResults(Number(req.params.eventId));
    res.json(rows);
  } catch (error) {
    next(error);
  }
}

export async function saveAthleticsResultHandler(req, res, next) {
  try {
    const rows = await saveAthleticsResult(req.body);
    res.json(rows);
  } catch (error) {
    next(error);
  }
}
