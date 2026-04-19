# ORS Report Suite

A full-stack ministry reporting platform that transforms raw CSV exports from church management software into structured, graded health reports — used weekly in production by organizational staff.

Built with **Next.js 14 · TypeScript · Supabase · Tailwind CSS**.

---

## Screenshots

> Add screenshots here after first deploy — `![Regional View](docs/regional.png)`

---

## What it does

Church operations teams export attendance and follow-up data as CSVs each week. This platform ingests those files, resolves data conflicts, computes health metrics, and renders print-ready reports across three modules:

| Module | Input | Output |
|---|---|---|
| **Follow-Up** | Notes CSV | Subgroup & regional health reports with reach %, grade, and leader breakdown |
| **First Timers** | Cell FT CSV + Service FT CSV | Per-source and combined first-timer counts by subgroup and group |
| **Weekly Attendance** | Attendance CSV | Group-level attendance with expected vs. present tracking |

---

## Key features

- **Google OAuth** via Supabase — data is scoped per user, groups persist across sessions
- **CSV conflict resolution** — when the same person appears in both Cell and Service CSVs, the UI surfaces each duplicate and lets the user choose: count as Cell only, Service only, or both
- **Weighted health scoring** — each subgroup receives a letter grade (A–F) computed from reach ratio (75% weight) and mobilization ratio (25% weight)
- **Regional + subgroup views** — toggle between a single-row-per-subgroup overview table and a deep-dive subgroup card with fellowship detail and leader rankings
- **Session persistence** — parsed reports survive page reloads; data clears only on "New Upload" or sign-out
- **Meeting Attendance tracker** — per-subgroup expected vs. attended inputs compute Reach %, Mobilization %, and Adjusted Base without touching Supabase
- **Print / PDF export** — one-click print layout hides nav chrome and renders clean report pages

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Auth & DB | Supabase (Google OAuth, Postgres) |
| Styling | Tailwind CSS + CSS custom properties |
| CSV parsing | PapaParse |
| Icons | Lucide React |
| Deployment | Vercel |

---

## Architecture

```
app/
├── layout.tsx              # Root layout
├── page.tsx                # Entry → ClientApp → AppShell
└── auth/callback/          # Supabase OAuth callback handler

components/
├── AppShell.tsx            # Auth gate, top nav, module routing
├── fts/                    # First Timers module
│   ├── FTShell.tsx         # Upload → parse → report state machine
│   ├── FTUploadPanel.tsx   # Drag-and-drop CSV upload zones
│   └── FTReportPanel.tsx   # Tabbed report: Cell / Service / Overall / Attendance
├── followup/               # Follow-Up module
│   ├── FollowUpShell.tsx
│   ├── FollowUpUploadPanel.tsx
│   └── FollowUpReportPanel.tsx
├── attendance/             # Weekly Attendance module
└── views/
    ├── SubgroupView.tsx    # Shared subgroup detail card
    ├── RegionalView.tsx    # Follow-Up regional summary table
    └── FTRegionalView.tsx  # FT regional table (Cell | Service | Total)

lib/
├── parsers.ts              # CSV row normalization, date range extraction
├── compute-reports.ts      # computeSubgroupReport() — core aggregation logic
├── scoring.ts              # gradeScore(), healthBand(), mobilizationRatio()
├── group-store.ts          # Supabase group CRUD + in-memory directory builder
├── csv-parser.ts           # PapaParse wrapper + column validators
├── subgroup-aliases.ts     # Canonical subgroup name normalization
└── report-session-storage.ts  # sessionStorage persistence for parsed reports
```

---

## Data pipeline

```
CSV Upload
    │
    ▼
parseCSVFile()          ← PapaParse + header validation
    │
    ▼
parseFTRows() / aggregateNotes()   ← normalize rows into typed structures
    │
    ▼
buildAllFTData()        ← merge Cell + Service, detect conflicts
    │
    ▼
Conflict Resolution UI  ← user resolves duplicate names (if any)
    │
    ▼
computeSubgroupReport() ← join with group directory, compute ratios
    │
    ▼
gradeScore()            ← weighted score → letter grade + colour band
    │
    ▼
Report UI               ← SubgroupView / RegionalView / FTRegionalView
```

---

## Scoring algorithm

```ts
// Reach ratio: unique people contacted / adjusted member base
reachRatio = uniquePeople / adjustedMembers

// Mobilization ratio: groups that submitted notes / total groups
mobilizationRatio = activeGroups / totalGroups

// Weighted composite score (0–100)
score = (reachRatio * 0.75 + mobilizationRatio * 0.25) * 100

// Grade bands
A  ≥ 80    (green)
B  ≥ 65    (teal)
C  ≥ 50    (yellow)
D  ≥ 35    (orange)
F  <  35   (red)
```

---

## Getting started

### Prerequisites

- Node.js 18+
- A Supabase project with Google OAuth enabled

### 1 — Clone and install

```bash
git clone https://github.com/your-username/ors-reports-suite.git
cd ors-reports-suite
npm install
```

### 2 — Environment variables

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3 — Supabase setup

In your Supabase project:

1. **Authentication → Providers** — enable Google OAuth, add your client ID and secret
2. **Authentication → URL Configuration** — add `http://localhost:3000/auth/callback` to allowed redirect URLs
3. Run the SQL migration in `supabase/migrations/` to create the groups table (if present)

### 4 — Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deployment (Vercel)

```bash
npm run build      # verify no TypeScript errors
git push origin main
```

Vercel auto-deploys on push. Set the same environment variables in **Vercel Dashboard → Settings → Environment Variables**.

Add your production URL to Supabase's allowed redirect URLs:
`https://your-app.vercel.app/auth/callback`

---

## CSV format

### Follow-Up Notes CSV

| Column | Description |
|---|---|
| `Category` | Subgroup name (e.g. `BLW Canada Central SGA`) |
| `Group` | Cell group name |
| `Leader` | Note author |
| `People Contacted` | Comma-separated names |
| `Date` | ISO date string |

### First-Timers CSV (Cell and Service)

| Column | Description |
|---|---|
| `First Name` / `Last Name` | Person's name |
| `Group` | Cell group or service zone |
| `Subgroup` / `Category` | Subgroup name |
| `Date` | Visit date |

---

## Project status

Active — deployed and used in weekly production reporting cycles.

---

## License

Private / organizational use. Contact the repository owner for licensing questions.