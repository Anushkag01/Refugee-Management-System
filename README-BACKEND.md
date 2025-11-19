RMS Demo Backend

This is a minimal Express server that demonstrates how to persist users to a MySQL database using the schema in `test.sql`.

Setup
1. Copy `.env.example` to `.env` and set your MySQL credentials and DB name (the SQL schema from `test.sql` should be applied to the DB first).

2. Install dependencies:

   npm install

3. Start the server:

   npm start

Endpoints
- POST /api/signup
  - Body: JSON with { username, password, role, ...profileFields }
  - Creates profile row and a Users row (password is hashed)

- POST /api/login
  - Body: { username, password }
  - Returns { success: true, user: { user_id, username, role, volunteer_id?, refugee_id?, donor_id? } }

Notes
- This is a demo server. In production you'd add validation, rate limiting, HTTPS, CSRF protections, stronger password policies, email verification, etc.
