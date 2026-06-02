import "dotenv/config";
import { runScan } from "./scan-pipeline.js";

const target = process.argv[2] ?? "./demo-app";

const report = await runScan(target);
console.log(`Grade: ${report.grade} — open http://localhost:3333`);
