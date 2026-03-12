import { loginAdmin } from "../services/authService.js";
import { env } from "../config/env.js";

function getCookieOptions() {
  const isProduction = env.nodeEnv === "production";

  return {
    httpOnly: true,
    sameSite: isProduction ? "none" : "lax",
    secure: isProduction,
    maxAge: 8 * 60 * 60 * 1000
  };
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const data = await loginAdmin(email, password);

    res.cookie("admin_token", data.token, getCookieOptions());

    res.json({ admin: data.admin, token: data.token });
  } catch (error) {
    next(error);
  }
}

export async function me(req, res) {
  res.json({ admin: req.admin });
}

export async function logout(_req, res) {
  res.clearCookie("admin_token", getCookieOptions());
  res.json({ message: "Logged out" });
}
