// Main Orchestration Controller for SmartOps Application

// Local state variables populated from mockData.js
let state = {
  tickets: [],
  assets: [],
  contracts: [],
  engineers: [],
  anomalies: [],
  lifespans: {
    Laptop: 36,
    Server: 60,
    "Network Switch": 60
  },
  selectedTicketId: null,
  syncLogs: [],
  charts: {
    dashboard: null,
    procurement: null
  },
  isLiveMode: false,
  freshdeskDomain: "",
  freshdeskApiKey: "",
  slackWebhookUrl: "",
  slackChannel: ""
};

// Page Title Mapping
const PAGE_TITLES = {
  dashboard: { title: "Operations Overview", subtitle: "Real-time indicators across connected SaaS pipelines." },
  sla: { title: "SLA & Vendor Compliance", subtitle: "Cross-reference ticket resolution logs against Zoho Books contract SLAs." },
  procurement: { title: "Predictive CapEx Procurement", subtitle: "Rolling 12-month capital forecast based on lifecycles & support spikes." },
  dispatcher: { title: "Intelligent Ticket Dispatcher", subtitle: "Dynamically match active incidents against resource availability & past speed." },
  integrations: { title: "SaaS Integration Manager", subtitle: "Configure Rest APIs, webhooks, and channel delivery alerts." }
};

// Initial App load
window.onload = function() {
  resetMockState();
  lucide.createIcons();
  
  // Load saved configurations from sessionStorage if any
  loadSavedIntegrations();
  
  // Render initial dashboards
  updateKpiMetrics();
  renderDashboardAnomalies();
  renderSlaAuditTable();
  renderSlaContractsTable();
  renderAssetLifecycleTable();
  renderDispatcherInbox();
  initCharts();
};

/**
 * Resets local state back to initial mock datasets
 */
function resetMockState() {
  state.tickets = JSON.parse(JSON.stringify(MOCK_TICKETS));
  state.assets = JSON.parse(JSON.stringify(MOCK_ASSETS));
  state.contracts = JSON.parse(JSON.stringify(MOCK_CONTRACTS));
  state.engineers = JSON.parse(JSON.stringify(MOCK_ENGINEERS));
  state.anomalies = [];
  state.selectedTicketId = null;
  
  // Find initial resolved anomalies in seed data
  state.tickets.forEach(ticket => {
    if (ticket.status === "Resolved") {
      const analysis = analyzeTicketSla(ticket, state.assets, state.contracts);
      if (analysis.breach) {
        state.anomalies.push({
          ticketId: ticket.id,
          subject: ticket.subject,
          vendor: analysis.vendor,
          contractId: analysis.contractId,
          actualHours: analysis.actualHours,
          targetHours: analysis.targetHours,
          deltaPercent: analysis.deltaPercent,
          createdAt: ticket.createdAt,
          resolvedAt: ticket.resolvedAt
        });
      }
    }
  });
}

function resetMockData() {
  resetMockState();
  
  // Refresh UI
  updateKpiMetrics();
  renderDashboardAnomalies();
  renderSlaAuditTable();
  renderAssetLifecycleTable();
  renderDispatcherInbox();
  
  // Clear selected dispatcher ticket
  document.getElementById("dispatcher-selected-ticket-details").innerHTML = `
    <p style="color: var(--text-secondary); text-align: center; padding: 2rem 0;">Select a ticket from the queue to view engineering recommendations.</p>
  `;
  document.getElementById("dispatcher-recommendations-list-container").style.display = "none";
  document.getElementById("dispatcher-selected-category-badge").style.display = "none";
  
  // Clear logs console
  const consoleEl = document.getElementById("sla-terminal-console");
  consoleEl.innerHTML = `<div class="terminal-line system">[SYSTEM] Simulation dataset reset to default state. Ready.</div>`;
  
  // Update Charts
  updateCharts();
  
  showSlackAlert("SYSTEM", "Simulated database refreshed to original seed baseline.");
}

/**
 * Tab Switching Controller
 */
function switchTab(tabId) {
  // Toggle Nav classes
  const navItems = document.querySelectorAll(".nav-item");
  navItems.forEach(item => item.classList.remove("active"));
  
  const activeNav = document.getElementById(`nav-${tabId}`);
  if (activeNav) activeNav.classList.add("active");
  
  // Toggle Pane classes
  const tabPanes = document.querySelectorAll(".tab-pane");
  tabPanes.forEach(pane => pane.classList.remove("active"));
  
  const activePane = document.getElementById(`pane-${tabId}`);
  if (activePane) activePane.classList.add("active");
  
  // Update Header Text
  const titleData = PAGE_TITLES[tabId] || { title: "Operations Dashboard", subtitle: "" };
  document.getElementById("page-title-display").innerText = titleData.title;
  document.getElementById("page-subtitle-display").innerText = titleData.subtitle;
  
  // Trigger any layout resizing for canvas charts
  if (tabId === "dashboard" || tabId === "procurement") {
    setTimeout(updateCharts, 50);
  }
}

/**
 * Updates KPI metrics displayed in top header cards
 */
function updateKpiMetrics() {
  // Active Tickets (Open status)
  const activeCount = state.tickets.filter(t => t.status === "Open").length;
  document.getElementById("kpi-active-tickets").innerText = activeCount;
  
  // SLA Breach Rate
  const resolvedCount = state.tickets.filter(t => t.status === "Resolved").length;
  const breachCount = state.anomalies.length;
  const breachRate = resolvedCount > 0 ? Math.round((breachCount / resolvedCount) * 100) : 0;
  
  document.getElementById("kpi-sla-breach-rate").innerText = `${breachRate}%`;
  document.getElementById("kpi-sla-breach-count").innerText = breachCount;
  
  // Forecasted CapEx (Rolling 12M)
  const forecast = generateCapExForecast(state.tickets, state.assets, state.lifespans);
  document.getElementById("kpi-forecasted-capex").innerText = `$${forecast.totalForecastedCapEx.toLocaleString()}`;
  
  // Average Engineer Load
  const totalLoad = state.engineers.reduce((sum, eng) => sum + eng.activeLoad, 0);
  const avgLoad = state.engineers.length > 0 ? (totalLoad / state.engineers.length).toFixed(1) : "0.0";
  document.getElementById("kpi-engineer-load").innerText = avgLoad;
}

/**
 * Renders anomalies list in Dashboard Overview tab
 */
function renderDashboardAnomalies() {
  const container = document.getElementById("dashboard-anomalies-list");
  container.innerHTML = "";
  
  // Fetch SLA Breaches
  state.anomalies.forEach(anomaly => {
    const item = document.createElement("div");
    item.className = "alert-item danger";
    item.innerHTML = `
      <div class="alert-meta">
        <span>SLA BREACH ALERT</span>
        <span class="badge breach">Exceeded by ${anomaly.deltaPercent}%</span>
      </div>
      <div class="alert-subject">Ticket ${anomaly.ticketId}: ${anomaly.subject}</div>
      <div class="alert-desc">
        Vendor: <strong>${anomaly.vendor}</strong> (Contract ID: ${anomaly.contractId}). 
        Resolution took <strong>${anomaly.actualHours} hrs</strong> (SLA limit: ${anomaly.targetHours} hrs).
      </div>
    `;
    container.appendChild(item);
  });
  
  // Check for hardware ticket spikes
  const forecast = generateCapExForecast(state.tickets, state.assets, state.lifespans);
  Object.keys(forecast.ticketSpikesByModel).forEach(model => {
    const spike = forecast.ticketSpikesByModel[model];
    if (spike.hasSpike) {
      const item = document.createElement("div");
      item.className = "alert-item warning";
      item.innerHTML = `
        <div class="alert-meta">
          <span>HARDWARE STABILITY WARNING</span>
          <span class="badge high">+${spike.spikePercent}% ticket rate</span>
        </div>
        <div class="alert-subject">Support Incident Spike on ${model}</div>
        <div class="alert-desc">
          Average support ticket rates for the <strong>${model}</strong> batch increased by <strong>${spike.spikePercent}%</strong> quarter-over-quarter. Hardware replacement recommended.
        </div>
      `;
      container.appendChild(item);
    }
  });
  
  if (state.anomalies.length === 0 && Object.values(forecast.ticketSpikesByModel).filter(s => s.hasSpike).length === 0) {
    container.innerHTML = `
      <p style="color: var(--text-muted); font-size: 0.9rem; text-align: center; padding: 1.5rem 0;">No operational anomalies detected currently.</p>
    `;
  }
}

/**
 * Module 1: Render SLA Audits
 */
function renderSlaAuditTable() {
  const tbody = document.getElementById("sla-audit-table-body");
  tbody.innerHTML = "";
  
  state.tickets.forEach(ticket => {
    const analysis = analyzeTicketSla(ticket, state.assets, state.contracts);
    const actualHours = analysis.actualHours !== undefined ? `${analysis.actualHours} hrs` : "N/A";
    const targetHours = analysis.targetHours !== undefined ? `${analysis.targetHours} hrs` : "N/A";
    
    let statusBadge = "";
    if (ticket.status === "Open") {
      statusBadge = `<span class="badge active-badge">Active Queue</span>`;
    } else if (analysis.status === "Compliant") {
      statusBadge = `<span class="badge compliant">Compliant</span>`;
    } else if (analysis.status === "Breached") {
      statusBadge = `<span class="badge breach">Breached (+${analysis.deltaPercent}%)</span>`;
    } else {
      statusBadge = `<span class="badge low">No SLA Plan</span>`;
    }
    
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="font-family: var(--font-mono); font-weight: 500;">${ticket.id}</td>
      <td style="font-weight: 600;">${ticket.subject}</td>
      <td><span class="badge ${ticket.severity.toLowerCase()}">${ticket.severity}</span></td>
      <td>${analysis.vendor || "N/A"}</td>
      <td style="font-family: var(--font-mono);">${actualHours}</td>
      <td style="font-family: var(--font-mono);">${targetHours}</td>
      <td>${statusBadge}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderSlaContractsTable() {
  const tbody = document.getElementById("contracts-table-body");
  tbody.innerHTML = "";
  
  state.contracts.forEach(c => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="font-family: var(--font-mono);">${c.id}</td>
      <td style="font-weight: 500;">${c.vendor}</td>
      <td>${c.category}s</td>
      <td style="font-family: var(--font-mono); font-weight: 600; color: var(--color-danger);">${c.sla.Critical} hrs</td>
    `;
    tbody.appendChild(tr);
  });
}

/**
 * Module 1: Run Nightly Sync background simulation
 */
function triggerNightlyAudit() {
  const consoleEl = document.getElementById("sla-terminal-console");
  consoleEl.innerHTML = "";
  
  const timestamp = new Date().toISOString();
  
  if (state.isLiveMode) {
    const btn = document.getElementById("btn-run-audit");
    btn.disabled = true;
    
    const div = document.createElement("div");
    div.className = "terminal-line system";
    div.innerText = `[${newDateString()}] Starting Live SLA Sync: Crawling tickets from Freshdesk REST API...`;
    consoleEl.appendChild(div);
    
    // Fetch latest tickets again from API
    verifyFreshdeskConnection(state.freshdeskDomain, state.freshdeskApiKey, false)
      .then(success => {
        btn.disabled = false;
        if (success) {
          const results = runNightlySlaSync(state.tickets, state.assets, state.contracts);
          state.anomalies = results.anomalies;
          
          results.logs.forEach(log => {
            const div2 = document.createElement("div");
            div2.className = "terminal-line";
            if (log.includes("WARNING")) div2.className += " warn";
            else if (log.includes("ALERT")) div2.className += " err";
            else if (log.includes("completed")) div2.className += " success";
            div2.innerText = log;
            consoleEl.appendChild(div2);
          });
          
          updateKpiMetrics();
          renderDashboardAnomalies();
          renderSlaAuditTable();
          updateCharts();
        } else {
          const div2 = document.createElement("div");
          div2.className = "terminal-line err";
          div2.innerText = `[${newDateString()}] Error during live sync: Connection to API proxy lost.`;
          consoleEl.appendChild(div2);
        }
      });
  } else {
    const results = runNightlySlaSync(state.tickets, state.assets, state.contracts);
    let logIndex = 0;
    
    // Save anomalies in state
    state.anomalies = results.anomalies;
    
    // Disable execution button during simulation run
    const btn = document.getElementById("btn-run-audit");
    btn.disabled = true;
    
    function printLine() {
      if (logIndex < results.logs.length) {
        const line = results.logs[logIndex];
        const div = document.createElement("div");
        div.className = "terminal-line";
        
        if (line.includes("WARNING")) {
          div.className += " warn";
        } else if (line.includes("ALERT")) {
          div.className += " err";
        } else if (line.includes("completed")) {
          div.className += " success";
        } else if (line.includes("Starting") || line.includes("Querying")) {
          div.className += " system";
        }
        
        div.innerText = line;
        consoleEl.appendChild(div);
        consoleEl.scrollTop = consoleEl.scrollHeight;
        
        // Look for breach to emit simulated slack message
        if (line.includes("SLA Breach Detected")) {
          const breachMatch = results.logs[logIndex].match(/Resolved in ([\d\.]+) hrs/);
          const hours = breachMatch ? breachMatch[1] : "?";
          showSlackAlert("SLA MONITOR", `Anomaly alert dispatched: SLA contract breached. Ticket took ${hours} hrs.`);
        }
        
        logIndex++;
        setTimeout(printLine, 100);
      } else {
        btn.disabled = false;
        // Refresh visuals
        updateKpiMetrics();
        renderDashboardAnomalies();
        renderSlaAuditTable();
        updateCharts();
      }
    }
    
    printLine();
  }
}

/**
 * Module 2: Render Assets Table
 */
function renderAssetLifecycleTable() {
  const tbody = document.getElementById("assets-table-body");
  tbody.innerHTML = "";
  
  const forecast = generateCapExForecast(state.tickets, state.assets, state.lifespans);
  
  state.assets.forEach(asset => {
    const age = getAssetAgeInMonths(asset);
    const lifespanLimit = state.lifespans[asset.category] || 36;
    
    // Find if EOL
    let forecastStatusBadge = "";
    const remaining = lifespanLimit - age;
    const modelSpikes = forecast.ticketSpikesByModel[asset.model] || { spikePercent: 0, hasSpike: false };
    
    const isAssetLaptopReachingEOL = asset.category === "Laptop" && age >= 33;
    if ((isAssetLaptopReachingEOL || age >= lifespanLimit - 3) && modelSpikes.hasSpike) {
      forecastStatusBadge = `<span class="badge breach">Replace Urgent</span>`;
    } else if (age >= lifespanLimit) {
      forecastStatusBadge = `<span class="badge high">EOL Passed</span>`;
    } else if (remaining <= 3) {
      forecastStatusBadge = `<span class="badge high">EOL Pending</span>`;
    } else {
      forecastStatusBadge = `<span class="badge compliant">Healthy</span>`;
    }
    
    const spikeText = modelSpikes.spikePercent > 0 ? `+${modelSpikes.spikePercent}% QoQ` : "0% QoQ";
    const spikeClass = modelSpikes.hasSpike ? "trend-up" : "text-muted";
    
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="font-family: var(--font-mono); font-weight: 600;">${asset.tag}</td>
      <td>${asset.category}</td>
      <td style="font-weight: 500;">${asset.model}</td>
      <td style="font-family: var(--font-mono);">${age} / ${lifespanLimit} mo</td>
      <td class="${spikeClass}" style="font-family: var(--font-mono); font-weight: 600;">${spikeText}</td>
      <td style="font-family: var(--font-mono);">${asset.warrantyExpiration}</td>
      <td style="font-family: var(--font-mono); font-weight: 700; color: var(--color-secondary);">$${asset.cost.toLocaleString()}</td>
      <td>${forecastStatusBadge}</td>
    `;
    tbody.appendChild(tr);
  });
}

function updateLifespanSettings() {
  state.lifespans.Laptop = parseInt(document.getElementById("input-lifespan-laptop").value) || 36;
  state.lifespans.Server = parseInt(document.getElementById("input-lifespan-server").value) || 60;
  state.lifespans."Network Switch" = parseInt(document.getElementById("input-lifespan-switch").value) || 60;
  
  // Refresh views
  renderAssetLifecycleTable();
  updateKpiMetrics();
  renderDashboardAnomalies();
  updateCharts();
}

/**
 * Module 2: Simulate ticket spike on Laptops
 */
function triggerLaptopTicketSpike() {
  // Add multiple laptop support tickets targeting ThinkPad Gen 2 laptops to Q2 (last 3 months)
  const laptopAssets = state.assets.filter(a => a.model === "ThinkPad T14 Gen 2");
  
  const subjects = [
    "Keyboard spacebar un-responsive",
    "ThinkPad overheating and blue-screening",
    "Screen flickering intermittently",
    "Battery bloating case casing crack",
    "Fast battery drainage",
    "Wifi adapter drops connection repeatedly"
  ];
  
  // Insert 6 new resolved tickets in the recent quarter (May/June)
  for (let i = 0; i < 6; i++) {
    const asset = laptopAssets[i % laptopAssets.length];
    const newId = `FD-SPK-${i + 101}`;
    state.tickets.push({
      id: newId,
      subject: `[Spike Event] ${subjects[i % subjects.length]}`,
      description: "Automated simulation injecting hardware support ticket.",
      category: "Hardware",
      assetTag: asset.tag,
      severity: "High",
      status: "Resolved",
      engineerId: "ENG-02",
      createdAt: getRelativeDate(0, -5 - i),
      resolvedAt: getRelativeDate(0, -4 - i),
      escalations: 0
    });
  }
  
  // Refresh UI
  renderAssetLifecycleTable();
  updateKpiMetrics();
  renderDashboardAnomalies();
  renderSlaAuditTable();
  updateCharts();
  
  showSlackAlert("HARDWARE METRICS", "CapEx Engine triggered warning: support tickets for ThinkPad T14 spiked by > 30% in last quarter. Immediate replacement recommended.");
}

/**
 * Module 3: Render Ticket Dispatcher Inbox
 */
function renderDispatcherInbox() {
  const inbox = document.getElementById("dispatcher-tickets-inbox");
  inbox.innerHTML = "";
  
  const openTickets = state.tickets.filter(t => t.status === "Open");
  
  openTickets.forEach(ticket => {
    const card = document.createElement("div");
    card.className = "ticket-inbox-card";
    if (state.selectedTicketId === ticket.id) {
      card.className += " selected";
    }
    
    card.onclick = () => selectDispatcherTicket(ticket.id);
    
    card.innerHTML = `
      <div class="ticket-card-header">
        <span class="ticket-id">${ticket.id}</span>
        <span class="badge ${ticket.severity.toLowerCase()}">${ticket.severity}</span>
      </div>
      <div class="ticket-subject-lbl">${ticket.subject}</div>
      <div class="ticket-card-desc">${ticket.description}</div>
    `;
    inbox.appendChild(card);
  });
  
  if (openTickets.length === 0) {
    inbox.innerHTML = `
      <p style="color: var(--text-muted); font-size: 0.9rem; text-align: center; padding: 2rem 0;">No active incoming tickets. Good job!</p>
    `;
  }
}

/**
 * Select a ticket in the dispatcher
 */
function selectDispatcherTicket(ticketId) {
  state.selectedTicketId = ticketId;
  renderDispatcherInbox();
  
  const ticket = state.tickets.find(t => t.id === ticketId);
  if (!ticket) return;
  
  // Show details panel
  const detailsEl = document.getElementById("dispatcher-selected-ticket-details");
  detailsEl.innerHTML = `
    <h3 style="font-size: 1.05rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--text-primary);">${ticket.subject}</h3>
    <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem; line-height: 1.4;">${ticket.description}</p>
    <div style="display: flex; gap: 1rem; font-size: 0.8rem; color: var(--text-muted); border-top: 1px solid var(--glass-border); padding-top: 0.75rem;">
      <div>Asset: <strong style="color: var(--text-primary);">${ticket.assetTag || "None"}</strong></div>
      <div>Severity: <strong style="color: var(--text-primary);">${ticket.severity}</strong></div>
      <div>Created: <strong style="color: var(--text-primary);">${new Date(ticket.createdAt).toLocaleString()}</strong></div>
    </div>
  `;
  
  // Get recommendations
  const result = getDispatcherRecommendations(ticket, state.engineers);
  
  // Render Category Badge
  const catBadge = document.getElementById("dispatcher-selected-category-badge");
  catBadge.style.display = "inline-block";
  catBadge.innerText = result.classifiedCategory.toUpperCase();
  catBadge.className = `badge ${result.classifiedCategory.toLowerCase() === 'database' ? 'critical' : result.classifiedCategory.toLowerCase() === 'networking' ? 'high' : 'medium'}`;
  
  // Render Candidates list
  const candList = document.getElementById("dispatcher-candidates-list");
  candList.innerHTML = "";
  
  result.recommendations.forEach((rec, index) => {
    const card = document.createElement("div");
    card.className = "candidate-card";
    if (index === 0) {
      card.className += " recommended";
    }
    
    card.innerHTML = `
      <div class="cand-meta">
        <div class="cand-name-title">
          <span>${rec.name}</span>
          ${index === 0 ? '<span class="badge compliant" style="font-size:0.65rem;">Best Match</span>' : ''}
          <span class="cand-score-tag">Score: ${rec.scores.total}</span>
        </div>
        <div class="cand-stats-grid">
          <div class="cand-stat">Specialty: <span>${rec.specialty}</span></div>
          <div class="cand-stat">Avg speed: <span>${rec.avgHours}h</span></div>
          <div class="cand-stat">Active Load: <span>${rec.activeLoad} tickets</span></div>
          <div class="cand-stat">Escalate rate: <span>${rec.escalationRate}%</span></div>
        </div>
        <div class="cand-reason">${rec.reason}</div>
      </div>
      <div class="cand-dispatch-action">
        <button class="btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;" onclick="dispatchTicketToEngineer('${ticket.id}', '${rec.engineerId}')">
          <i data-lucide="corner-down-right" style="width: 14px; height: 14px;"></i> Dispatch
        </button>
      </div>
    `;
    candList.appendChild(card);
  });
  
  document.getElementById("dispatcher-recommendations-list-container").style.display = "block";
  lucide.createIcons();
}

/**
 * Dispatches ticket to engineer
 */
function dispatchTicketToEngineer(ticketId, engineerId) {
  const ticket = state.tickets.find(t => t.id === ticketId);
  const engineer = state.engineers.find(e => e.id === engineerId);
  
  if (!ticket || !engineer) return;
  
  // Update state
  ticket.status = "In Progress";
  ticket.engineerId = engineer.id;
  engineer.activeLoad++;
  
  // Clear dispatcher details selection
  state.selectedTicketId = null;
  document.getElementById("dispatcher-selected-ticket-details").innerHTML = `
    <p style="color: var(--text-secondary); text-align: center; padding: 2rem 0;">Select a ticket from the queue to view engineering recommendations.</p>
  `;
  document.getElementById("dispatcher-recommendations-list-container").style.display = "none";
  document.getElementById("dispatcher-selected-category-badge").style.display = "none";
  
  // Refresh UI
  renderDispatcherInbox();
  updateKpiMetrics();
  renderSlaAuditTable();
  renderAssetLifecycleTable();
  updateCharts();
  
  // Dispatch Simulated Slack notify
  showSlackAlert("TICKET DISPATCH", `Ticket ${ticket.id} ("${ticket.subject}") dispatched dynamically to ${engineer.name}. Reason: ${engineer.specialty} specialist, Load: ${engineer.activeLoad}.`);
}

/**
 * Handle custom ticket creation from dispatcher form
 */
function handleCustomTicketSubmit(event) {
  event.preventDefault();
  
  const subject = document.getElementById("input-ticket-subject").value;
  const desc = document.getElementById("input-ticket-desc").value;
  const severity = document.getElementById("input-ticket-severity").value;
  
  const category = classifyTicketCategory(subject, desc);
  const newId = `FD-${state.tickets.length + 501}`;
  
  // Randomly assign to a covered asset based on category
  const matches = state.assets.filter(a => a.category === (category === "Database" ? "Server" : category === "Networking" ? "Network Switch" : "Laptop"));
  const assetTag = matches.length > 0 ? matches[Math.floor(Math.random() * matches.length)].tag : null;
  
  const newTicket = {
    id: newId,
    subject,
    description: desc,
    category,
    assetTag,
    severity,
    status: "Open",
    engineerId: null,
    createdAt: new Date().toISOString(),
    escalations: 0
  };
  
  state.tickets.push(newTicket);
  
  // Reset form
  document.getElementById("form-custom-ticket").reset();
  
  // Update UI
  renderDispatcherInbox();
  updateKpiMetrics();
  
  // Auto select the new ticket
  selectDispatcherTicket(newId);
  
  showSlackAlert("TICKET INGESTION", `New active ticket ingested from Freshdesk API: ${newId} (${subject}). Semantic analyzer mapped this to ${category}.`);
}

/**
 * Ingest dynamic random ticket
 */
function simulateNewTicket() {
  if (state.isLiveMode) {
    alert("Simulation is disabled while running in Live CRM Mode. Ingest new tickets directly inside your Freshdesk instance, and they will load automatically on sync/refresh.");
    return;
  }
  const subjects = [
    { sub: "Database connection pools exhausted", desc: "HikariPool-1 is reporting connection timeouts. High traffic volume is locking active db rows.", cat: "Database" },
    { sub: "Slow page response on dashboard API gateway", desc: "API response latency spiked above 1200ms. CPU usage on container cluster at 94%.", cat: "Software" },
    { sub: "VPN server auth certificate missing", desc: "Unable to parse SSL keys for secondary OpenVPN server endpoint. Security validation failed.", cat: "Security" },
    { sub: "WiFi dropouts in Floor 3 conference room", desc: "Access Point AP-03 disconnects clients randomly. Needs firmware push or switch reboot.", cat: "Networking" },
    { sub: "Screen cracked on laptop model ASSET-LAP-101", desc: "Laptop was dropped in transit. Display is fully bleeding green ink. Needs replacement panel.", cat: "Hardware" }
  ];
  
  const randomPick = subjects[Math.floor(Math.random() * subjects.length)];
  const severities = ["Critical", "High", "Medium", "Low"];
  const severity = severities[Math.floor(Math.random() * 3)]; // Bias away from Low
  
  // Random asset tag
  const matches = state.assets.filter(a => a.category === (randomPick.cat === "Database" ? "Server" : randomPick.cat === "Networking" ? "Network Switch" : "Laptop"));
  const assetTag = matches.length > 0 ? matches[Math.floor(Math.random() * matches.length)].tag : null;
  
  const newId = `FD-${state.tickets.length + 501}`;
  const newTicket = {
    id: newId,
    subject: randomPick.sub,
    description: randomPick.desc,
    category: randomPick.cat,
    assetTag,
    severity,
    status: "Open",
    engineerId: null,
    createdAt: new Date().toISOString(),
    escalations: 0
  };
  
  state.tickets.push(newTicket);
  
  renderDispatcherInbox();
  updateKpiMetrics();
  
  showSlackAlert("TICKET INGESTION", `Ingested Freshdesk Ticket ${newId}: "${randomPick.sub}" [${severity}]`);
}

function simulateSlaBreachTicket() {
  if (state.isLiveMode) {
    alert("Simulation is disabled while running in Live CRM Mode.");
    return;
  }
  // We need to add a resolved ticket that breaches Zoho SLA
  // E.g., Server asset going down (SLA target is 4 hours) resolved in 8.5 hours
  const servers = state.assets.filter(a => a.category === "Server");
  const asset = servers[Math.floor(Math.random() * servers.length)];
  
  const newId = `FD-BRC-${state.tickets.length + 501}`;
  
  const createdDate = new Date();
  createdDate.setHours(createdDate.getHours() - 10);
  const resolvedDate = new Date();
  resolvedDate.setHours(resolvedDate.getHours() - 1.5); // 8.5 hours duration
  
  const newTicket = {
    id: newId,
    subject: "Server Outage: Hypervisor storage controller failed",
    description: "RAID array storage pool went offline on server chassis. Long rebuild process needed to restore files.",
    category: "Hardware",
    assetTag: asset.tag,
    severity: "Critical",
    status: "Resolved",
    engineerId: "ENG-02",
    createdAt: createdDate.toISOString(),
    resolvedAt: resolvedDate.toISOString(),
    escalations: 1
  };
  
  state.tickets.push(newTicket);
  
  // Auditing will automatically grab this on next sync, or let's push to anomalies list to show immediately
  const analysis = analyzeTicketSla(newTicket, state.assets, state.contracts);
  if (analysis.breach) {
    state.anomalies.push({
      ticketId: newId,
      subject: newTicket.subject,
      vendor: analysis.vendor,
      contractId: analysis.contractId,
      actualHours: analysis.actualHours,
      targetHours: analysis.targetHours,
      deltaPercent: analysis.deltaPercent,
      createdAt: newTicket.createdAt,
      resolvedAt: newTicket.resolvedAt
    });
  }
  
  updateKpiMetrics();
  renderDashboardAnomalies();
  renderSlaAuditTable();
  updateCharts();
  
  showSlackAlert("SLA ANOMALY", `Critical SLA Breach Ingested! Ticket ${newId} resolved in ${analysis.actualHours} hrs (SLA: ${analysis.targetHours} hrs). Exceeded contract by ${analysis.deltaPercent}%.`);
}

function showSlackAlert(service, message) {
  // We can push to the sync logs terminal window if active
  const consoleEl = document.getElementById("sla-terminal-console");
  if (consoleEl) {
    const div = document.createElement("div");
    div.className = "terminal-line success";
    div.innerText = `[${newDateString()}] [SLACK NOTIFY -> ${state.slackChannel || '#ops-alerts'}] ${service}: ${message}`;
    consoleEl.appendChild(div);
    consoleEl.scrollTop = consoleEl.scrollHeight;
  }
  
  // Real Slack integration relay via express server
  if (state.slackWebhookUrl) {
    fetch("/api/slack/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        webhookUrl: state.slackWebhookUrl,
        service,
        message
      })
    }).catch(err => console.error("Slack webhook send failed:", err));
  }
}

function newDateString() {
  return new Date().toLocaleTimeString();
}

/**
 * Chart.js Integration
 */
function initCharts() {
  const forecast = generateCapExForecast(state.tickets, state.assets, state.lifespans);
  const labels = forecast.forecastData.map(d => d.month);
  const values = forecast.forecastData.map(d => d.cost);
  
  const ctxOverview = document.getElementById("overviewBudgetChart").getContext("2d");
  const ctxProcure = document.getElementById("procurementBudgetChart").getContext("2d");
  
  const chartConfig = {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Projected CapEx ($)',
        data: values,
        backgroundColor: function(context) {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          if (!chartArea) return null;
          
          const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
          gradient.addColorStop(0, 'rgba(99, 102, 241, 0.2)');
          gradient.addColorStop(1, 'rgba(6, 182, 212, 0.8)');
          return gradient;
        },
        borderColor: '#06b6d4',
        borderWidth: 1.5,
        borderRadius: 8,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0d1321',
          titleFont: { family: 'Outfit', size: 13 },
          bodyFont: { family: 'Space Grotesk', size: 12 },
          borderColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: function(context) {
              return `CapEx: $${context.raw.toLocaleString()}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#94a3b8', font: { family: 'Outfit', size: 11 } }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.04)' },
          ticks: { 
            color: '#94a3b8', 
            font: { family: 'Space Grotesk', size: 11 },
            callback: function(value) { return '$' + value.toLocaleString(); }
          }
        }
      }
    }
  };
  
  state.charts.dashboard = new Chart(ctxOverview, JSON.parse(JSON.stringify(chartConfig)));
  
  // Set background color overrides since JSON parse drops function parameters
  state.charts.dashboard.data.datasets[0].backgroundColor = getGradientColor;
  state.charts.dashboard.update();
  
  state.charts.procurement = new Chart(ctxProcure, JSON.parse(JSON.stringify(chartConfig)));
  state.charts.procurement.data.datasets[0].backgroundColor = getGradientColor;
  state.charts.procurement.update();
}

function getGradientColor(context) {
  const chart = context.chart;
  const {ctx, chartArea} = chart;
  if (!chartArea) return null;
  const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
  gradient.addColorStop(0, 'rgba(99, 102, 241, 0.2)');
  gradient.addColorStop(1, 'rgba(6, 182, 212, 0.8)');
  return gradient;
}

function updateCharts() {
  const forecast = generateCapExForecast(state.tickets, state.assets, state.lifespans);
  const labels = forecast.forecastData.map(d => d.month);
  const values = forecast.forecastData.map(d => d.cost);
  
  if (state.charts.dashboard) {
    state.charts.dashboard.data.labels = labels;
    state.charts.dashboard.data.datasets[0].data = values;
    state.charts.dashboard.update();
  }
  
  if (state.charts.procurement) {
    state.charts.procurement.data.labels = labels;
    state.charts.procurement.data.datasets[0].data = values;
    state.charts.procurement.update();
  }
}

/**
 * Loads integrations from sessionStorage on startup
 */
function loadSavedIntegrations() {
  const fdDomain = sessionStorage.getItem("smartops_fd_domain");
  const fdKey = sessionStorage.getItem("smartops_fd_key");
  const slackWebhook = sessionStorage.getItem("smartops_slack_webhook");
  const slackChan = sessionStorage.getItem("smartops_slack_channel");

  if (fdDomain && fdKey) {
    document.getElementById("input-fd-domain").value = fdDomain;
    document.getElementById("input-fd-key").value = fdKey;
    state.freshdeskDomain = fdDomain;
    state.freshdeskApiKey = fdKey;
    verifyFreshdeskConnection(fdDomain, fdKey, false);
  }

  if (slackWebhook && slackChan) {
    document.getElementById("input-slack-webhook").value = slackWebhook;
    document.getElementById("input-slack-channel").value = slackChan;
    state.slackWebhookUrl = slackWebhook;
    state.slackChannel = slackChan;
    updateSlackUIStatus(true);
  }
}

/**
 * Saves and verifies Freshdesk API
 */
async function saveFreshdeskIntegration() {
  const domain = document.getElementById("input-fd-domain").value.trim();
  const apiKey = document.getElementById("input-fd-key").value.trim();

  if (!domain || !apiKey) {
    alert("Please fill in both the Freshdesk Domain and API Key.");
    return;
  }

  const btn = document.getElementById("btn-save-freshdesk");
  btn.innerHTML = `<i data-lucide="loader" style="width: 14px; height: 14px;" class="animate-spin"></i> Testing Connection...`;
  btn.disabled = true;
  lucide.createIcons();

  const success = await verifyFreshdeskConnection(domain, apiKey, true);

  btn.innerHTML = `<i data-lucide="save" style="width: 14px; height: 14px;"></i> Save & Test Connection`;
  btn.disabled = false;
  lucide.createIcons();
}

/**
 * Verifies credentials by querying server proxy endpoint
 */
async function verifyFreshdeskConnection(domain, apiKey, showAlert) {
  if (window.location.protocol === "file:") {
    if (showAlert) {
      alert("Error: Live integrations require the backend proxy server to be running.\n\nYou are currently opening index.html directly as a local file (file://). Please start the server by running 'npm start' in your terminal and visit http://localhost:3000 in your browser.");
    }
    return false;
  }
  try {
    const response = await fetch("/api/freshdesk/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain, apiKey })
    });

    const data = await response.json();

    if (response.ok) {
      // Success! Set Live Mode
      state.isLiveMode = true;
      state.freshdeskDomain = domain;
      state.freshdeskApiKey = apiKey;
      state.tickets = data; 

      // Cache settings
      sessionStorage.setItem("smartops_fd_domain", domain);
      sessionStorage.setItem("smartops_fd_key", apiKey);

      updateFreshdeskUIStatus(true);
      updateAppModeUI(true);

      // Refresh visuals
      updateKpiMetrics();
      renderSlaAuditTable();
      renderAssetLifecycleTable();
      renderDispatcherInbox();
      renderDashboardAnomalies();
      updateCharts();

      if (showAlert) {
        alert("Success! Connected to Freshdesk CRM and sync completed.");
      }
      
      const consoleEl = document.getElementById("sla-terminal-console");
      if (consoleEl) {
        consoleEl.innerHTML += `<div class="terminal-line success">[SYSTEM] Successfully established live API sync pipe with Freshdesk.</div>`;
      }
      
      showSlackAlert("INTEGRATIONS", "Live Freshdesk API bridge connected successfully.");
      return true;
    } else {
      throw new Error(data.error || "Connection failed.");
    }
  } catch (err) {
    console.error(err);
    state.isLiveMode = false;
    updateFreshdeskUIStatus(false);
    updateAppModeUI(false);
    
    sessionStorage.removeItem("smartops_fd_domain");
    sessionStorage.removeItem("smartops_fd_key");

    if (showAlert) {
      alert(`Connection Error: ${err.message}`);
    }
    return false;
  }
}

function updateFreshdeskUIStatus(isConnected) {
  const statusEl = document.getElementById("status-freshdesk");
  if (!statusEl) return;
  
  if (isConnected) {
    statusEl.className = "conn-status connected";
    statusEl.innerHTML = `
      <div class="status-indicator"></div>
      <span>Connected</span>
    `;
  } else {
    statusEl.className = "conn-status disconnected";
    statusEl.innerHTML = `
      <div class="status-indicator" style="background-color: var(--color-danger); box-shadow: 0 0 10px var(--color-danger);"></div>
      <span>Disconnected</span>
    `;
  }
  lucide.createIcons();
}

function updateAppModeUI(isLive) {
  const badge = document.getElementById("app-mode-badge");
  if (!badge) return;
  
  if (isLive) {
    badge.className = "badge compliant";
    badge.innerText = "LIVE CRM MODE";
  } else {
    badge.className = "badge low";
    badge.innerText = "SIMULATION MODE";
  }
}

/**
 * Saves and tests Slack webhook integration
 */
async function saveSlackIntegration() {
  if (window.location.protocol === "file:") {
    alert("Error: Live integrations require the backend proxy server to be running.\n\nYou are currently opening index.html directly as a local file (file://). Please start the server by running 'npm start' in your terminal and visit http://localhost:3000 in your browser.");
    return;
  }
  const webhookUrl = document.getElementById("input-slack-webhook").value.trim();
  const channel = document.getElementById("input-slack-channel").value.trim();

  if (!webhookUrl || !channel) {
    alert("Please fill in both Webhook URL and channel fields.");
    return;
  }

  const btn = document.getElementById("btn-save-slack");
  btn.innerHTML = `<i data-lucide="loader" style="width: 14px; height: 14px;" class="animate-spin"></i> Testing Webhook...`;
  btn.disabled = true;
  lucide.createIcons();

  try {
    const response = await fetch("/api/slack/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        webhookUrl,
        service: "Integrations Check",
        message: `Slack channel integration tested and verified for channel ${channel}.`
      })
    });

    if (response.ok) {
      state.slackWebhookUrl = webhookUrl;
      state.slackChannel = channel;
      
      sessionStorage.setItem("smartops_slack_webhook", webhookUrl);
      sessionStorage.setItem("smartops_slack_channel", channel);

      updateSlackUIStatus(true);
      alert("Success! Sent test message to Slack. Check your channel.");
    } else {
      throw new Error("Failed to send webhook request.");
    }
  } catch (err) {
    console.error(err);
    updateSlackUIStatus(false);
    sessionStorage.removeItem("smartops_slack_webhook");
    sessionStorage.removeItem("smartops_slack_channel");
    alert(`Webhook Test Failed: ${err.message}`);
  }

  btn.innerHTML = `<i data-lucide="save" style="width: 14px; height: 14px;"></i> Save & Test Webhook`;
  btn.disabled = false;
  lucide.createIcons();
}

function updateSlackUIStatus(isConnected) {
  const statusEl = document.getElementById("status-slack");
  if (!statusEl) return;
  
  if (isConnected) {
    statusEl.className = "conn-status connected";
    statusEl.innerHTML = `
      <div class="status-indicator"></div>
      <span>Connected</span>
    `;
  } else {
    statusEl.className = "conn-status disconnected";
    statusEl.innerHTML = `
      <div class="status-indicator" style="background-color: var(--color-danger); box-shadow: 0 0 10px var(--color-danger);"></div>
      <span>Disconnected</span>
    `;
  }
  lucide.createIcons();
}
