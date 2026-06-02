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

async function animateScanPills() {
  const specialists = ["secrets-scout", "auth-guard", "injection-hunter"];
  for (const agent of specialists) {
    setPill(agent, "running", "running…");
    await new Promise((r) => setTimeout(r, 400));
    const count =
      currentReport?.agentContributions?.[agent] ??
      specialists.indexOf(agent) + 2;
    setPill(agent, "done", `done · ${count}`);
  }
  setPill("orchestrator", "running", "running…");
  await new Promise((r) => setTimeout(r, 400));
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

async function runScan() {
  const errEl = $("#scan-error");
  errEl.classList.add("hidden");
  $("#scan-btn").disabled = true;
  $("#plan-btn").disabled = true;
  setPillsIdle();

  const anim = animateScanPills();

  try {
    const res = await fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target: "./demo-app" }),
    });
    await anim;
    if (res.status === 409) {
      errEl.textContent = "Scan already in progress. Please wait.";
      errEl.classList.remove("hidden");
      return;
    }
    if (!res.ok) throw new Error(`Scan failed (${res.status})`);
    const report = await res.json();
    renderReport(report);
  } catch (e) {
    errEl.textContent = e instanceof Error ? e.message : "Scan failed";
    errEl.classList.remove("hidden");
    setPillsIdle();
  } finally {
    $("#scan-btn").disabled = false;
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
