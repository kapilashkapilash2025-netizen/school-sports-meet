export const ResultModel = {
  baseSelect: `
    SELECT er.*, e.name AS event_name, s.student_id, s.name AS student_name, h.name AS house_name
    FROM event_results er
    JOIN events e ON e.id = er.event_id
    JOIN students s ON s.id = er.student_id
    JOIN houses h ON h.id = er.house_id
  `
};
