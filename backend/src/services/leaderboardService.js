import { db, query } from "../config/db.js";

const OFFICIAL_SOURCE_KEY = "official_sheet_2026";
const DEFAULT_CHART_GROUP = "PRIMARY";

const OFFICIAL_SHEET_ROWS = [
  ["Vipulanthar", "Volleyball Boys", "Group Game", 10],
  ["Valluvar", "Volleyball Boys", "Group Game", 0],
  ["Navalar", "Volleyball Boys", "Group Game", 5],
  ["Bharathi", "Volleyball Boys", "Group Game", 7],

  ["Vipulanthar", "Volleyball Girls", "Group Game", 5],
  ["Valluvar", "Volleyball Girls", "Group Game", 10],
  ["Navalar", "Volleyball Girls", "Group Game", 7],
  ["Bharathi", "Volleyball Girls", "Group Game", 0],

  ["Vipulanthar", "Net Ball Girls", "Group Game", 7],
  ["Valluvar", "Net Ball Girls", "Group Game", 10],
  ["Navalar", "Net Ball Girls", "Group Game", 0],
  ["Bharathi", "Net Ball Girls", "Group Game", 5],

  ["Vipulanthar", "Cricket Boys", "Group Game", 5],
  ["Valluvar", "Cricket Boys", "Group Game", 10],
  ["Navalar", "Cricket Boys", "Group Game", 0],
  ["Bharathi", "Cricket Boys", "Group Game", 7],

  ["Vipulanthar", "Ella Boys", "Group Game", 7],
  ["Valluvar", "Ella Boys", "Group Game", 10],
  ["Navalar", "Ella Boys", "Group Game", 5],
  ["Bharathi", "Ella Boys", "Group Game", 0],

  ["Vipulanthar", "Ella Girls", "Group Game", 7],
  ["Valluvar", "Ella Girls", "Group Game", 5],
  ["Navalar", "Ella Girls", "Group Game", 5],
  ["Bharathi", "Ella Girls", "Group Game", 10]
];

function normalizeHouseName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+house/g, "")
    .replace(/[^a-z]/g, "");
}

function toSection(eventType) {
  return eventType === "Group Game" ? "GROUP GAMES" : "TRACK / RACE";
}

function normalizeEventType(value) {
  const key = String(value || "").toLowerCase().trim();
  if (key === "group game") return "Group Game";
  if (key === "track") return "Track";
  if (key === "race") return "Race";
  throw Object.assign(new Error("event_type must be Group Game, Track, or Race"), { statusCode: 400 });
}

function normalizeChartGroup(value) {
  const key = String(value || DEFAULT_CHART_GROUP).toUpperCase().trim();
  if (["PRIMARY", "SECONDARY"].includes(key)) return key;
  throw Object.assign(new Error("chart_group must be PRIMARY or SECONDARY"), { statusCode: 400 });
}

function chartGroupSortValue(value) {
  return value === "SECONDARY" ? 0 : 1;
}

async function getHouseRows(client) {
  const result = await client.query("SELECT id, name FROM houses ORDER BY name");
  return result.rows;
}

function resolveHouseIdByName(houseRows, inputName) {
  const wanted = normalizeHouseName(inputName);

  for (const row of houseRows) {
    const key = normalizeHouseName(row.name);
    if (
      key.includes(wanted) ||
      wanted.includes(key) ||
      (wanted.includes("valluvar") && key.includes("valuvar")) ||
      (wanted.includes("valuvar") && key.includes("valluvar")) ||
      (wanted.includes("bharathi") && key.includes("barathi")) ||
      (wanted.includes("barathi") && key.includes("bharathi"))
    ) {
      return row.id;
    }
  }

  throw Object.assign(new Error(`House mapping not found for '${inputName}'`), { statusCode: 400 });
}

async function ensureManualEvent(client, eventName, eventType, chartGroup) {
  const existing = await client.query(
    "SELECT id FROM manual_events WHERE LOWER(event_name) = LOWER($1) LIMIT 1",
    [eventName]
  );

  if (existing.rows[0]) {
    await client.query(
      `
        UPDATE manual_events
        SET event_type = $1,
            chart_group = $2,
            updated_at = NOW()
        WHERE id = $3
      `,
      [eventType, chartGroup, existing.rows[0].id]
    );
    return existing.rows[0].id;
  }

  const inserted = await client.query(
    `
      INSERT INTO manual_events (event_name, event_type, chart_group)
      VALUES ($1, $2, $3)
      RETURNING id
    `,
    [eventName, eventType, chartGroup]
  );

  return inserted.rows[0].id;
}

async function ensureAllHouseResultRows(client, eventId, houseRows) {
  for (const house of houseRows) {
    await client.query(
      `
        INSERT INTO manual_event_results (event_id, house_id, points)
        VALUES ($1, $2, 0)
        ON CONFLICT (event_id, house_id) DO NOTHING
      `,
      [eventId, house.id]
    );
  }
}

export async function addManualEvent(eventName, eventTypeInput, chartGroupInput) {
  const eventType = normalizeEventType(eventTypeInput);
  const chartGroup = normalizeChartGroup(chartGroupInput);
  const normalizedName = String(eventName || "").trim();

  if (!normalizedName) {
    throw Object.assign(new Error("event_name is required"), { statusCode: 400 });
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const houseRows = await getHouseRows(client);
    const eventId = await ensureManualEvent(client, normalizedName, eventType, chartGroup);
    await ensureAllHouseResultRows(client, eventId, houseRows);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return getEventPointsBreakdown();
}

export async function saveManualEventPoints(updates) {
  if (!Array.isArray(updates) || updates.length === 0) {
    throw Object.assign(new Error("No event results provided for save"), { statusCode: 400 });
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    for (const eventUpdate of updates) {
      const eventId = Number(eventUpdate.event_id);
      if (!Number.isFinite(eventId)) continue;

      for (const house of eventUpdate.houses || []) {
        const houseId = Number(house.house_id);
        const points = Number(house.points);
        if (!Number.isFinite(houseId) || !Number.isFinite(points) || points < 0) {
          throw Object.assign(new Error("Points must be a non-negative number"), { statusCode: 400 });
        }

        await client.query(
          `
            INSERT INTO manual_event_results (event_id, house_id, points)
            VALUES ($1, $2, $3)
            ON CONFLICT (event_id, house_id)
            DO UPDATE SET
              points = EXCLUDED.points,
              updated_at = NOW()
          `,
          [eventId, houseId, points]
        );
      }
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return getLeaderboard();
}

export async function deleteManualEvents(eventIds) {
  if (!Array.isArray(eventIds) || eventIds.length === 0) {
    throw Object.assign(new Error("Select at least one event to delete"), { statusCode: 400 });
  }

  const normalizedIds = [...new Set(eventIds.map((value) => Number(value)).filter((value) => Number.isFinite(value)))];

  if (normalizedIds.length === 0) {
    throw Object.assign(new Error("Invalid event selection"), { statusCode: 400 });
  }

  await query("DELETE FROM manual_events WHERE id = ANY($1::int[])", [normalizedIds]);
  return getEventPointsBreakdown();
}

export async function upsertOfficialSheetPoints() {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const houseRows = await getHouseRows(client);

    await client.query("DELETE FROM house_manual_points WHERE source_key = $1", [OFFICIAL_SOURCE_KEY]);

    const eventNames = [...new Set(OFFICIAL_SHEET_ROWS.map((row) => row[1]))];
    await client.query("DELETE FROM manual_events WHERE event_name = ANY($1::text[])", [eventNames]);

    for (const [houseName, eventName, eventType, points] of OFFICIAL_SHEET_ROWS) {
      const eventId = await ensureManualEvent(client, eventName, eventType, DEFAULT_CHART_GROUP);
      const houseId = resolveHouseIdByName(houseRows, houseName);

      await client.query(
        `
          INSERT INTO manual_event_results (event_id, house_id, points)
          VALUES ($1, $2, $3)
          ON CONFLICT (event_id, house_id)
          DO UPDATE SET
            points = EXCLUDED.points,
            updated_at = NOW()
        `,
        [eventId, houseId, points]
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return getLeaderboard();
}

export async function getLeaderboard() {
  const result = await query(
    `
      SELECT
        h.id,
        h.name AS house_name,
        h.color,
        (
          COALESCE((SELECT SUM(er.points_awarded) FROM event_results er WHERE er.house_id = h.id), 0)
          + COALESCE((
              SELECT SUM(mer.points)
              FROM manual_event_results mer
              JOIN manual_events me ON me.id = mer.event_id
              WHERE mer.house_id = h.id
                AND me.event_type <> 'Race'
            ), 0)
          + COALESCE((SELECT SUM(ar.points) FROM athletics_results ar WHERE ar.house_id = h.id), 0)
          + COALESCE((
              SELECT SUM(hmp.points)
              FROM house_manual_points hmp
              WHERE hmp.house_id = h.id
                AND hmp.source_key <> $1
            ), 0)
        )::int AS total_points,
        DENSE_RANK() OVER (
          ORDER BY (
            COALESCE((SELECT SUM(er.points_awarded) FROM event_results er WHERE er.house_id = h.id), 0)
            + COALESCE((
                SELECT SUM(mer.points)
                FROM manual_event_results mer
                JOIN manual_events me ON me.id = mer.event_id
                WHERE mer.house_id = h.id
                  AND me.event_type <> 'Race'
              ), 0)
            + COALESCE((SELECT SUM(ar.points) FROM athletics_results ar WHERE ar.house_id = h.id), 0)
            + COALESCE((
                SELECT SUM(hmp.points)
                FROM house_manual_points hmp
                WHERE hmp.house_id = h.id
                  AND hmp.source_key <> $1
              ), 0)
          ) DESC
        ) AS rank
      FROM houses h
      ORDER BY rank, h.name
    `,
    [OFFICIAL_SOURCE_KEY]
  );

  return result.rows;
}

export async function getHouseChampion() {
  const leaderboard = await getLeaderboard();
  return leaderboard[0] || null;
}

export async function getEventPointsBreakdown() {
  const result = await query(`
    SELECT
      me.id AS event_id,
      me.event_name,
      me.event_type,
      me.chart_group,
      h.id AS house_id,
      h.name AS house_name,
      COALESCE(mer.points, 0) AS points
    FROM manual_events me
    CROSS JOIN houses h
    LEFT JOIN manual_event_results mer
      ON mer.event_id = me.id
     AND mer.house_id = h.id
    WHERE me.event_type <> 'Race'
    ORDER BY
      CASE WHEN me.chart_group = 'SECONDARY' THEN 0 ELSE 1 END,
      CASE WHEN me.event_type = 'Group Game' THEN 1 ELSE 2 END,
      me.id,
      h.name
  `);

  const grouped = new Map();

  for (const row of result.rows) {
    if (!grouped.has(row.event_id)) {
      grouped.set(row.event_id, {
        event_id: row.event_id,
        event_name: row.event_name,
        event_type: row.event_type,
        chart_group: row.chart_group || DEFAULT_CHART_GROUP,
        category: toSection(row.event_type),
        houses: []
      });
    }

    grouped.get(row.event_id).houses.push({
      house_id: row.house_id,
      house_name: row.house_name,
      points: Number(row.points)
    });
  }

  return Array.from(grouped.values()).sort((a, b) => {
    const chartOrder = chartGroupSortValue(a.chart_group) - chartGroupSortValue(b.chart_group);
    if (chartOrder !== 0) return chartOrder;
    if (a.category !== b.category) {
      return a.category === "GROUP GAMES" ? -1 : 1;
    }
    return a.event_id - b.event_id;
  });
}
