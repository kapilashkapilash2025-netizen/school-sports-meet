import {
  getEventResults,
  getHouseResults,
  getResultSummary,
  getStudentResults,
  upsertResults
} from "../services/resultService.js";

export async function upsertResultsHandler(req, res, next) {
  try {
    const rows = await upsertResults(req.body);
    res.json(rows);
  } catch (error) {
    next(error);
  }
}

export async function eventResultsHandler(req, res, next) {
  try {
    const rows = await getEventResults(Number(req.params.eventId));
    res.json(rows);
  } catch (error) {
    next(error);
  }
}

export async function studentResultsHandler(req, res, next) {
  try {
    const rows = await getStudentResults(Number(req.params.studentId));
    res.json(rows);
  } catch (error) {
    next(error);
  }
}

export async function houseResultsHandler(req, res, next) {
  try {
    const rows = await getHouseResults(Number(req.params.houseId));
    res.json(rows);
  } catch (error) {
    next(error);
  }
}

export async function resultSummaryHandler(_req, res, next) {
  try {
    const rows = await getResultSummary();
    res.json(rows);
  } catch (error) {
    next(error);
  }
}
