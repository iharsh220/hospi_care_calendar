# FieldTrack Backend — Node.js API

Complete REST API for the FieldTrack Hospital Care Calendar Automation system.

---

## Project Structure

```
fieldtrack/
├── server.js                  # Entry point
├── .env                       # Environment config
├── package.json
├── config/
│   └── database.js            # Sequelize + MySQL config
├── models/
│   ├── index.js               # Model loader + associations
│   ├── Admin.js               # Admin table
│   ├── FieldUser.js           # Field users table
│   ├── Event.js               # Events table
│   └── EventAssignment.js     # User × Event × Month assignments
├── middlewares/
│   ├── auth.js                # JWT auth + role guards
│   └── upload.js              # Multer file upload
├── controllers/
│   ├── authController.js      # Login (admin + field)
│   ├── adminController.js     # All 9 admin endpoints
│   └── fieldController.js     # All 3 field endpoints
├── routes/
│   ├── auth.js
│   ├── admin.js
│   └── field.js
├── scripts/
│   └── syncDb.js              # DB sync + seed
└── uploads/                   # Proof images stored here
```

---

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
Edit `.env` if needed (credentials are pre-filled):
```
DB_HOST=alembicdigilabs.in
DB_USER=alembicdigilabs_codelab
DB_PASSWORD=alembiccodelab
DB_NAME=alembicdigilabs_hospital_care_automation
JWT_SECRET=fieldtrack_jwt_secret_2025_alembic
PORT=3000
```

### 3. Sync database & seed default data
```bash
npm run sync-db
```
This will:
- Create all tables (admins, field_users, events, event_assignments)
- Create default admin: `admin / admin123`
- Create 4 sample field users
- Create 6 default events (3 monthly + 3 specific)
- Auto-assign all events to all users for the current month

### 4. Start the server
```bash
npm start          # production
npm run dev        # development with auto-reload
```

---

## API Reference

**Base URL:** `http://localhost:3000/hospitalcare/calendar/automation`

All protected routes require:
```
Authorization: Bearer <token>
```

---

### Authentication (Public)

#### Login — Admin
```
POST /login
Content-Type: application/json

{ "username": "admin", "password": "admin123" }
```

#### Login — Field User
```
POST /login
Content-Type: application/json

{ "email": "ama.bdm.chandigarh@alembic.co.in", "sap_code": "111367" }
```

---

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/dashboard?month=5&year=2025` | Summary stats, alerts, event completion, zone performance |
| GET | `/admin/calendar?month=5&year=2025` | Monthly/specific event calendar data |
| GET | `/admin/events` | List all active events |
| POST | `/admin/events` | Create a new event |
| PUT | `/admin/events/:event_id` | Edit an event |
| GET | `/admin/tracking?month=5&year=2025&filter=all&zone=all&search=` | Track all field users |
| GET | `/admin/incomplete?month=5&year=2025&filter=all` | View users with pending/overdue tasks |
| GET | `/admin/users?search=&zone=all` | Field users directory |
| POST | `/admin/users` | Add a new field user |

#### Create Event Body
```json
{
  "name": "New Safety Check",
  "description": "Monthly safety inspection",
  "type": "monthly",
  "date": null,
  "assigned_to": "all",
  "seven_day_reminder": false
}
```
> For `type: "specific"`, provide `"date": "2025-06-15"`
> `assigned_to`: `"all"` or zone like `"North"`, `"South"`, `"East"`, `"West"`

#### Add Field User Body
```json
{
  "first_name": "Priya",
  "last_name": "Nair",
  "email": "priya.nair@company.com",
  "sap_code": "111367",
  "zone": "North",
  "employee_id": "EMP-101",
  "mobile": "+91 99999 99999"
}
```

---

### Field User Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/field/my-events?month=5&year=2025` | My events for the month |
| POST | `/field/complete` | Submit event completion with proof |
| GET | `/field/my-history` | My completion history |

#### Submit Completion (multipart/form-data)
```
POST /field/complete
Content-Type: multipart/form-data

event_id     = 101
completed_on = 2025-05-19
notes        = Completed successfully
proof_image  = <file: JPG/PNG/PDF, max 10MB>
```

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `admins` | Admin login accounts |
| `field_users` | Field employee profiles |
| `events` | Event definitions (monthly / specific-date) |
| `event_assignments` | Per-user per-month event tracking with status |

### Event Assignment Status Values
| Status | Meaning |
|--------|---------|
| `pending` | Not yet done, no special state |
| `done` | Completed with proof |
| `carry` | Rolled over from prior month |
| `remind` | Specific event within 7 days |
| `upcoming` | Specific event more than 7 days away |

---

## Key Business Logic

- **Carry-forwards**: When a monthly event is not completed by month-end, a new `EventAssignment` is created in the next month with `is_carry_forward: true`
- **Auto-assignment**: When a new event is created, it is automatically assigned to all matching users for the current month
- **New user onboarding**: When a field user is added, all currently active events are automatically assigned to them
- **Risk levels** (incomplete view): `high` = 3+ pending, `medium` = has carry-forward, `low` = otherwise
- **7-day reminder**: Specific events within 7 days get `status: "remind"` and show a blue alert to the field user
