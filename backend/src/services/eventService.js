import { db, query } from "../config/db.js";
import { EventModel } from "../models/eventModel.js";
import { assertStudentsExist } from "./studentService.js";
import { normalizeScoringMode, toUiScoringType } from "../utils/scoringMode.js";

const allowedAges = ["Under 12", "Under 14", "Under 16", "Under 18", "Under 20"];
const allowedGenders = ["Male", "Female", "Mixed"];

const OFFICIAL_EVENTS = [
  {
    name: "Volleyball Boys",
    event_type: "Group Game",
    age_category: "Under 14",
    gender_category: "Male",
    scoring_mode: "position"
  },
  {
    name: "Volleyball Girls",
    event_type: "Group Game",
    age_category: "Under 14",
    gender_category: "Female",
    scoring_mode: "position"
  },
  {
    name: "Net Ball Girls",
    event_type: "Group Game",
    age_category: "Under 14",
    gender_category: "Female",
    scoring_mode: "position"
  },
  {
    name: "Cricket Boys",
    event_type: "Group Game",
    age_category: "Under 14",
    gender_category: "Male",
    scoring_mode: "position"
  },
  {
    name: "Cricket Girls",
    event_type: "Group Game",
    age_category: "Under 14",
    gender_category: "Female",
    scoring_mode: "position"
  },
  {
    name: "Ella Boys",
    event_type: "Group Game",
    age_category: "Under 14",
    gender_category: "Male",
    scoring_mode: "position"
  },
  {
    name: "Ella Girls",
    event_type: "Group Game",
    age_category: "Under 14",
    gender_category: "Female",
    scoring_mode: "position"
  },
  {
    name: "Football Boys",
    event_type: "Group Game",
    age_category: "Under 14",
    gender_category: "Male",
    scoring_mode: "position"
  },
  {
    name: "Carrom",
    event_type: "Group Game",
    age_category: "Under 14",
    gender_category: "Mixed",
    scoring_mode: "position"
  },
  {
    name: "Road Race",
    event_type: "Track",
    age_category: "Under 14",
    gender_category: "Male",
    scoring_mode: "position"
  }
];

function validateEventPayload(payload) {
  if (!allowedAges.includes(payload.age_category)) {
    throw Object.assign(new Error("Invalid age category"), { statusCode: 400 });
  }
  if (!allowedGenders.includes(payload.gender_category)) {
    throw Object.assign(new Error("Invalid gender category"), { statusCode: 400 });
  }

  const normalizedScoring = normalizeScoringMode(payload.scoring_mode);
  if (!normalizedScoring) {
    throw Object.assign(new Error("Invalid scoring mode"), { statusCode: 400 });
  }

  return normalizedScoring;
}

export async function createEvent(payload) {
  const normalizedScoring = validateEventPayload(payload);
  await assertStudentsExist(payload.participant_ids || []);

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const eventResult = await client.query(
      `
        INSERT INTO events (
          name, event_type, age_category, gender_category, scoring_mode, event_date
        ) VALUES ($1,$2,$3,$4,$5,$6)
        RETURNING *
      `,
      [
        payload.name,
        payload.event_type,
        payload.age_category,
        payload.gender_category,
        normalizedScoring,
        payload.event_date
      ]
    );

    const event = eventResult.rows[0];

    for (const studentId of payload.participant_ids || []) {
      await addParticipantToEvent(event.id, studentId, client);
    }

    await client.query("COMMIT");
    return {
      ...event,
      scoring_type: toUiScoringType(event.scoring_mode)
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function loadOfficialEvents() {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const defaultDate = new Date().toISOString().slice(0, 10);

    for (const event of OFFICIAL_EVENTS) {
      const existing = await client.query("SELECT id FROM events WHERE LOWER(name) = LOWER($1) LIMIT 1", [
        event.name
      ]);

      if (existing.rows[0]) {
        await client.query(
          `
            UPDATE events
            SET event_type = $1,
                age_category = $2,
                gender_category = $3,
                scoring_mode = $4,
                updated_at = NOW()
            WHERE id = $5
          `,
          [
            event.event_type,
            event.age_category,
            event.gender_category,
            event.scoring_mode,
            existing.rows[0].id
          ]
        );
      } else {
        await client.query(
          `
            INSERT INTO events (
              name, event_type, age_category, gender_category, scoring_mode, event_date
            ) VALUES ($1,$2,$3,$4,$5,$6)
          `,
          [
            event.name,
            event.event_type,
            event.age_category,
            event.gender_category,
            event.scoring_mode,
            defaultDate
          ]
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

  return listEvents();
}

export async function listEvents() {
  const result = await query(`
    SELECT
      e.*,
      COALESCE(ep.participant_count, 0) AS participant_count,
      CASE
        WHEN LOWER(e.name) = 'volleyball boys' THEN 1
        WHEN LOWER(e.name) = 'volleyball girls' THEN 2
        WHEN LOWER(e.name) = 'net ball girls' THEN 3
        WHEN LOWER(e.name) = 'cricket boys' THEN 4
        WHEN LOWER(e.name) = 'cricket girls' THEN 5
        WHEN LOWER(e.name) = 'ella boys' THEN 6
        WHEN LOWER(e.name) = 'ella girls' THEN 7
        WHEN LOWER(e.name) = 'football boys' THEN 8
        WHEN LOWER(e.name) = 'carrom' THEN 9
        WHEN LOWER(e.name) = 'road race' THEN 10
        ELSE 999
      END AS display_order
    FROM (${EventModel.baseSelect}) e
    LEFT JOIN (
      SELECT event_id, COUNT(*)::int AS participant_count
      FROM event_participants
      GROUP BY event_id
    ) ep ON ep.event_id = e.id
    ORDER BY
      CASE
        WHEN e.event_type = 'Group Game' THEN 1
        WHEN e.event_type = 'Track' THEN 2
        ELSE 3
      END,
      CASE WHEN LOWER(e.name) = 'road race' THEN 999 ELSE display_order END,
      e.event_date,
      e.name
  `);

  return result.rows.map((row) => ({
    ...row,
    scoring_type: toUiScoringType(row.scoring_mode)
  }));
}

export async function getEventParticipants(eventId) {
  const result = await query(
    `
      SELECT
        ep.id AS participant_id,
        ep.event_id,
        s.id AS student_db_id,
        s.student_id,
        s.name AS student_name,
        s.grade,
        s.division,
        h.name AS house,
        e.name AS event_name,
        ep.date_added
      FROM event_participants ep
      JOIN students s ON s.id = ep.student_id
      JOIN houses h ON h.id = s.house_id
      JOIN events e ON e.id = ep.event_id
      WHERE ep.event_id = $1
      ORDER BY s.name
    `,
    [eventId]
  );
  return result.rows;
}

export async function addParticipantToEvent(eventId, studentId, txClient = null) {
  const runner = txClient || { query };

  const eventResult = await runner.query("SELECT id FROM events WHERE id = $1", [eventId]);
  if (!eventResult.rows[0]) {
    throw Object.assign(new Error("Event not found"), { statusCode: 404 });
  }

  const studentResult = await runner.query("SELECT id FROM students WHERE id = $1", [studentId]);
  if (!studentResult.rows[0]) {
    throw Object.assign(new Error("Invalid student"), { statusCode: 400 });
  }

  try {
    const result = await runner.query(
      "INSERT INTO event_participants (event_id, student_id) VALUES ($1,$2) RETURNING id",
      [eventId, studentId]
    );
    return result.rows[0];
  } catch (error) {
    if (error.code === "23505") {
      throw Object.assign(new Error("Student is already registered for this event"), {
        statusCode: 409
      });
    }
    throw error;
  }
}

export async function removeParticipantFromEvent(eventId, participantId) {
  const result = await query(
    "DELETE FROM event_participants WHERE id = $1 AND event_id = $2 RETURNING id",
    [participantId, eventId]
  );

  if (!result.rows[0]) {
    throw Object.assign(new Error("Participant not found in this event"), { statusCode: 404 });
  }
}

export async function assertEventParticipant(eventId, studentId) {
  const result = await query("SELECT 1 FROM event_participants WHERE event_id = $1 AND student_id = $2", [
    eventId,
    studentId
  ]);

  if (!result.rows[0]) {
    throw Object.assign(new Error("Student is not registered for this event"), { statusCode: 400 });
  }
}

export async function getEventById(eventId) {
  const result = await query("SELECT * FROM events WHERE id = $1", [eventId]);
  if (!result.rows[0]) {
    throw Object.assign(new Error("Event not found"), { statusCode: 404 });
  }

  return {
    ...result.rows[0],
    scoring_type: toUiScoringType(result.rows[0].scoring_mode)
  };
}

export async function getDashboardMetrics() {
  const result = await query(`
    SELECT
      (SELECT COUNT(*)::int FROM students) AS total_students,
      (SELECT COUNT(*)::int FROM events) AS total_events,
      (SELECT COUNT(*)::int FROM event_participants) AS total_participants
  `);
  return result.rows[0];
}
