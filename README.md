# FieldTrack Backend — Node.js API

Complete REST API for the Hospital Care Calendar Automation system using Node.js, Express, Sequelize, and MySQL.

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
│   ├── admin.js               # Optional admin table
│   ├── organogram.js          # Existing organogram table for field users
│   ├── event.js               # Events table
│   └── eventAssignment.js     # User x Event x Month assignments
├── services/
│   ├── assignmentService.js   # Recurrence + carry-forward logic
│   ├── mailService.js         # Reminder email delivery
│   └── scheduler.js           # Monthly/Monday/Friday jobs
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
PORT=12000
BASE_PATH=/hospitalcare/calendar/automation

# Optional, required only for real emails
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
MAIL_FROM=
```

### 3. Sync database & seed default data
```bash
npm run sync-db
```
This will:
- Create missing Sequelize-managed tables (`events`, `event_assignments`, etc.)
- Keep the existing `organogram` table as the source of field users
- Create default admin seed if needed
- Auto-assign active events to active organogram users for the current month

If the project was already installed earlier, run the narrow schema update once:
```bash
npm run migrate-schema
```
This widens `events.assigned_to` and adds `organogram.region` only if needed.

### 4. Start the server
```bash
npm start          # production
npm run dev        # development with auto-reload
```

---

## API Reference

**Base URL:** `http://localhost:12000/hospitalcare/calendar/automation`

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

{ "username": "admin", "password": "admin" }
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
| GET | `/admin/tracking?month=5&year=2025&filter=all&level=all&search=` | Track all field users |
| GET | `/admin/incomplete?month=5&year=2025&filter=all` | View users with pending/overdue tasks |
| GET | `/admin/users?search=&level=all` | Field users directory |
| POST | `/admin/users` | Add a new field user |
| POST | `/admin/jobs/generate-assignments` | Manually generate current/monthly assignments and carry-forwards |
| POST | `/admin/jobs/send-reminders` | Manually send reminder emails for eligible pending events |

#### Create Event Body
```json
{
  "name": "New Safety Check",
  "description": "Monthly safety inspection",
  "type": "monthly",
  "date": null,
  "assigned_to": "BDM",
  "seven_day_reminder": false
}
```
Supported `type` values: `monthly`, `bi_monthly`, `quarterly`, `half_yearly`, `yearly`, `specific`.

For `type: "specific"` and date-based yearly events, provide `"date": "2026-06-15"`.

`assigned_to` can be `all`, `everyone`, `BDM`, `KAM`, `RM`, `ZM`, or comma-separated values. `BDM` maps to `BDM - Government Account`; `KAM` maps to `AM`/`KAM`.

#### Add Field User Body
```json
{
  "emp_name": "Priya Nair",
  "emailid": "priya.nair@company.com",
  "sap_code": "111367",
  "emp_code": "EMP101",
  "level": "AM",
  "region": "West",
  "division": "Hospital Care",
  "hq": "Mumbai",
  "mobileno": "9999999999",
  "rm_sapcode": "222222",
  "zm_sapcode": "333333"
}
```

---

### Field User Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/field/my-events?month=5&year=2025` | My events for the month |
| POST | `/field/complete` | Submit event completion with proof |
| GET | `/field/my-history` | My completion history |
| GET | `/field/reports?month=5&year=2025` | Hierarchy reports: ZM sees RM/AM, RM sees AM, field user sees self |

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
| `organogram` | Existing field employee profiles and hierarchy |
| `events` | Event definitions and recurrence |
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

- **Admin login**: Static credentials are `admin / admin`.
- **Field login**: Field users log in with `emailid` and `sap_code` from `organogram`.
- **Carry-forwards**: Missed recurring events are copied into the next month with `is_carry_forward: true`; if the current month also has a fresh due event, the user sees both tasks, so the count becomes 2.
- **Auto-assignment**: Dashboards, field screens, reports, and jobs call the same assignment service to create due tasks.
- **Hierarchy**: ZM sees users with matching `zm_sapcode`; RM sees users with matching `rm_sapcode`; AM/KAM/BDM users see their own data.
- **Scheduler**: Assignment generation runs at 00:15 on the first day of each month. Reminder emails run every Monday and Friday at 09:00.
- **Risk levels** (incomplete view): `high` = 3+ pending, `medium` = has carry-forward, `low` = otherwise
- **7-day reminder**: Specific and yearly date-based events become reminder-eligible from 7 days before their event date.
