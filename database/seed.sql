INSERT INTO houses (code, name, color)
VALUES
  ('VALUVAR', 'Valuvar House', 'Red'),
  ('BARATHI', 'Barathi House', 'Yellow'),
  ('VIPULANTHAR', 'Vipulanthar House', 'Green'),
  ('NAVALAR', 'Navalar House', 'Blue')
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    color = EXCLUDED.color;

-- Password: Admin@123
INSERT INTO admins (email, password_hash, full_name)
VALUES (
  'admin@school.local',
  '$2a$10$KpVkU8IJ.OqoJB7pEXsruuaR5pUkSRgb7AYzOdPQmuvbe95Gz8fxK',
  'Sports Meet Administrator'
)
ON CONFLICT (email) DO NOTHING;
