# Ajali! API Reference (v1)

Base URL (development): `http://localhost:5000/api/v1`

Ajali! is a Kenyan incident-reporting platform. Citizens report accidents and
emergencies (with GPS coordinates and photo/video evidence), responders review
and update investigation statuses, and **anyone — no account needed — can fire
an anonymous SOS panic alert** that instantly shares their live location.

- All requests and responses use JSON (`Content-Type: application/json`), except
  media upload which is `multipart/form-data`.
- All timestamps are ISO-8601 UTC (e.g. `2026-08-31T12:34:56.789012`).
- The API is versioned under `/api/v1`. There is no trailing slash on endpoints.

---

## 1. Response envelope

Every endpoint returns the same envelope.

**Success**

```json
{
  "status": "success",
  "message": "Incident reported successfully.",
  "data": { }
}
```

List endpoints additionally include pagination info under **both** `meta` and
`pagination` keys (identical content, kept for client compatibility):

```json
{
  "status": "success",
  "data": { "incidents": [] },
  "meta": {
    "page": 1,
    "per_page": 10,
    "total": 42,
    "pages": 5,
    "has_next": true,
    "has_prev": false,
    "has_previous": false
  }
}
```

(The same object is also returned under `pagination`.)

**Error**

```json
{
  "status": "error",
  "message": "Validation failed.",
  "errors": {
    "title": ["Length must be between 5 and 200."]
  }
}
```

`errors` (field → list of messages) is present on validation failures (400).

### HTTP status codes used

| Code | Meaning | Typical causes |
| ---- | ------- | -------------- |
| 200 | OK | Read / update / login succeeded |
| 201 | Created | Register, incident created, media uploaded, SOS filed |
| 400 | Validation failed | Bad/missing fields, invalid enum, bad coordinates |
| 401 | Unauthorized | Bad credentials, missing/expired access token |
| 403 | Forbidden | Valid token, wrong role or not the resource owner |
| 404 | Not found | Wrong id, unknown route |
| 409 | Conflict | Duplicate username/email, editing a report already under review |
| 413 | Too large | Upload body over the 100 MB cap |
| 422 | Unprocessable | Malformed JWT |
| 429 | Too many requests | SOS cooldown (30 s per device) |

---

## 2. Authentication

Authentication uses **JWT access tokens** (Bearer).

```
Authorization: Bearer <access_token>
```

- Tokens expire after **2 hours**. An expired token returns
  `401 {"message": "Access token has expired."}` — log in again.
- The token carries a `role` claim: `citizen` or `admin`.
- If your role changes, log out and back in to refresh the claim.
- Public endpoints (no token): incident list/detail, media list/file, SOS,
  emergency numbers, health, register, login, forgot/reset password.

### Roles

| Role | Can do |
| ---- | ------ |
| `citizen` (default) | Create reports, edit/delete own reports **while `draft`**, attach/remove media on own draft reports |
| `admin` | Everything citizens can, plus change any incident status, view stats, delete any media |

Create an admin account from the backend folder:

```bash
flask --app run.py create-admin --username admin --email admin@ajali.go.ke --password <min-8-chars>
```

---

## 3. Enums and validation rules

| Field | Allowed values |
| ----- | -------------- |
| `incident_type` | `red-flag`, `intervention`, `sos` |
| `status` | `draft`, `under-investigation`, `rejected`, `resolved` |
| SOS `category` | `ambulance`, `accident`, `fire`, `crime`, `flood`, `other` |

Field rules:

| Field | Rule |
| ----- | ---- |
| username | 3–50 chars, letters/numbers/underscore |
| email | valid email, unique, case-insensitive |
| password | 8–128 chars |
| title | 5–200 chars |
| description | 5–5000 chars |
| latitude | number, −90…90 (always sent together with longitude) |
| longitude | number, −180…180 |
| media file | images `png, jpg, jpeg, gif, webp` ≤ 5 MB · videos `mp4, mov, avi, webm` ≤ 50 MB |

**Concurrency rule:** a report's content is editable by its **owner only**, and only
while its status is `draft`. Once an admin moves it to `under-investigation`,
`rejected` or `resolved`, owner edits return `403 Forbidden`. Deletion is
allowed for the owner — and **admins may delete any report**, in any status
(added so responders can remove spam/abuse).

---

## 4. Health

### `GET /api/v1/health` — *public*

Liveness check used to confirm the server is up.

**200**

```json
{ "status": "ok", "service": "ajali-backend" }
```

---

## 5. Auth endpoints — `/api/v1/auth`

### `POST /auth/register` — *public*

```json
{ "username": "wanjiku", "email": "wanjiku@example.com", "password": "password123" }
```

**201**

```json
{
  "status": "success",
  "message": "Account created.",
  "data": {
    "id": "c76d…", "username": "wanjiku", "email": "wanjiku@example.com",
    "role": "citizen", "created_at": "…", "updated_at": "…"
  }
}
```

Errors: `400` missing fields / short password · `409` username or email already exists.

### `POST /auth/login` — *public*

`identifier` may be the email **or** username:

```json
{ "email": "wanjiku@example.com", "password": "password123" }
```

**200**

```json
{
  "status": "success",
  "message": "Signed in.",
  "data": {
    "access_token": "eyJhbGciOi…",
    "user": { "id": "c76d…", "username": "wanjiku", "role": "citizen" }
  }
}
```

Errors: `401` invalid credentials.

### `POST /auth/forgot-password` — *public*

```json
{ "email": "wanjiku@example.com" }
```

**200**

```json
{
  "status": "success",
  "message": "Password reset instructions have been generated.",
  "data": { "reset_token": "eyJhbGciOi…" }
}
```

> Demo note: there is no email service yet, so the token is returned directly in
> the response. In production it would be emailed/SMS'd and never exposed here.
> Reset tokens are signed JWTs valid for **15 minutes**.
>
> Privacy note: for **unknown emails** the endpoint still returns `200` with the
> generic message *"If an account with that email exists, password reset
> instructions have been generated."* and **no** `reset_token` — so the API can't
> be used to probe which emails are registered.

Errors: `400` email missing.

### `POST /auth/reset-password` — *public*

```json
{ "token": "Ga4aPDF2pfMs…", "password": "brand-new-pass123" }
```

**200** — `{ "status": "success", "message": "Password updated. You can now log in with your new password." }`

The token is single-use (cleared on success). Errors: `400` invalid token or short password.

---

## 6. SOS panic alerts — `/api/v1` — **no login required**

### `POST /sos` — *public, anonymous*

Files an emergency alert **in seconds without an account** — the panic-button
endpoint behind the app's SOS screen. The report is stored as an incident with
`incident_type: "sos"`, status `under-investigation` (immediately visible to
responders) and `author_id: null`.

```json
{
  "category": "accident",
  "description": "Boda rider down, conscious (optional)",
  "latitude": -1.2921,
  "longitude": 36.8219
}
```

- `category` is required (see enums).
- `description` optional (≤ 1000 chars); a default message is generated from the
  category when omitted.
- `latitude`/`longitude` optional but **must be sent together**; omit them when
  GPS is unavailable.
- `location_name` optional human-readable place name.

**201**

```json
{
  "status": "success",
  "message": "SOS alert sent. Emergency responders can see it now.",
  "data": {
    "incident": {
      "id": "9f1e…",
      "title": "SOS - Road Accident",
      "description": "Boda rider down, conscious (optional)",
      "incident_type": "sos",
      "status": "under-investigation",
      "latitude": -1.2921,
      "longitude": 36.8219,
      "author_id": null,
      "created_at": "…"
    }
  }
}
```

Errors: `400` invalid category / half coordinates · **`429` cooldown** — one SOS
per device per 30 seconds:

```json
{ "status": "error", "message": "SOS alert already sent. Please wait 24s before sending another." }
```

### `GET /sos/numbers` — *public*

Kenyan emergency lines rendered by the panic screen (call buttons).

**200**

```json
{
  "status": "success",
  "data": {
    "numbers": [
      { "label": "National Police Service", "number": "999" },
      { "label": "Emergency (all services)", "number": "112" },
      { "label": "Police (alternative)", "number": "911" },
      { "label": "Kenya Red Cross Ambulance", "number": "1199" },
      { "label": "GBV National Helpline", "number": "1195" }
    ]
  }
}
```

---

## 7. Incident endpoints — `/api/v1/incidents`

### `GET /incidents` — *public*

Paginated list, newest first.

Query parameters (all optional):

| Param | Rule |
| ----- | ---- |
| `page` | integer ≥ 1 (default 1) |
| `per_page` | 1–100 (default 10) |
| `incident_type` | filter by type enum |
| `status` | filter by status enum |

**200** — `{ "data": { "incidents": [ … ] }, "meta": { … }, "pagination": { … } }`

Each incident summary:

```json
{
  "id": "9f1e…",
  "title": "Lorry overturned",
  "description": "…",
  "incident_type": "red-flag",
  "type": "red-flag",
  "status": "draft",
  "location_name": "Thika Road",
  "location": "Thika Road",
  "latitude": -1.221,
  "longitude": 36.885,
  "author_id": "c76d…",
  "author": "wanjiku",
  "reporter": "wanjiku",
  "author_email": "wanjiku@example.com",
  "reporter_email": "wanjiku@example.com",
  "media": [ { "id": "…", "media_type": "image", "file_name": "scene.png", "url": "…" } ],
  "created_at": "…",
  "updated_at": "…"
}
```

> 🔒 **Privacy rule:** `author_email`/`reporter_email` are only included when the
> request carries a **valid admin token** (they power the admin dashboard's
> reporter column/filter). Anonymous and citizen callers never receive them;
> SOS alerts never carry an author identity in the first place.

### `GET /incidents/<id>` — *public*

Full incident including the media array (`media: [ {…} ]`, oldest first).

Errors: `404` unknown id.

### `POST /incidents` — 🔒 token

```json
{
  "title": "Lorry overturned",
  "description": "Lorry overturned near the flyover, one lane blocked.",
  "incident_type": "red-flag",
  "latitude": -1.221,
  "longitude": 36.885,
  "location_name": "Thika Road (optional)"
}
```

- New incidents start as `status: "draft"`.

**201** — `{ "data": { "incident": { … "media": [] } }, "message": "Incident reported successfully." }`

Errors: `400` validation · `401` no/invalid token.

### `PATCH /incidents/<id>` — 🔒 owner (draft only)

Partial update; any of `title`, `description`, `incident_type`, `location_name`,
`latitude`, `longitude` (at least one field):

```json
{ "description": "Updated: both lanes now blocked." }
```

**200** — full incident.

Errors: `403` not the owner **or** no longer a draft · `404` unknown id.

### `PATCH /incidents/<id>/location` — 🔒 owner (draft only)

```json
{ "latitude": -1.3, "longitude": 36.9, "location_name": "Nyayo Stadium" }
```

**200** — full incident with updated coordinates.

### `DELETE /incidents/<id>` — 🔒 owner · admin (any status)

Deletes the report **and all its media files** (disks and rows).

**200** — `{ "status": "success", "message": "Incident report deleted." }`

---

## 8. Media endpoints — `/api/v1`

### `POST /incidents/<id>/media` — 🔒 owner (draft only)

`multipart/form-data`:

| Part | Required | Notes |
| ---- | -------- | ----- |
| `file` | yes | the image/video (see media rules table) |
| `caption` | no | ≤ 255 chars |

Files are stored under `uploads/<incident_id>/<uuid>.<ext>`.

**201**

```json
{
  "status": "success",
  "message": "Media uploaded.",
  "data": {
    "media": {
      "id": 7,
      "incident_id": "9f1e…",
      "media_type": "image",
      "file_name": "evidence.jpg",
      "file_path": "9f1e…/ab12cd.jpg",
      "mime_type": "image/jpeg",
      "file_size": 10231,
      "caption": "Photo from roadside",
      "url": "/api/v1/media/7/file",
      "created_at": "…"
    }
  }
}
```

Errors: `400` no file / unsupported extension / over size limit · `403` not the
owner · `409` incident no longer a draft · `413` request over 100 MB.

### `GET /incidents/<id>/media` — *public*

**200** — `{ "data": { "media": [ … ] } }` (oldest first).

### `GET /media/<media_id>/file` — *public*

Streams the raw file with the stored MIME type (use as `<img src>` / `<video src>`).

### `DELETE /media/<media_id>` — 🔒 owner (draft only)

Removes the file and its row. **200** — `"Media deleted."`

---

## 9. Admin endpoints — `/api/v1/admin`

### `POST /admin/login` — *public*

Same payload/response as citizen login, but restricted to admins:

- Valid admin credentials → **200** `{ data: { access_token, user(role: "admin") } }`
- Valid **citizen** credentials → **401** with the generic
  `"Invalid email/username or password."` — the endpoint does not reveal
  whether the account exists.
- Bad credentials → `401`

### `GET /admin/stats` — 🔒 admin token

Incident counts for the dashboard:

```json
{
  "status": "success",
  "data": {
    "total": 12,
    "draft": 3,
    "pending": 3,
    "under_investigation": 5,
    "resolved": 3,
    "rejected": 1,
    "total_users": 7
  }
}
```

(`pending` mirrors `draft` for the dashboard chips; `total_users` counts
registered accounts.)

### `GET /admin/users` — 🔒 admin token

Every registered account, newest first, with report counts:

```json
{
  "status": "success",
  "data": {
    "users": [
      {
        "id": "c76d…",
        "username": "wanjiku",
        "email": "wanjiku@example.com",
        "role": "user",
        "created_at": "…",
        "reports_count": 3
      }
    ],
    "total": 7
  }
}
```


### `PATCH /admin/incidents/<id>/status` — 🔒 admin token

```json
{ "status": "under-investigation" }
```

`status` must be one of the status enums. **200** — full updated incident.
Changing away from `draft` locks the report for its owner (409 rule).

---

## 10. Quick start with curl

```bash
BASE=http://localhost:5000/api/v1

# health
curl $BASE/health

# register + login
curl -X POST $BASE/auth/register -H 'Content-Type: application/json' \
  -d '{"username":"wanjiku","email":"wanjiku@example.com","password":"password123"}'
TOKEN=$(curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"wanjiku@example.com","password":"password123"}' | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['access_token'])")

# report an incident
curl -X POST $BASE/incidents -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"Lorry overturned","description":"Lorry overturned near the flyover.","incident_type":"red-flag","latitude":-1.221,"longitude":36.885}'

# browse the feed
curl "$BASE/incidents?page=1&per_page=10"

# anonymous SOS (no token!)
curl -X POST $BASE/sos -H 'Content-Type: application/json' \
  -d '{"category":"accident","latitude":-1.2921,"longitude":36.8219}'

# admin login + stats (after `flask --app run.py create-admin ...`)
ATOKEN=$(curl -s -X POST $BASE/admin/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@ajali.go.ke","password":"<admin-password>"}' | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['access_token'])")
curl $BASE/admin/stats -H "Authorization: Bearer $ATOKEN"
```

---

*Documented against the implementation on `master` (SOS merge, PR #44).
If you change a route, update this file in the same PR.*
