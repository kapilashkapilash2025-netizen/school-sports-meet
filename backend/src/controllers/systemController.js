import { listAdminUsers, listHousesSummary } from "../services/systemService.js";

export async function housesSummaryHandler(_req, res, next) {
  try {
    const rows = await listHousesSummary();
    res.json(rows);
  } catch (error) {
    next(error);
  }
}

export async function adminUsersHandler(_req, res, next) {
  try {
    const rows = await listAdminUsers();
    res.json(rows);
  } catch (error) {
    next(error);
  }
}
