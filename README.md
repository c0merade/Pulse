# Pulse — Picsart Academy Quality OS

Production-ready quality survey, AI comment clustering, trend analysis, and verified issue tracking platform built for **Picsart Academy**.

## Key Capabilities
- **Role-Based Access Control (`/login`)**: Signed `HTTP-only` sessions with `scrypt` password hashing for **Director**, **Edu Lead**, **Admin Lead**, and **Lecturer** (lecturers automatically see only their own cohorts).
- **Survey Scheduling & Automated Reminders (`/surveys`)**: Recurring survey waves with target response rates, reminder cadences, and automatic stop once target turnout is met.
- **Anonymous Student Survey Form (`/s/[token]`)**: Passwordless unique invite links track *who* responded (to stop reminders) while storing ratings and comments anonymously, protected by rate limiting and Zod validation.
- **AI Theme Extraction & Summarization (`/surveys/[id]`)**: Clusters student comments into themes with mention counts, sentiment, severity, and quotes using **Gemini (`gemini-3.8-flash` / `gemini-3.8-flash-lite`)** with an automatic **Smart Fallback Analyzer**.
- **Trend Analysis & Automatic Drop Flags (`/`, `/surveys/[id]`)**: Compares each wave against the previous wave for the same cohort, flags drops `>= 0.4` points, and optionally dispatches **Slack** leadership alerts.
- **Issue Tracker & Next-Wave Verification (`/issues`)**: Turn AI themes into owned issues (`Edu Lead`, `Admin Lead`, `Director`) with due dates, overdue flags, and `VERIFIED` status linked to follow-up survey waves.
- **Fair Group & Lecturer Comparison (`/compare`)**: Displays sample size (`n`), turnout `%`, trend momentum, and **Low Sample** fairness guardrails (`n < 5` or `< 50%` turnout).
- **Academy Cohort Management & Platform Sync API (`/groups`)**: Full CRUD for groups & students, **Bulk CSV Import**, and idempotent REST sync endpoints (`/api/v1/sync/groups`, `/api/v1/sync/students`) secured by `x-api-key`.
- **Leadership Meeting Brief & Audit Log (`/reports`, `/audit`)**: One-click **Print/PDF**, **Markdown (`.md`)**, and **CSV** exports for leadership syncs, plus an immutable audit trail.
- **Automated Cron & Healthcheck (`/api/cron/run`, `/api/health`)**: Protected cron cycle that transitions survey statuses, sends Resend/simulated email reminders, runs Auto-AI analysis, and notifies Slack on score drops.

## Quick Start (Local)

```bash
npm install
cp .env.example .env
npx prisma db push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo Accounts (Password: `pulse123`)
| Role | Email | Scope |
|---|---|---|
| Director | `director@picsart.academy` | Full Academy access |
| Edu Lead | `edu@picsart.academy` | Full Academy access |
| Admin Lead | `admin@picsart.academy` | Full Academy access |
| Lecturer | `ani.h@picsart.academy` | Own cohort only (`Frontend-24`) |

### Testing & Production Build
```bash
npm test       # Run Vitest suite
npm run build  # Production Next.js build
```

### Docker Deployment
```bash
docker compose up --build -d
```
Healthcheck endpoint: `GET /api/health`.
