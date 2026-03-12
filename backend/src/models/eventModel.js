export const EventModel = {
  baseSelect: `
    SELECT
      e.id,
      e.name,
      e.event_type,
      e.age_category,
      e.gender_category,
      e.scoring_mode,
      e.event_date,
      e.status,
      e.created_at,
      e.updated_at,
      e.id AS event_id,
      e.name AS event_name,
      e.event_type AS category,
      e.gender_category AS gender,
      e.age_category AS age_group
    FROM events e
  `
};
