import pg from "pg";
import { env } from "./env.js";

const { Pool } = pg;

const poolConfig = {
  connectionString: env.databaseUrl
};

if (env.databaseSsl) {
  poolConfig.ssl = {
    rejectUnauthorized: false
  };
}

export const db = new Pool(poolConfig);

export const query = (text, params) => db.query(text, params);

export async function ensureDatabaseReady() {
  await query(
    `
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'students'
            AND column_name = 'date_of_birth'
            AND is_nullable = 'NO'
        ) THEN
          ALTER TABLE students ALTER COLUMN date_of_birth DROP NOT NULL;
        END IF;
      END $$;
    `
  );

  await query(
    `
      CREATE TABLE IF NOT EXISTS house_manual_points (
        id SERIAL PRIMARY KEY,
        house_id INTEGER NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
        source_key VARCHAR(64) NOT NULL,
        game_name VARCHAR(255) NOT NULL,
        points INTEGER NOT NULL CHECK (points >= 0),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE (house_id, source_key, game_name)
      )
    `
  );

  await query("CREATE INDEX IF NOT EXISTS idx_house_manual_points_house ON house_manual_points(house_id)");

  await query(
    `
      CREATE TABLE IF NOT EXISTS manual_events (
        id SERIAL PRIMARY KEY,
        event_name VARCHAR(255) UNIQUE NOT NULL,
        event_type VARCHAR(32) NOT NULL CHECK (event_type IN ('Group Game', 'Track', 'Race')),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `
  );

  await query("ALTER TABLE manual_events ADD COLUMN IF NOT EXISTS chart_group VARCHAR(16) NOT NULL DEFAULT 'PRIMARY'");
  await query("UPDATE manual_events SET chart_group = 'PRIMARY' WHERE chart_group IS NULL");

  await query(
    `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'manual_events_chart_group_check'
        ) THEN
          ALTER TABLE manual_events
          ADD CONSTRAINT manual_events_chart_group_check
          CHECK (chart_group IN ('PRIMARY', 'SECONDARY'));
        END IF;
      END $$;
    `
  );

  await query(
    `
      CREATE TABLE IF NOT EXISTS manual_event_results (
        id SERIAL PRIMARY KEY,
        event_id INTEGER NOT NULL REFERENCES manual_events(id) ON DELETE CASCADE,
        house_id INTEGER NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
        points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE (event_id, house_id)
      )
    `
  );

  await query("CREATE INDEX IF NOT EXISTS idx_manual_event_results_event ON manual_event_results(event_id)");
  await query("CREATE INDEX IF NOT EXISTS idx_manual_event_results_house ON manual_event_results(house_id)");

  await query(
    `
      CREATE TABLE IF NOT EXISTS athletics_events (
        id SERIAL PRIMARY KEY,
        event_name VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `
  );

  await query(
    `
      CREATE TABLE IF NOT EXISTS athletics_results (
        id SERIAL PRIMARY KEY,
        event_id INTEGER NOT NULL REFERENCES athletics_events(id) ON DELETE CASCADE,
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        house_id INTEGER NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
        position INTEGER NOT NULL CHECK (position BETWEEN 1 AND 6),
        points INTEGER NOT NULL CHECK (points >= 0),
        timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE (event_id, position),
        UNIQUE (event_id, student_id)
      )
    `
  );

  await query("CREATE INDEX IF NOT EXISTS idx_athletics_results_house ON athletics_results(house_id)");
  await query("CREATE INDEX IF NOT EXISTS idx_athletics_results_event ON athletics_results(event_id)");

  await query(
    `
      INSERT INTO athletics_events (event_name)
      VALUES
        ('100m Under 16'),
        ('200m Under 18'),
        ('Long Jump'),
        ('Shot Put'),
        ('Relay Race')
      ON CONFLICT (event_name) DO NOTHING
    `
  );
}
