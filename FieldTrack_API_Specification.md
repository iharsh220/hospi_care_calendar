# FieldTrack — API Specification
**For backend developer reference · All endpoints return JSON**

---

## Base URL
```
{{base_url}}/hospitalcare/calendar/automation
```

---

## Authentication

### 1. Login — Field User
**POST** `/login`

**Request Body:**
```json
{
  "email": "ama.bdm.chandigarh@alembic.co.in",
  "sap_code": "111367"
}
```

**Expected Response:**
```json
{
  "success": true,
  "role": "field",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "Priya Nair",
    "email": "ama.bdm.chandigarh@alembic.co.in",
    "sap_code": "111367",
    "employee_id": "EMP-101",
    "zone": "North",
    "avatar_initials": "PN"
  }
}
```

---

### 2. Login — Admin
**POST** `/login`

**Request Body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Expected Response:**
```json
{
  "success": true,
  "role": "admin",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 0,
    "name": "Rajesh Kumar",
    "username": "admin",
    "avatar_initials": "RK"
  }
}
```

**Error Response (both login types):**
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

> All subsequent requests must include header:
> `Authorization: Bearer <token>`

---

## Admin APIs

### 3. Admin Dashboard Summary
**GET** `/admin/dashboard?month=5&year=2025`

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| month | int | 1–12 |
| year | int | e.g. 2025 |

**Expected Response:**
```json
{
  "success": true,
  "month_label": "May 2025",
  "total_field_users": 90,
  "total_active_events": 6,
  "stats": {
    "total_expected": 540,
    "completed": 382,
    "pending_overdue": 158,
    "carry_forwards": 23
  },
  "alerts": [
    {
      "type": "red",
      "message": "34 field users have not completed all required events for May."
    },
    {
      "type": "amber",
      "message": "23 carry-forwards are active this month."
    }
  ],
  "event_completion": [
    {
      "event_name": "Safety inspection",
      "type": "monthly",
      "completed": 72,
      "total": 90,
      "percent": 80
    },
    {
      "event_name": "Equipment maintenance",
      "type": "monthly",
      "completed": 81,
      "total": 90,
      "percent": 90
    },
    {
      "event_name": "Route compliance check",
      "type": "monthly",
      "completed": 68,
      "total": 90,
      "percent": 76
    },
    {
      "event_name": "Annual audit",
      "type": "specific",
      "completed": 90,
      "total": 90,
      "percent": 100
    },
    {
      "event_name": "Compliance review",
      "type": "specific",
      "completed": 31,
      "total": 90,
      "percent": 34
    },
    {
      "event_name": "Field site survey",
      "type": "specific",
      "completed": 40,
      "total": 90,
      "percent": 44
    }
  ],
  "zone_performance": [
    {
      "zone": "North",
      "total_users": 23,
      "avg_completion_percent": 71,
      "overdue_count": 7,
      "carry_forward_count": 6
    },
    {
      "zone": "South",
      "total_users": 22,
      "avg_completion_percent": 82,
      "overdue_count": 4,
      "carry_forward_count": 4
    },
    {
      "zone": "East",
      "total_users": 22,
      "avg_completion_percent": 64,
      "overdue_count": 12,
      "carry_forward_count": 8
    },
    {
      "zone": "West",
      "total_users": 23,
      "avg_completion_percent": 78,
      "overdue_count": 5,
      "carry_forward_count": 5
    }
  ]
}
```

---

### 4. Admin Calendar Events
**GET** `/admin/calendar?month=5&year=2025`

**Expected Response:**
```json
{
  "success": true,
  "month": 5,
  "year": 2025,
  "monthly_event_days": [1, 8, 15, 22],
  "reminder_window_days": [8, 9, 10, 11, 12, 13, 14, 16, 17, 18, 19, 20, 21, 23, 24, 25, 26, 27],
  "specific_events": [
    {
      "day": 15,
      "event_name": "Annual audit",
      "type": "specific"
    },
    {
      "day": 22,
      "event_name": "Compliance review",
      "type": "specific"
    },
    {
      "day": 28,
      "event_name": "Field site survey",
      "type": "specific"
    }
  ]
}
```

---

### 5. Admin — Manage Events (List)
**GET** `/admin/events`

**Expected Response:**
```json
{
  "success": true,
  "total": 6,
  "events": [
    {
      "id": 1,
      "name": "Safety inspection",
      "type": "monthly",
      "schedule": "Every month (open period)",
      "date": null,
      "seven_day_reminder": false,
      "assigned_to": "all",
      "assigned_label": "All 90 users"
    },
    {
      "id": 2,
      "name": "Equipment maintenance log",
      "type": "monthly",
      "schedule": "Every month (open period)",
      "date": null,
      "seven_day_reminder": false,
      "assigned_to": "all",
      "assigned_label": "All 90 users"
    },
    {
      "id": 3,
      "name": "Route compliance check",
      "type": "monthly",
      "schedule": "Every month (open period)",
      "date": null,
      "seven_day_reminder": false,
      "assigned_to": "all",
      "assigned_label": "All 90 users"
    },
    {
      "id": 4,
      "name": "Annual audit",
      "type": "specific",
      "schedule": null,
      "date": "2025-05-15",
      "seven_day_reminder": true,
      "assigned_to": "all",
      "assigned_label": "All 90 users"
    },
    {
      "id": 5,
      "name": "Compliance review",
      "type": "specific",
      "schedule": null,
      "date": "2025-05-22",
      "seven_day_reminder": true,
      "assigned_to": "all",
      "assigned_label": "All 90 users"
    },
    {
      "id": 6,
      "name": "Field site survey",
      "type": "specific",
      "schedule": null,
      "date": "2025-05-28",
      "seven_day_reminder": true,
      "assigned_to": "all",
      "assigned_label": "All 90 users"
    }
  ]
}
```

---

### 6. Admin — Add Event
**POST** `/admin/events`

**Request Body:**
```json
{
  "name": "New event name",
  "description": "Brief description of the activity",
  "type": "monthly",
  "date": null,
  "assigned_to": "all",
  "seven_day_reminder": false
}
```
> `type` is `"monthly"` or `"specific"`. If `"specific"`, `date` must be `"YYYY-MM-DD"`. `assigned_to` is `"all"` or a zone name like `"North"`.

**Expected Response:**
```json
{
  "success": true,
  "message": "Event created successfully",
  "event_id": 7
}
```

---

### 7. Admin — Edit Event
**PUT** `/admin/events/{event_id}`

**Request Body:** (same structure as Add Event)

**Expected Response:**
```json
{
  "success": true,
  "message": "Event updated successfully"
}
```

---

### 8. Admin — Tracking (All Field Users)
**GET** `/admin/tracking?month=5&year=2025&search=&filter=all&zone=all`

**Query Params:**
| Param | Type | Values |
|-------|------|--------|
| month | int | 1–12 |
| year | int | e.g. 2025 |
| search | string | name or zone search |
| filter | string | `all`, `complete`, `incomplete`, `carry` |
| zone | string | `all`, `North`, `South`, `East`, `West` |

**Expected Response:**
```json
{
  "success": true,
  "total_users": 90,
  "shown": 90,
  "month_label": "May 2025",
  "summary": {
    "fully_complete": 56,
    "behind_incomplete": 34,
    "carry_forwards": 23
  },
  "users": [
    {
      "id": 1,
      "name": "Priya Nair",
      "employee_id": "EMP-101",
      "zone": "North",
      "email": "priya.nair@company.com",
      "completed": 4,
      "pending": 2,
      "total_events": 6,
      "completion_percent": 67,
      "has_carry_forward": true,
      "last_active": "May 3",
      "status": "carry"
    }
  ]
}
```

> `status` values: `"complete"`, `"incomplete"`, `"carry"`

---

### 9. Admin — Incomplete / Overdue Users
**GET** `/admin/incomplete?month=5&year=2025&search=&filter=all`

**Query Params:**
| Param | Type | Values |
|-------|------|--------|
| filter | string | `all`, `carry`, `high` |

**Expected Response:**
```json
{
  "success": true,
  "total_requiring_attention": 34,
  "month_label": "May 2025",
  "users": [
    {
      "id": 1,
      "name": "Priya Nair",
      "zone": "North",
      "pending_count": 2,
      "has_carry_forward": true,
      "risk_level": "medium",
      "last_active": "May 3"
    }
  ]
}
```

> `risk_level` values: `"low"`, `"medium"`, `"high"`
> Rule: `high` = 3+ pending; `medium` = has carry-forward; `low` = otherwise

---

### 10. Admin — Field Users Directory
**GET** `/admin/users?search=&zone=all`

**Expected Response:**
```json
{
  "success": true,
  "total": 90,
  "users": [
    {
      "id": 1,
      "name": "Priya Nair",
      "employee_id": "EMP-101",
      "zone": "North",
      "email": "priya.nair@company.com",
      "completion_percent": 67,
      "last_active": "May 3",
      "status": "carry"
    }
  ]
}
```

---

### 11. Admin — Add Field User
**POST** `/admin/users`

**Request Body:**
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

**Expected Response:**
```json
{
  "success": true,
  "message": "User added successfully",
  "user_id": 91
}
```

---

## Field User APIs

### 12. Field — My Events (Current Month)
**GET** `/field/my-events?month=5&year=2025`

> Auth token identifies the user — no user_id needed in query.

**Expected Response:**
```json
{
  "success": true,
  "user": {
    "name": "Priya Nair",
    "zone": "North"
  },
  "month_label": "May 2025",
  "alerts": [
    {
      "type": "amber",
      "message": "Carry-forward active. You did not complete Safety inspection in April. It has been added to your May tasks."
    },
    {
      "type": "blue",
      "message": "Compliance review is scheduled for 22 May — 7 days away. An email reminder has been sent."
    }
  ],
  "sidebar_status": {
    "done": 3,
    "pending": 2,
    "completion_percent": 60,
    "has_carry_forward": true
  },
  "events": [
    {
      "id": 101,
      "name": "Safety inspection",
      "description": "Carry-forward from April — complete anytime in May",
      "type": "monthly",
      "status": "carry",
      "due_date": null
    },
    {
      "id": 102,
      "name": "Safety inspection",
      "description": "Regular May task — due anytime this month",
      "type": "monthly",
      "status": "pending",
      "due_date": null
    },
    {
      "id": 103,
      "name": "Equipment maintenance log",
      "description": "Completed on 3 May 2025",
      "type": "monthly",
      "status": "done",
      "due_date": null,
      "completed_on": "2025-05-03"
    },
    {
      "id": 104,
      "name": "Route compliance check",
      "description": "Due anytime in May 2025",
      "type": "monthly",
      "status": "pending",
      "due_date": null
    },
    {
      "id": 105,
      "name": "Annual audit",
      "description": "Completed on 15 May 2025",
      "type": "specific",
      "status": "done",
      "due_date": "2025-05-15",
      "completed_on": "2025-05-15"
    },
    {
      "id": 106,
      "name": "Compliance review",
      "description": "Due: 22 May 2025 · 7-day reminder sent",
      "type": "specific",
      "status": "remind",
      "due_date": "2025-05-22"
    },
    {
      "id": 107,
      "name": "Field site survey",
      "description": "Due: 28 May 2025 · upcoming",
      "type": "specific",
      "status": "upcoming",
      "due_date": "2025-05-28"
    }
  ]
}
```

> `status` values: `"pending"`, `"done"`, `"carry"`, `"remind"`, `"upcoming"`

---

### 13. Field — Submit Event Completion
**POST** `/field/complete`

**Request:** `multipart/form-data`
| Field | Type | Description |
|-------|------|-------------|
| event_id | int | The event assignment ID |
| completed_on | string | `"YYYY-MM-DD"` |
| notes | string | Optional notes |
| proof_image | file | JPG, PNG or PDF, max 10 MB |

**Expected Response:**
```json
{
  "success": true,
  "message": "Event marked as complete successfully"
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Proof image is required"
}
```

---

### 14. Field — My History
**GET** `/field/my-history`

**Expected Response:**
```json
{
  "success": true,
  "user": {
    "name": "Priya Nair"
  },
  "history": [
    {
      "event_name": "Safety inspection",
      "type": "monthly",
      "month_label": "Mar 2025",
      "completed_on": "2025-03-12",
      "status": "done",
      "proof_image_url": "https://cdn.example.com/proofs/123.jpg"
    },
    {
      "event_name": "Safety inspection",
      "type": "monthly",
      "month_label": "Apr 2025",
      "completed_on": null,
      "status": "carry",
      "proof_image_url": null
    }
  ]
}
```

> `status` values: `"done"`, `"carry"` (missed, rolled over)

---

## Summary Table

| # | Method | Endpoint | Who |
|---|--------|----------|-----|
| 1 | POST | `/login` (field user) | Public |
| 2 | POST | `/login` (admin) | Public |
| 3 | GET | `/admin/dashboard` | Admin |
| 4 | GET | `/admin/calendar` | Admin |
| 5 | GET | `/admin/events` | Admin |
| 6 | POST | `/admin/events` | Admin |
| 7 | PUT | `/admin/events/{id}` | Admin |
| 8 | GET | `/admin/tracking` | Admin |
| 9 | GET | `/admin/incomplete` | Admin |
| 10 | GET | `/admin/users` | Admin |
| 11 | POST | `/admin/users` | Admin |
| 12 | GET | `/field/my-events` | Field |
| 13 | POST | `/field/complete` | Field |
| 14 | GET | `/field/my-history` | Field |

---

*All protected endpoints require `Authorization: Bearer <token>` header.*
*Token is returned on successful login.*
