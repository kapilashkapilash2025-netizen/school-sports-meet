export const HouseModel = {
  all: `
    SELECT
      h.id,
      h.code,
      h.name,
      h.color,
      COUNT(s.id)::int AS student_count
    FROM houses h
    LEFT JOIN students s ON s.house_id = h.id
    GROUP BY h.id, h.code, h.name, h.color
    ORDER BY h.name
  `
};
