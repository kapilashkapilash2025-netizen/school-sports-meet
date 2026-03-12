import app from "./app.js";
import { ensureDatabaseReady } from "./config/db.js";
import { env } from "./config/env.js";

async function startServer() {
  try {
    await ensureDatabaseReady();
    app.listen(env.port, () => {
      console.log(`School Sports Meet API listening on port ${env.port}`);
    });
  } catch (error) {
    console.error("Database startup check failed:", error.message);
    process.exit(1);
  }
}

startServer();
