export const StudentModel = {
  baseSelect: `
    SELECT s.*, h.name AS house_name, h.color AS house_color
    FROM students s
    JOIN houses h ON h.id = s.house_id
  `
};
