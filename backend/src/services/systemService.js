import { query } from "../config/db.js";
import { AdminModel } from "../models/adminModel.js";
import { HouseModel } from "../models/houseModel.js";

export async function listHousesSummary() {
  const result = await query(HouseModel.all);
  return result.rows;
}

export async function listAdminUsers() {
  const result = await query(AdminModel.all);
  return result.rows;
}
