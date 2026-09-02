# 🚀 Deployment Guide — Ajali!

Production architecture (all free tier, all sign-up-with-GitHub):

```
┌────────────┐   HTTPS   ┌──────────────────┐   SQL    ┌─────────────────┐
│  Netlify   │ ────────▶ │  Render web svc  │ ───────▶ │ Render Postgres │
│  (React    │  /api/v1  │  Flask + Gunicorn│          │   (ajali-db)    │
│   SPA)     │ ◀──────── │  gunicorn wsgi:app│         │                 │
└────────────┘   JSON    └──────────────────┘          └─────────────────┘
```

The repo ships ready for these hosts: `render.yaml` (backend + db blueprint),
`netlify.toml` + `frontend/public/_redirects` (frontend), `backend/wsgi.py`
(production entrypoint — creates tables on first boot).

---

## Part 1 — Database (Render PostgreSQL)

1. [render.com](https://render.com) → sign up **with GitHub**.
2. **New + → PostgreSQL** → Name `ajali-db` → region **Frankfurt** → **Free** → Create.
3. Wait for *Available*, then copy the **Internal Database URL** (starts `postgres://…`).
   - Our backend auto-converts `postgres://` → `postgresql+psycopg://`, paste as-is.

## Part 2 — Backend (Render web service)

**Option A — Blueprint (recommended):** **New + → Blueprint** → pick this repo →
Render reads `render.yaml` and provisions the service and database together.
Set `CORS_ORIGINS` when prompted (your Netlify URL from Part 3 — you can add it later).

**Option B — manual:** **New + → Web Service** → pick this repo, then:

| Setting | Value |
| ------- | ----- |
| Root Directory | `backend` |
| Runtime | Python 3 |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `gunicorn wsgi:app` |
| Instance Type | Free |
| Health Check Path | `/api/v1/health` |

Environment variables (Settings → Environment):

| Variable | Value |
| -------- | ----- |
| `FLASK_ENV` | `production` |
| `DATABASE_URL` | the Internal Database URL from Part 1 |
| `SECRET_KEY` | generate: `openssl rand -hex 32` |
| `JWT_SECRET_KEY` | generate: `openssl rand -hex 32` |
| `CORS_ORIGINS` | `https://<your-site>.netlify.app` (**https**, no trailing slash, no spaces) |

First boot creates all tables automatically (`backend/wsgi.py`). Then create the
admin account once — Render service → **Shell**:

```bash
flask --app run.py create-admin --username admin --email admin@ajali.go.ke --password 'PICK-A-STRONG-ONE'
```

Verify: open `https://<service>.onrender.com/api/v1/health` → `{"status":"ok"}`.

## Part 3 — Frontend (Netlify)

1. [netlify.com](https://netlify.com) → sign up **with GitHub** →
   **Add new site → Import an existing project** → pick this repo.
   Netlify auto-reads `netlify.toml` (base `frontend`, build `npm run build`,
   publish `dist`) — just confirm.
2. **Site settings → Environment variables**:

   | Variable | Value |
   | -------- | ----- |
   | `VITE_API_URL` | `https://<service>.onrender.com/api/v1` |
   | `VITE_GOOGLE_MAPS_KEY` | optional — without it the map shows a stylised preview |

   ⚠️ Vite bakes env vars **at build time** — after adding/changing them:
   **Deploys → Trigger deploy → Clear cache and deploy site.**

3. SPA redirects: `frontend/public/_redirects` ships with the repo, so /feed,
   /sos, /admin/login etc. survive refresh. (Vercel instead? Use the same env
   vars and add a rewrite `/(.*) → /index.html`.)

## Part 4 — Wire CORS + end-to-end check

1. Back on Render, set `CORS_ORIGINS=https://<your-site>.netlify.app` (the service
   restarts itself).
2. Full check on the live URL:
   - SOS page sends an alert with no login ✅
   - Register → login → report an incident ✅
   - `/admin/login` with the admin account → stats + triage ✅
   - Feed / map / detail all show real data ✅

---

## ⚠️ Free-tier gotchas (read before demo day!)

1. **Cold starts:** the free web service **sleeps after ~15 min idle** — first
   request can take 30–60 s. **Open the site 5 minutes before presenting** to
   wake it (any ping to `/api/v1/health` works).
2. **Uploaded media is ephemeral:** the free instance's disk is wiped on
   restart/redeploy, so previously uploaded photos/videos vanish (the incident
   records survive in Postgres). Upload demo evidence **after** the last
   redeploy, same session. Fixes if ever needed: Render paid disk, or S3/Cloudinary.
3. **Free Postgres expires:** Render free databases are reclaimed after ~30 days —
   take a `pg_dump` snapshot before any showcase beyond that.
4. **Secrets:** never reuse the dev `SECRET_KEY`/`JWT_SECRET_KEY` in production —
   generate fresh ones (the Blueprint does this automatically).
5. **CORS exactness:** `CORS_ORIGINS` must match the site URL exactly —
   `https`, no trailing slash, comma-separated for multiple origins.

## 🎬 Demo-day checklist

1. Warm the API: `curl https://<service>.onrender.com/api/v1/health` (~30 s first hit).
2. Admin account exists; a handful of realistic incidents + one SOS seeded.
3. Evidence photos uploaded **this session** (see gotcha 2).
4. Location permission granted in the browser you'll present from.
5. Phone hotspot ready as network backup.
```
