---
name: Security Multi-Agent Demo — 20-Minute Phases
overview: Compressed Demo A build (~20 min). Sample-driven audit UI + PLAN + planted demo-app first; live multi-agent scan is stretch, not a gate.
parent: security-multi-agent-demo.md
timeBudgetMinutes: 20
isProject: false
---

# VibeGuard — 20-Minute Implementation Phases

**Parent plan:** [security-multi-agent-demo.md](./security-multi-agent-demo.md)  
**Full build phases:** [security-multi-agent-demo-phases.md](./security-multi-agent-demo-phases.md)

## 20-minute reality check

| Original | 20 min |
|-------------------|--------|
| 4× `Agent.prompt` + Orchestrator (minutes each) | **Too slow** to build and validate in one session |
| Full Next.js `demo-app` | **Vuln files only** (no `next dev` / install unless cached) |
| Blocking scan + pills + hero + findings + PLAN | **Yes**, hydrated from **committed sample JSON** |
| `npm run scan` with real agents | **Stretch** in last 2–3 min only |

### Demo A success in 20 minutes

Presenter opens UI → grade **F** + findings → **Generate fix PLAN** → **Copy for Cursor** → paste against `demo-app`.

**Live multi-agent scan is optional** for “done”; rehearse with **`public/audit-report.json`**.

---

## Phase overview

| Phase | Time | Focus | Validate (~) |
|-------|------|--------|----------------|
| **1** | 0–4 min | Server + types + **sample audit JSON** + bare UI | 20 s |
| **2** | 4–8 min | **`demo-app/` vuln stubs** (6 files) | 30 s |
| **3** | 8–13 min | **`plan.ts` + `POST /api/plan` + PLAN UI** | 45 s |
| **4** | 13–17 min | **Hero + findings + pills** (static / fake running) | 45 s |
| **5** | 17–20 min | **Scan button** (sample or stub) + **rehearse Demo A** | 2 min |

---

## Phase 1 — Shell + sample data (0–4 min)

### Goal

`npm run dev` on **3333** with UI that loads a credible audit from disk.

### Build

- Add **Hono**; `src/server.ts` — static `public/`, port **3333**.
- `src/types.ts` — `Finding`, `AuditReport`.
- **`public/audit-report.json`** — hand-authored:
  - Grade **F**
  - ≥5 findings aligned with [planted vulns](./security-multi-agent-demo.md#demo-app-vuln-checklist-6-planted)
  - `demoScript` (3 bullets), `topExploitChain`, `findingCount`
- `public/index.html` + `styles.css` + `app.js` — `fetch('/audit-report.json')` on load.
- Scripts: `"dev": "tsx src/server.ts"`, `"typecheck"`.

### Validate (~20 s)

```bash
npm run dev
# → http://localhost:3333 — grade + finding count visible
```

### Skip

`scan-pipeline.ts`, agents, `POST /api/scan`.

### Checklist

- [ ] Port **3333** serves static UI
- [ ] Sample JSON loads without API key
- [ ] Title **VibeGuard** in header

---

## Phase 2 — `demo-app` stubs (4–8 min)

### Goal

Files exist so findings paths and Cursor paste story match a real target repo.

### Build

| # | File |
|---|------|
| 1 | `demo-app/.env` (`sk-fake-…`) |
| 2 | `demo-app/app/page.tsx` (client token) |
| 3 | `demo-app/app/api/admin/route.ts` |
| 4 | `demo-app/app/api/notes/route.ts` |
| 5 | `demo-app/app/api/search/route.ts` |
| 6 | `demo-app/components/Note.tsx` |
| + | `demo-app/README.md` — *"Shipped in one Cursor session."* |

### Validate (~30 s)

```bash
test -f demo-app/.env && test -f demo-app/app/page.tsx
# … remaining paths
```

### Skip

`demo-app/package.json`, App Router layout, `next build`, `npm install` in `demo-app`.

### Checklist

- [ ] Six vuln files exist
- [ ] README one-liner present

---

## Phase 3 — Fix PLAN (8–13 min)

### Goal

Demo A “money” half — PLAN generation and copy without any scan.

### Build

- `src/plan.ts` — `buildFixPlan(report)`:
  - Time-box disclaimer (20–30 min) always on top
  - **Critical + high** only
  - **Max 5** tasks
  - Sort: severity (critical first), then file path ascending
- `POST /api/plan` → `{ plan: string }`
- UI: **Generate fix PLAN**, preview, **Copy for Cursor** (enabled when report loaded)

### Validate (~45 s)

1. Reload UI (sample JSON already loaded).
2. **Generate fix PLAN** → preview shows time-box + ≤5 tasks.
3. **Copy** → paste once in editor.

### Skip

Per-finding checkboxes, filter tabs, client-side plan duplication.

### Checklist

- [ ] `POST /api/plan` returns markdown
- [ ] Copy button works
- [ ] Task count ≤ 5; only critical/high severities

---

## Phase 4 — Audit UI polish (13–17 min)

### Goal

Presenter-ready layout for grade, narrative, and findings.

### Build

- Header: **VibeGuard** · **Security Audit**; target `./demo-app` (read-only); link to `demo-app/README.md`.
- Hero: grade badge, severity chips, executive summary, top exploit chain, demo script.
- Findings: cards (severity, title, `file:line`, evidence, exploit, fix hint); sort **critical → low**.
- Pills: four agents; on load set **done** with counts from JSON or hardcoded; on scan set **running** then **done** (no SSE).

### Validate (~45 s)

Refresh page → scroll one **critical** card → pills show green/done.

### Skip

`reportedBy`, `agentContributions` footer, filter tabs.

### Checklist

- [ ] Hero renders from sample JSON
- [ ] Findings sorted critical-first
- [ ] Pills reflect four agents

---

## Phase 5 — Scan wire + rehearsal (17–20 min)

### Goal

**Run security audit** completes a flow; rehearse Demo A once.

### Implementation options

| Option | Behavior | Use when |
|--------|----------|----------|
| **A (default)** | `POST /api/scan` returns committed sample (rewrite `audit-report.json`) | Always — fits 20 min |
| **B (stretch)** | `runScan()` calls **one** specialist + **deterministic merge** in TS (no Orchestrator LLM) | Phases 1–4 done by minute 17 |

### Build (minimum — Option A)

- `src/scan-pipeline.ts` — `runScan()` reads/returns sample structure; **409** if busy.
- **Run security audit** → blocking POST → re-render UI.
- `npm run scan` — same `runScan()`, writes `public/audit-report.json`, prints grade one-liner.

### Validate (~2 min) — Demo A once

1. Open `http://localhost:3333` — pills visible.
2. **Run security audit** → grade **F**, findings populate.
3. Call out **one critical** (e.g. `.env` or client token).
4. **Generate fix PLAN** → **Copy for Cursor** — *"Execute this remediation PLAN within the time box."*
5. Optional: refresh — audit still visible from JSON.

### Skip (entire 20-min budget)

SSE, `parse-agent-json`, retry prompts, Orchestrator LLM, `Promise.all` specialists.

### Checklist

- [ ] Scan button completes without error (sample path)
- [ ] Demo A rehearsed once in ~2 min
- [ ] `demo-app` path referenced in PLAN output

---

## Minute-by-minute cheat sheet

```
0–4   Hono, types, audit-report.json, index loads JSON
4–8   demo-app/ six vuln files + README
8–13  plan.ts, POST /api/plan, copy button
13–17 hero, findings, pills (done on load; fake running on scan)
17–20 POST /api/scan → sample, button works, Demo A once
```

---

## Success criteria (20-min scope)

- [ ] `npm run dev` → **3333**, UI branded **VibeGuard**
- [ ] Sample report shows **≥5/6** planted issues (by title/file)
- [ ] **Generate fix PLAN** + copy with time-box + ≤5 tasks
- [ ] `demo-app/` files exist for Cursor paste story
- [ ] Demo A rehearsed **once** in **~2 min** (sample-driven)
- [ ] Live agents: **not required** for “done”

---

## After the 20 minutes (follow-up session)

Use [60-minute phases](./security-multi-agent-demo-phases.md) Phases 3–4:

1. `secrets-scout` + `parse-agent-json`
2. `auth-guard`, `injection-hunter`
3. `Promise.all` + Orchestrator agent
4. Replace sample-only `POST /api/scan` with real `runScan()`

---

## Cut order (if behind at minute 15)

1. Drop pill animation — show all **done** immediately after scan.
2. Skip `npm run scan` CLI — UI-only demo.
3. Reduce sample findings to 5 cards (still hit ≥5/6 vulns).
4. Minimal CSS — system fonts, dark background only.

---

## Mapping to parent plan

| Parent item | 20-min phase |
|-------------|----------------|
| Audit UI (partial) | 1, 4 |
| `demo-app` vulns | 2 |
| `buildFixPlan` | 3 |
| `POST /api/scan` (real pipeline) | Stretch → follow-up |
| Committed `audit-report.json` | 1 (required, not optional) |
| Demo A rehearsal | 5 |
