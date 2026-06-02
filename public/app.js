const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
const AGENT_ORDER = [
  "secrets-scout",
  "auth-guard",
  "injection-hunter",
  "orchestrator",
];

/** @type {import('../src/types.js').AuditReport | null} */
let currentReport = null;
let planText = "";

const $ = (sel) => document.querySelector(sel);

function sortFindings(findings) {
  return [...findings].sort((a, b) => {
    const d = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    return d !== 0 ? d : a.file.localeCompare(b.file);
  });
}

function setPill(agent, state, label) {
  const pill = document.querySelector(`.pill[data-agent="${agent}"]`);
  if (!pill) return;
  pill.dataset.state = state;
  pill.querySelector(".pill-status").textContent = label;
}

function setPillsDone(contributions) {
  for (const agent of AGENT_ORDER) {
    const count = contributions[agent] ?? 0;
    setPill(agent, "done", `done · ${count}`);
  }
}

function setPillsIdle() {
  for (const agent of AGENT_ORDER) {
    setPill(agent, "idle", "idle");
  }
}

function setPillsScanning() {
  for (const agent of AGENT_ORDER) {
    setPill(agent, "running", "running…");
  }
}

function setScanStatus(message) {
  const el = $("#scan-status");
  if (!message) {
    el.textContent = "";
    el.classList.add("hidden");
    return;
  }
  el.textContent = message;
  el.classList.remove("hidden");
}

function renderSeverityChips(counts) {
  const el = $("#severity-chips");
  el.innerHTML = "";
  for (const [sev, n] of Object.entries(counts)) {
    if (!n) continue;
    const chip = document.createElement("span");
    chip.className = `chip chip-${sev}`;
    chip.textContent = `${n} ${sev}`;
    el.appendChild(chip);
  }
}

function renderHero(report) {
  $("#grade-badge").textContent = report.grade;
  renderSeverityChips(report.findingCount);
  $("#summary").textContent = report.summary;
  $("#exploit-chain").textContent = report.topExploitChain;
  const scriptEl = $("#demo-script");
  scriptEl.innerHTML = "";
  for (const step of report.demoScript) {
    const li = document.createElement("li");
    li.textContent = step;
    scriptEl.appendChild(li);
  }
  $("#hero").classList.remove("hidden");
}

function renderFindings(report) {
  const list = $("#findings-list");
  list.innerHTML = "";
  for (const f of sortFindings(report.findings)) {
    const card = document.createElement("article");
    card.className = "finding-card";
    card.dataset.severity = f.severity;
    const loc = f.line ? `${f.file}:${f.line}` : f.file;
    card.innerHTML = `
      <div class="finding-header">
        <span class="severity-badge ${f.severity}">${f.severity}</span>
        <h3 class="finding-title">${escapeHtml(f.title)}</h3>
      </div>
      <div class="finding-location">${escapeHtml(loc)}</div>
      <p class="finding-detail"><strong>Evidence:</strong> ${escapeHtml(f.evidence)}</p>
      <p class="finding-detail"><strong>Exploit:</strong> ${escapeHtml(f.exploitScenario)}</p>
      <p class="finding-detail"><strong>Fix:</strong> ${escapeHtml(f.fixHint)}</p>
    `;
    list.appendChild(card);
  }
  $("#findings-section").classList.remove("hidden");
}

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderReport(report) {
  currentReport = report;
  planText = "";
  $("#plan-preview").classList.add("hidden");
  $("#plan-preview").textContent = "";
  $("#copy-btn").disabled = true;
  $("#plan-btn").disabled = false;
  renderHero(report);
  renderFindings(report);
  setPillsDone(report.agentContributions ?? {});
}

async function loadReport() {
  const res = await fetch("/audit-report.json");
  if (!res.ok) throw new Error("Failed to load audit report");
  const report = await res.json();
  renderReport(report);
}

function formatScanError(status, body) {
  if (status === 409) {
    return body.error ?? "Scan already in progress. Please wait.";
  }
  if (status === 503) {
    return (
      body.error ??
      "Scan agents failed to start. Check CURSOR_API_KEY in .env and retry."
    );
  }
  if (status === 502) {
    const detail =
      body.partial?.errors
        ?.map((e) => `${e.agent}: ${e.message}`)
        .join("; ") ?? "";
    const base = body.error ?? "Partial scan failure — not enough specialists returned valid JSON.";
    return detail ? `${base} (${detail})` : base;
  }
  return body.error ?? `Scan failed (${status})`;
}

async function runScan() {
  const errEl = $("#scan-error");
  const scanBtn = $("#scan-btn");
  const prevBtnText = scanBtn.textContent;

  errEl.classList.add("hidden");
  scanBtn.disabled = true;
  scanBtn.textContent = "Scanning…";
  $("#plan-btn").disabled = true;
  setScanStatus("Running multi-agent scan — this may take a few minutes…");
  setPillsScanning();

  try {
    const res = await fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target: "./demo-app" }),
    });

    let body = {};
    try {
      body = await res.json();
    } catch {
      body = {};
    }

    if (!res.ok) {
      errEl.textContent = formatScanError(res.status, body);
      errEl.classList.remove("hidden");
      setPillsIdle();
      return;
    }

    renderReport(body);
  } catch (e) {
    errEl.textContent = e instanceof Error ? e.message : "Scan failed";
    errEl.classList.remove("hidden");
    setPillsIdle();
  } finally {
    scanBtn.disabled = false;
    scanBtn.textContent = prevBtnText;
    setScanStatus("");
  }
}

async function generatePlan() {
  if (!currentReport) return;
  $("#plan-btn").disabled = true;
  try {
    const res = await fetch("/api/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auditReport: currentReport }),
    });
    if (!res.ok) throw new Error("PLAN generation failed");
    const { plan } = await res.json();
    planText = plan;
    const preview = $("#plan-preview");
    preview.textContent = plan;
    preview.classList.remove("hidden");
    $("#copy-btn").disabled = false;
  } finally {
    $("#plan-btn").disabled = false;
  }
}

async function copyPlan() {
  if (!planText) return;
  await navigator.clipboard.writeText(planText);
  const btn = $("#copy-btn");
  const prev = btn.textContent;
  btn.textContent = "Copied!";
  setTimeout(() => {
    btn.textContent = prev;
  }, 2000);
}

$("#scan-btn").addEventListener("click", runScan);
$("#plan-btn").addEventListener("click", generatePlan);
$("#copy-btn").addEventListener("click", copyPlan);

loadReport().catch((e) => {
  console.error(e);
  $("#scan-error").textContent = "Could not load audit-report.json";
  $("#scan-error").classList.remove("hidden");
});
