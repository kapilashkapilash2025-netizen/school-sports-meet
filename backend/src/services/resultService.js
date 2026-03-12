import { db, query } from "../config/db.js";
import { ResultModel } from "../models/resultModel.js";
import { assertEventParticipant, getEventById } from "./eventService.js";
import { buildScoredEntries } from "./scoringService.js";
import { normalizeScoringMode } from "../utils/scoringMode.js";

async function assertFullResultSet(eventId, entries) {
  const participantResult = await query(
    "SELECT student_id FROM event_participants WHERE event_id = $1",
    [eventId]
  );

  const participantIds = participantResult.rows.map((row) => Number(row.student_id));
  if (participantIds.length === 0) {
    throw Object.assign(new Error("No participants registered for this event"), { statusCode: 400 });
  }

  const entryIds = entries.map((entry) => Number(entry.student_id));
  const uniqueEntryIds = new Set(entryIds);
  const participantIdSet = new Set(participantIds);

  const hasMissing = participantIds.some((id) => !uniqueEntryIds.has(id));
  const hasUnknown = entryIds.some((id) => !participantIdSet.has(id));
  const hasDuplicates = uniqueEntryIds.size !== entryIds.length;

  if (hasMissing || hasUnknown || hasDuplicates || uniqueEntryIds.size !== participantIds.length) {
    throw Object.assign(
      new Error("All participating houses must have results before saving."),
      { statusCode: 400 }
    );
  }
}

export async function upsertResults(payload) {
  const event = await getEventById(payload.event_id);

  const eventMode = normalizeScoringMode(event.scoring_mode);
  const requestMode = normalizeScoringMode(payload.mode);

  if (!requestMode || eventMode !== requestMode) {
    throw Object.assign(new Error("Scoring mode mismatch for selected event"), { statusCode: 400 });
  }

  const normalizedEntries = buildScoredEntries(payload.mode, payload.entries);

  await assertFullResultSet(payload.event_id, normalizedEntries);

  for (const entry of normalizedEntries) {
    await assertEventParticipant(payload.event_id, entry.student_id);
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM event_results WHERE event_id = $1", [payload.event_id]);

    for (const entry of normalizedEntries) {
      const houseRes = await client.query("SELECT house_id FROM students WHERE id = $1", [entry.student_id]);
      const houseId = houseRes.rows[0]?.house_id;

      await client.query(
        `
          INSERT INTO event_results (
            event_id, student_id, house_id, score_value, position, outcome, points_awarded
          ) VALUES ($1,$2,$3,$4,$5,$6,$7)
        `,
        [
          payload.event_id,
          entry.student_id,
          houseId,
          entry.score_value ?? null,
          entry.position ?? null,
          entry.outcome ?? null,
          entry.points_awarded
        ]
      );
    }

    await client.query("UPDATE events SET status = 'completed', updated_at = NOW() WHERE id = $1", [payload.event_id]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return getEventResults(payload.event_id);
}

export async function getEventResults(eventId) {
  const result = await query(
    `${ResultModel.baseSelect}
     WHERE er.event_id = $1
     ORDER BY er.position NULLS LAST, er.score_value DESC NULLS LAST`,
    [eventId]
  );
  return result.rows;
}

export async function getStudentResults(studentId) {
  const result = await query(
    `${ResultModel.baseSelect}
     WHERE er.student_id = $1
     ORDER BY er.created_at DESC`,
    [studentId]
  );
  return result.rows;
}

export async function getHouseResults(houseId) {
  const result = await query(
    `${ResultModel.baseSelect}
     WHERE er.house_id = $1
     ORDER BY er.created_at DESC`,
    [houseId]
  );
  return result.rows;
}

export async function getResultSummary() {
  const result = await query(`
    SELECT
      e.id AS event_id,
      e.name AS event_name,
      e.scoring_mode,
      COUNT(er.id) AS total_results,
      MAX(er.points_awarded) AS top_points_awarded
    FROM events e
    LEFT JOIN event_results er ON er.event_id = e.id
    GROUP BY e.id, e.name, e.scoring_mode
    ORDER BY e.event_date DESC
  `);

  return result.rows;
}
