import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query } from "../config/db.js";
import { env } from "../config/env.js";
import { AdminModel } from "../models/adminModel.js";

export async function loginAdmin(email, password) {
  const result = await query(AdminModel.findByEmail, [email]);
  const admin = result.rows[0];

  if (!admin) {
    throw Object.assign(new Error("Invalid credentials"), { statusCode: 401 });
  }

  const passwordOk = await bcrypt.compare(password, admin.password_hash);
  if (!passwordOk) {
    throw Object.assign(new Error("Invalid credentials"), { statusCode: 401 });
  }

  const token = jwt.sign({ sub: admin.id, email: admin.email, fullName: admin.full_name }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn
  });

  return {
    token,
    admin: {
      id: admin.id,
      email: admin.email,
      fullName: admin.full_name
    }
  };
}
