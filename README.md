# FieldTrack Backend — Setup Guide

## Stack
- **Node.js** (ES Modules) · **Express** · **Sequelize** · **MySQL** · **node-cron** · **nodemailer**

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
Edit `.env` with your SMTP credentials (DB credentials are pre-filled):
```
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your_email@gmail.com
MAIL_PASS=your_app_password        # Gmail: use App Password, not account password
```

### 3. Start server
```bash
node server.js
# or for dev with auto-reload:
npx nodemon server.js
```

Server starts at: `http://localhost:12000/hospitalcare/calendar/automation`

---

## Database Tables Created Automatically
The server auto-creates two new tables on first run (existing `organogram` table is untouched):

| Table | Purpose |
|---|---|
| `ft_events` | Admin-created events (monthly/bi-monthly/quarterly/half-yearly/yearly) |
| `ft_event_assignments` | Per-user per-period assignment records with status and proof |

---

## API Summary

### Base URL
```
http://localhost:12000/hospitalcare/calendar/automation
```

### Authentication
All protected endpoints require:
```
Authorization: Bearer <token>
```

### Endpoints

| # | Method | Path | Role |
|---|--------|------|------|
| 1 | POST | `/login` | Public |
| 2 | GET | `/admin/dashboard?month=&year=` | Admin |
| 3 | GET | `/admin/calendar?month=&year=` | Admin |
| 4 | GET | `/admin/events` | Admin |
| 5 | POST | `/admin/events` | Admin |
| 6 | PUT | `/admin/events/:id` | Admin |
| 7 | DELETE | `/admin/events/:id` | Admin |
| 8 | GET | `/admin/tracking?month=&year=&search=&filter=&region=` | Admin |
| 9 | GET | `/admin/incomplete?month=&year=&filter=` | Admin |
| 10 | GET | `/admin/users?search=&region=` | Admin |
| 11 | POST | `/admin/users` | Admin |
| 12 | GET | `/field/my-events?month=&year=` | Field |
| 13 | POST | `/field/complete` (multipart) | Field |
| 14 | GET | `/field/my-history` | Field |
| 15 | GET | `/field/team-tracking?month=&year=` | Field (ZM/RM/AM) |
| 16 | GET | `/health` | Public |

---

## Login Credentials

### Admin
```json
{ "username": "admin", "password": "admin" }
```

### Field User
```json
{ "email": "<emailid from organogram>", "sap_code": "<sap_code from organogram>" }
```

---

## Level / Role Mapping (organogram.level field)

| organogram.level | FieldTrack role | assigned_to value |
|---|---|---|
| `BDM - Government Account` | BDM | `BDM` |
| `AM` | KAM (Key Account Manager) | `KAM` |
| `RM` | Regional Manager | `RM` |
| `ZM` | Zonal Manager | `ZM` |

---

## Event Frequency Options

| Value | Description | Email reminder |
|---|---|---|
| `monthly` | Every month | Every Monday & Friday |
| `bi-monthly` | Every 2 months (Jan, Mar, May…) | Every Monday & Friday |
| `quarterly` | Every 3 months (Jan, Apr, Jul, Oct) | Every Monday & Friday |
| `half-yearly` | Jan & Jul | Every Monday & Friday |
| `yearly` | One-time specific date | 7 days before event date |

---

## Hierarchical Data Access (Team Tracking)

- **ZM** → can see all RMs and AMs under their `zm_sapcode`
- **RM** → can see all AMs where `rm_sapcode = RM's sap_code`
- **AM** → can see BDMs where `am_sapcode = AM's sap_code`

Call: `GET /field/team-tracking?month=5&year=2025`

---

## Carry-Forward Logic

If a field user does **not** complete a recurring event (monthly/bi-monthly/quarterly/half-yearly) by end of month:
1. On the **1st of the next month**, the cron job runs `processCarryForwards()`
2. A new `EventAssignment` row is created for the new month with `is_carry_forward: true`
3. A carry-forward email is automatically sent to the user
4. The user now sees **2 rows** for that event: the carry + the new month's regular one

---

## Email Schedule

| Schedule | What |
|---|---|
| Every **Monday & Friday** at 8 AM | Recurring event reminders (pending/carry assignments) |
| **Daily** at 9 AM | 7-day advance reminder for yearly events |
| **1st of every month** at midnight | Generate new assignments + carry-forward processing |

---

## Proof Image Upload
- `POST /field/complete` — `multipart/form-data`
- Field: `proof_image` (JPG, PNG, or PDF, max 10 MB)
- Stored in `./uploads/` directory
- Accessible at: `http://localhost:12000/uploads/<filename>`

---

## Postman Collection
Import `FieldTrack_API.postman_collection.json` into Postman.

Variable `base_url` defaults to `http://localhost:12000`.

After running "Login – Admin", the `{{token}}` variable is auto-set.  
After running "Login – Field User", the `{{field_token}}` variable is auto-set.
