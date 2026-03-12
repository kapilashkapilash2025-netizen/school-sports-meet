export const AdminModel = {
  findByEmail: "SELECT id, email, password_hash, full_name FROM admins WHERE email = $1",
  all: `
    SELECT id, email, full_name, created_at
    FROM admins
    ORDER BY full_name, email
  `
};
