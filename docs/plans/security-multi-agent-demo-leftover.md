---
name: VibeGuard — Leftover Work
overview: What remains after the 20-minute build and Phase 3–4 agent wiring. Use this as the checklist for demo-ready polish and post-hackathon ideas.
parent: security-multi-agent-demo.md
related:
  - security-multi-agent-demo-phases-20min.md
  - security-multi-agent-demo-phases.md
isProject: false
---

# VibeGuard — Leftover Plan

**Status snapshot:** The **20-minute Demo A** path is built. **60-minute Phases 1–6** are largely done in code; **Phase 7 (rehearsal + live validation)** and a few polish items remain.

---

## Done (no need to rebuild)

| Area | What exists |
|------|-------------|
| **Shell** | Hono on **3333**, `src/types.ts`, static `public/` |
| **Sample audit** | `public/audit-report.json` (grade F, 6 findings) |
| **UI** | `index.html`, `styles.css`, `app.js` — hero, findings, pills, PLAN + copy |
| **demo-app** | 6 planted vuln stubs + `README.md` |
| **PLAN** | `src/plan.ts`, `POST /api/plan` |
| **Specialists** | `src/prompts/{secrets,auth,injection}.ts`, `src/specialists.ts` |
| **JSON plumbing** | `src/parse-agent-json.ts` (fence strip + one retry) |
| **Pipeline** | `Promise.all` specialists → Orchestrator → write JSON; deterministic merge fallback |
| **CLI** | `npm run dev`, `npm run scan`, `npm run scan -- --sample` |
| **API errors** | 409 busy, 502 partial, 503 startup (server) |

---

## Left — prioritized

### P0 — Demo-ready (do before presenting)

| # | Task | Why | Validate |
|---|------|-----|----------|
| 1 | **Run one full live scan** with `CURSOR_API_KEY` | Confirms agents + orchestrator end-to-end | `npm run scan` → new `public/audit-report.json`; grade + ≥5/6 planted vulns by file/title |
| 2 | **Rehearse Demo A once** (~2–3 min) | Parent success criterion | UI load → scan → one critical callout → PLAN → copy → paste narrative for `demo-app` |
| 3 | **UI error handling** for 502/503 on scan | Live scan can fail; UI today only handles 409 | `app.js`: show `error` / `partial` from failed `POST /api/scan` |
| 4 | **Refresh committed sample** (optional) | Offline rehearsal matches live output | After a good live run, copy `audit-report.json` into git if findings are stable |

### P1 — Polish (nice for judges, not blocking)

| # | Task | Notes |
|---|------|--------|
| 5 | **Blocking scan UX** | Disable scan button + visible “Scanning…” state for entire live request (minutes); pills can stay on fake animation until SSE exists |
| 6 | **Pill counts from live response** | After scan, pills already use `agentContributions` from report — verify counts match specialist output (not hardcoded fallbacks in `animateScanPills`) |
| 7 | **Root README** | Short “Demo A” section: `npm run dev`, `npm run scan`, `.env` setup, `--sample` fallback |
| 8 | **Parse fixture smoke test** | Phase 3 checklist: unit test or script that runs `stripJsonFences` + `parseAgentJson` on a fenced `AgentReport` string (no API key) |
| 9 | **Server port conflict** | Document or handle `EADDRINUSE` on 3333 (kill existing process before `npm run dev`) |

### P2 — Stretch (parent plan “add if ahead”)

| # | Task | Effort |
|---|------|--------|
| 10 | **SSE** `GET /api/scan/events` | Wire `onProgress` in `runScan` to EventSource; replace fake pill timing in `app.js` |
| 11 | **`agentContributions` footer** | Small UI section listing per-agent counts |
| 12 | **Download PLAN** | Button → `fix-plan.md` blob download |
| 13 | **Prompt tuning** | If live scan misses planted vulns, tighten specialist prompts (file paths, severity) |
| 14 | **Orchestrator strict mode** | Flag to fail instead of deterministic merge when orchestrator JSON fails |

---

## Left — explicit non-goals (post-hackathon)

From [parent plan](./security-multi-agent-demo.md#post-hackathon-explicitly-not-in-the-hour):

- Demo B — `demo-app-safe/` before/after
- Demo C — “also reported by” on overlapping findings
- Demo D — CI / GitHub Action slide
- Fourth specialist (dependencies)
- Orchestrator-enhanced PLAN (extra LLM call)
- WebSocket transport; React/Vite UI; cloud runtime
- `demo-app` full Next.js install / `next build` (vuln stubs only today)

---

## Phase mapping (60-minute plan)

| Phase | Status |
|-------|--------|
| 1 Shell | ✅ Done |
| 2 demo-app | ✅ Done |
| 3 Specialists + JSON | ✅ Code done; ⬜ fixture smoke test optional |
| 4 Full pipeline | ✅ Wired; ⬜ live E2E validation |
| 5 Audit UI | ✅ Done (20-min); ⬜ 502/503 + long-scan spinner |
| 6 PLAN | ✅ Done |
| 7 Sample + rehearsal | ⬜ Rehearse Demo A ×1–2; confirm live scan with API key |

---

## Suggested session order (~30–45 min)

```
1. npm run scan                    # live — fix prompts if <5/6 vulns
2. npm run dev                     # rehearse Demo A in browser
3. app.js — 502/503 + scan spinner # P0/P1
4. README + optional fixture test  # P1
5. SSE / footer                    # only if time
```

---

## Success criteria (remaining checkboxes)

- [ ] Live `npm run scan` completes with API key (not `--sample`)
- [ ] ≥5 of 6 planted vulns appear in live `findings` (by `demo-app/...` path)
- [ ] Demo A rehearsed under **3 minutes**
- [ ] UI shows a clear message when scan returns 502/503
- [ ] (Stretch) SSE or committed sample refreshed from last good live run

---

## Quick commands

```bash
# Offline / no API key
npm run scan -- --sample
npm run dev

# Live multi-agent (slow)
npm run scan
# → http://localhost:3333

# Free port 3333 if needed
kill $(lsof -t -i :3333) 2>/dev/null; npm run dev
```
