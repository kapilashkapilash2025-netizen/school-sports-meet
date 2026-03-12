# School Sports Meet Management System

Production-ready full-stack system for school administrators.

## Stack
- Frontend: React + Vite
- Backend: Node.js + Express
- Database: PostgreSQL

## Project Structure

```text
/frontend
/backend
/database
  schema.sql
  seed.sql
  /migrations
    001_student_id_format.sql
/backend/src
  /controllers
  /models
  /routes
  /services
  /middleware
  /config
  /utils
```

## Implemented Modules
- Admin authentication with protected session
- Student management and automatic student ID generation (`S0001B`, `S0001G`)
- House assignment integrity
- Event management with flexible scoring types (Rank, Points, Win/Loss/Draw)
- Event participation system`n- Flexible scoring entry behavior by scoring type
- Results and leaderboard

## Event participation system`n- Flexible scoring entry behavior by scoring type (New)
- Real-time student search by ID or name (`/api/students?search=`)
- Add student to any event (`POST /api/events/:id/participants`)
- Duplicate protection for same student + same event
- Event participant list with remove action
- Student profile view with joined events and result/points history

## Database Setup
1. Create DB: `school_sports_meet`
2. Run [`database/schema.sql`](./database/schema.sql)
3. Run [`database/seed.sql`](./database/seed.sql)

For existing databases, run migration:
- [`database/migrations/001_student_id_format.sql`](./database/migrations/001_student_id_format.sql)

## API Endpoints

### Students
- `GET /api/students?search=`
- `GET /api/students/detect/:studentId`
- `GET /api/students/profile/:id`
- `GET /api/students/house/:houseCode`
- `POST /api/students`
- `PUT /api/students/:id`
- `DELETE /api/students/:id`

### Events
- `GET /api/events`
- `POST /api/events`
- `GET /api/events/:id/participants`
- `POST /api/events/:id/participants`
- `DELETE /api/events/:id/participants/:participantId`

### Results
- `POST /api/results`
- `GET /api/results/summary`
- `GET /api/results/event/:eventId`
- `GET /api/results/student/:studentId`
- `GET /api/results/house/:houseId`

### Leaderboard
- `GET /api/leaderboard`
- `GET /api/leaderboard/champion`

## Sample: Create Student API
```json
{
  "name": "Kapilash",
  "date_of_birth": "2011-04-12",
  "gender": "Male",
  "student_number": "SN-1001",
  "birth_certificate_number": "BC-1001",
  "nic_number": null,
  "grade": "11",
  "division": "A",
  "house": "VALUVAR"
}
```

`student_id` is generated automatically and cannot be user-edited.

