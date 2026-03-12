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
  '$2a$10$KJvL5M9F9uY8SCvVgP95jOkKPNB9PK4E7h5f/qtAlyR9WCj5NAQ7C',
  'Sports Meet Administrator'
)
ON CONFLICT (email) DO NOTHING;
