import { db, query } from "../config/db.js";

const POSITION_POINTS = {
  1: 7,
  2: 5,
  3: 4,
  4: 3,
  5: 2,
  6: 1
};

export async function listAthleticsEvents() {
  const result = await query("SELECT id, event_name FROM athletics_events ORDER BY id");
  return result.rows;
}

export async function listAthleticsResults(eventId) {
  const result = await query(
    `
      SELECT
        ar.id,
        ar.event_id,
        ar.student_id,
        s.student_id AS student_code,
        s.name AS student_name,
        h.id AS house_id,
        h.name AS house_name,
        ar.position,
        ar.points,
        ar.timestamp
      FROM athletics_results ar
      JOIN students s ON s.id = ar.student_id
      JOIN houses h ON h.id = ar.house_id
      WHERE ar.event_id = $1
      ORDER BY ar.position
    `,
    [eventId]
  );

  return result.rows;
}

export async function saveAthleticsResult(payload) {
  const eventId = Number(payload.event_id);
  const studentId = Number(payload.student_id);
  const position = Number(payload.position);

  if (!Number.isFinite(eventId) || !Number.isFinite(studentId) || !Number.isFinite(position)) {
    throw Object.assign(new Error("event_id, student_id, and position are required"), {
      statusCode: 400
    });
  }

  const points = POSITION_POINTS[position];
  if (!points) {
    throw Object.assign(new Error("Position must be between 1 and 6"), { statusCode: 400 });
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const studentResult = await client.query("SELECT house_id FROM students WHERE id = $1", [studentId]);
    if (!studentResult.rows[0]) {
      throw Object.assign(new Error("Student not found"), { statusCode: 404 });
    }

    const eventResult = await client.query("SELECT id FROM athletics_events WHERE id = $1", [eventId]);
    if (!eventResult.rows[0]) {
      throw Object.assign(new Error("Athletics event not found"), { statusCode: 404 });
    }

    const houseId = studentResult.rows[0].house_id;

    await client.query("DELETE FROM athletics_results WHERE event_id = $1 AND student_id = $2", [
      eventId,
      studentId
    ]);

    await client.query(
      `
        INSERT INTO athletics_results (event_id, student_id, house_id, position, points, timestamp)
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (event_id, position)
        DO UPDATE SET
          student_id = EXCLUDED.student_id,
          house_id = EXCLUDED.house_id,
          points = EXCLUDED.points,
          timestamp = NOW()
      `,
      [eventId, studentId, houseId, position, points]
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return listAthleticsResults(eventId);
}
