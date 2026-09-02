# 🚨 Ajali! — Kenya Emergency & Incident Reporting Portal

**Ajali!** (Swahili for *accident!*) is a localized emergency and incident-reporting
platform for Kenya. Citizens report accidents and emergencies with GPS locations
and photo/video evidence, responders triage and update investigations — and
**anyone, no account needed, can fire an anonymous SOS panic alert** that
instantly shares their live location.

---

## ✨ Features

- 🆘 **Anonymous SOS panic button** — no login required. Auto GPS lock, emergency
  categories (🚑 🚗 🔥 🚔 🌊), one-tap Kenyan emergency numbers (999 / 112 / 1199),
  optional situation note, 30 s anti-spam cooldown.
- 📢 **Citizen incident reporting** — red-flag / intervention reports with title,
  description, coordinates and media evidence (images & videos).
- 📡 **Live incident feed** — paginated, filterable by status and type.
- 🛡️ **Responder (admin) console** — dedicated admin login, incident statistics,
  and status management (`draft → under-investigation → resolved | rejected`).
- 🔐 **Full auth lifecycle** — register, login (JWT), forgot/reset password with
  short-lived signed tokens.
- 📚 **Versioned REST API** with a complete reference in
  [`docs/api.md`](docs/api.md).
- 🚀 **One-click deploys** — Render blueprint + Netlify config, with a full
  walkthrough in [`docs/deployment.md`](docs/deployment.md).

## 🧰 Tech stack

| Layer | Tech |
| ----- | ---- |
| Frontend | React 18, Vite, Redux Toolkit, React Router, Axios |
| Backend | Flask (blueprints + service layer), Flask-SQLAlchemy, Flask-JWT-Extended, Flask-Cors, Marshmallow |
| Database | PostgreSQL (production) · SQLite (local dev) |
| Tests | pytest (23 tests) · Jest + React Testing Library (43 tests) |

## 📁 Repository layout

```
backend/
  app/
    models/         SQLAlchemy models (User, Incident, Media)
    routes/         HTTP blueprints: auth, incidents, media, admin, sos
    services/       Business logic (AuthService, IncidentService, MediaService, SOSService)
    validation/     Marshmallow request schemas
    utils/          Responses, pagination, storage, decorators
  tests/            pytest endpoint & service suites
frontend/
  src/
    pages/          Splash, auth, LiveFeed, ReportIncident, IncidentDetail,
                    MapView, AdminDashboard, SOS panic flow
    components/     Cards, header/nav, map, route guards
    hooks/          API hooks (auth, incidents, media, geolocation, …)
    features/       Redux slices     api/  Axios client
docs/               api.md (full API reference), wireframes
```

## 🚀 Quick start (local development)

### 1. Backend — http://localhost:5000

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create a local `.env` (defaults target PostgreSQL; SQLite is easiest for dev):

```bash
cat > .env << 'EOF'
FLASK_ENV=development
DATABASE_URL=sqlite:///ajali_dev.db
CORS_ORIGINS=http://localhost:5173,http://localhost:5174
EOF
```

Create the tables, seed an admin, and run:

```bash
python -c "from run import app; from app.extensions import db; app.app_context().push(); db.create_all()"
flask --app run.py create-admin --username admin --email admin@ajali.go.ke --password adminpass123
python run.py
```

Health check: <http://localhost:5000/api/v1/health> → `{"status":"ok"}`

### 2. Frontend — http://localhost:5173

```bash
cd frontend
npm install
npm run dev
```

Open the printed URL (keep the backend running in a second terminal).

## 🎬 Demo walkthrough

1. **SOS (no login):** Splash → `⚠️ Emergency SOS` → allow location → pick a
   category → **PANIC** → confirmation with reference + call buttons.
2. **Citizen:** Register → verify → report an incident → see it in the live feed.
3. **Responder:** `/admin/login` with the admin account → dashboard stats →
   change report statuses (owner edits lock once a report leaves `draft`).
4. **Password reset:** Login → *Forgot password* → token link appears (dev mode)
   → set a new password and sign in with it.

## ⚙️ Environment variables (backend)

| Variable | Default | Purpose |
| -------- | ------- | ------- |
| `FLASK_ENV` | `development` | Flask environment |
| `DATABASE_URL` | Postgres URI | SQLAlchemy connection string (use `sqlite:///ajali_dev.db` for local dev) |
| `SECRET_KEY` / `JWT_SECRET_KEY` | dev values | **Change in production** |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated allowed frontend origins |
| `UPLOAD_FOLDER` | `uploads` | Media storage directory |

## ✅ Testing

```bash
# backend — endpoint + service suites
cd backend && .venv/bin/python -m pytest          # 23 passed

# frontend — hooks/components/app suites
cd frontend && npm test                            # 43 passed
```

## 🤝 Contributing

Feature branch → pull request with a *what/why/how* description → review → merge.
**If you change a route, update [`docs/api.md`](docs/api.md) in the same PR.**
