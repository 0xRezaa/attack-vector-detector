import "dotenv/config";
import { logScanProgress } from "./scan-log.js";
import {
  runScan,
  ScanBusyError,
  ScanPartialFailureError,
  ScanStartupFailureError,
} from "./scan-pipeline.js";

const args = process.argv.slice(2);
const sample = args.includes("--sample");
const target = args.find((a) => !a.startsWith("-")) ?? "./demo-app";

console.log(
  sample
    ? "Loading sample audit report (no agents)…"
    : `Running live scan on ${target} (3 specialists in parallel)…`,
);

try {
  const report = await runScan(target, { sample, onProgress: logScanProgress });
  console.log(`Grade: ${report.grade} — open http://localhost:3333`);
  console.log(
    `Findings: ${report.findings.length} (critical=${report.findingCount.critical}, high=${report.findingCount.high})`,
  );
  console.log("Report saved to public/audit-report.json");
} catch (err) {
  if (err instanceof ScanBusyError) {
    console.error(err.message);
    process.exit(1);
  }
  if (err instanceof ScanStartupFailureError) {
    console.error("Startup failed:", err.message);
    process.exit(3);
  }
  if (err instanceof ScanPartialFailureError) {
    console.error(err.message);
    console.error(JSON.stringify(err.partial, null, 2));
    process.exit(2);
  }
  throw err;
}
