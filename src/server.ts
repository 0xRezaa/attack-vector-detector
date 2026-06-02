import "dotenv/config";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { buildFixPlan } from "./plan.js";
import { ScanBusyError, runScan } from "./scan-pipeline.js";
import type { AuditReport } from "./types.js";

const app = new Hono();

app.get("/demo-app/README.md", async (c) => {
  const text = await readFile(join(process.cwd(), "demo-app", "README.md"), "utf-8");
  return c.text(text, 200, { "Content-Type": "text/plain; charset=utf-8" });
});

app.post("/api/scan", async (c) => {
  let body: { target?: string } = {};
  try {
    body = await c.req.json<{ target?: string }>();
  } catch {
    body = {};
  }

  const target = body.target ?? "./demo-app";

  try {
    const report = await runScan(target);
    return c.json(report);
  } catch (err) {
    if (err instanceof ScanBusyError) {
      return c.json({ error: err.message }, 409);
    }
    throw err;
  }
});

app.post("/api/plan", async (c) => {
  const body = await c.req.json<{ auditReport: AuditReport }>();
  const plan = buildFixPlan(body.auditReport);
  return c.json({ plan });
});

app.use("/*", serveStatic({ root: "./public" }));

serve(
  {
    fetch: app.fetch,
    port: 3333,
  },
  (info) => {
    console.log(`VibeGuard listening on http://localhost:${info.port}`);
  },
);
