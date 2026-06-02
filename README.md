# VibeGuard

Multi-agent security audit demo for a vulnerable Next.js sample app (`demo-app/`). Three specialist agents (secrets, auth, injection) scan in parallel; an orchestrator merges findings into a graded audit report and fix PLAN.

## Demo A (quick start)

**Offline / no API key** — uses the committed sample report:

```bash
npm install
npm run scan -- --sample   # copies sample into public/audit-report.json
npm run dev                # http://localhost:3333
```

**Live multi-agent scan** — requires a Cursor API key (slow, ~2–5 min):

```bash
cp .env.example .env       # set CURSOR_API_KEY=cursor_...
npm run scan               # runs specialists + orchestrator, writes audit-report.json
npm run dev
```

In the UI: review findings → call out one critical issue → **Generate fix PLAN** → **Copy for Cursor** → paste into `demo-app`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Hono server + static UI on port **3333** |
| `npm run scan` | Live multi-agent scan of `./demo-app` |
| `npm run scan -- --sample` | Offline sample report (no API key) |
| `npm run test:parse` | Smoke test for JSON fence stripping / parsing |
| `npm run typecheck` | TypeScript check |

## Port conflict

If `npm run dev` fails with `EADDRINUSE`:

```bash
kill $(lsof -t -i :3333) 2>/dev/null
npm run dev
```

## Project layout

- `demo-app/` — intentionally vulnerable stubs (6 planted issues)
- `public/` — audit UI (`index.html`, `app.js`) + `audit-report.json`
- `src/` — scan pipeline, specialist prompts, PLAN builder, API server
