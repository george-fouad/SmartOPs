// SLA & Vendor Compliance Monitor (Module 1) - ES Module Version

/**
 * Calculates the resolution time of a ticket in hours.
 */
function calculateResolutionTime(ticket) {
  if (!ticket.resolvedAt) return null;
  const created = new Date(ticket.createdAt);
  const resolved = new Date(ticket.resolvedAt);
  const diffMs = resolved - created;
  return diffMs / (1000 * 60 * 60); // Convert to decimal hours
}

/**
 * Retrieves the contract and specific SLA target hours for a ticket based on asset mapping.
 */
function getSlaTarget(ticket, assets, contracts) {
  if (!ticket.assetTag) return null;
  
  // Find asset
  const asset = assets.find(a => a.tag === ticket.assetTag);
  if (!asset || !asset.contractId) return null;
  
  // Find contract
  const contract = contracts.find(c => c.id === asset.contractId);
  if (!contract || !contract.sla) return null;
  
  // Find target hours based on severity
  const severity = ticket.severity || "Medium";
  const targetHours = contract.sla[severity];
  
  return {
    contractId: contract.id,
    vendor: contract.vendor,
    slaTargetHours: targetHours,
    category: contract.category
  };
}

/**
 * Analyzes a single ticket for SLA compliance.
 */
function analyzeTicketSla(ticket, assets, contracts) {
  const actualHours = calculateResolutionTime(ticket);
  if (actualHours === null) {
    return { status: "Active", breach: false, deltaPercent: 0, reason: "Ticket is still active" };
  }
  
  const slaInfo = getSlaTarget(ticket, assets, contracts);
  if (!slaInfo) {
    return { status: "No SLA Contract", breach: false, deltaPercent: 0, reason: "No matching contract found" };
  }
  
  const targetHours = slaInfo.slaTargetHours;
  // Calculate percentage exceeded
  const deltaPercent = (actualHours - targetHours) / targetHours;
  
  // Flag as anomaly if actual hours exceed SLA target by more than 10%
  const isBreach = deltaPercent > 0.10;
  
  return {
    status: isBreach ? "Breached" : "Compliant",
    breach: isBreach,
    actualHours: Math.round(actualHours * 100) / 100,
    targetHours,
    deltaPercent: Math.round(deltaPercent * 1000) / 10, // formatted percentage e.g., 20%
    contractId: slaInfo.contractId,
    vendor: slaInfo.vendor
  };
}

/**
 * Simulated nightly agent crawling the ticketing API.
 * Returns simulation logs and list of anomalies.
 */
function runNightlySlaSync(tickets, assets, contracts) {
  const logs = [];
  const anomalies = [];
  const timestamp = new Date().toISOString();
  
  logs.push(`[${timestamp}] Starting scheduled background task: Nightly SLA Compliance Sync...`);
  logs.push(`[${timestamp}] Querying Freshdesk API for tickets resolved in the last 30 days...`);
  
  const resolvedTickets = tickets.filter(t => t.status === "Resolved");
  logs.push(`[${timestamp}] Found ${resolvedTickets.length} resolved tickets to audit.`);
  
  resolvedTickets.forEach(ticket => {
    logs.push(`[${timestamp}] Auditing Ticket ${ticket.id}: "${ticket.subject}"`);
    const analysis = analyzeTicketSla(ticket, assets, contracts);
    
    if (analysis.status === "No SLA Contract") {
      logs.push(`[${timestamp}]   - Skip: No contract covers asset ${ticket.assetTag}.`);
    } else if (analysis.status === "Compliant") {
      logs.push(`[${timestamp}]   - Compliant: Resolved in ${analysis.actualHours} hrs (SLA Target: ${analysis.targetHours} hrs).`);
    } else if (analysis.status === "Breached") {
      logs.push(`[${timestamp}]   [WARNING] SLA Breach Detected! Resolved in ${analysis.actualHours} hrs. SLA Target: ${analysis.targetHours} hrs. Exceeded by ${analysis.deltaPercent}%.`);
      
      const anomaly = {
        ticketId: ticket.id,
        subject: ticket.subject,
        vendor: analysis.vendor,
        contractId: analysis.contractId,
        actualHours: analysis.actualHours,
        targetHours: analysis.targetHours,
        deltaPercent: analysis.deltaPercent,
        createdAt: ticket.createdAt,
        resolvedAt: ticket.resolvedAt
      };
      
      anomalies.push(anomaly);
      
      // Simulating Slack dispatch
      logs.push(`[${timestamp}]   [ALERT DISPATCHED] Sending payload to Slack Webhook...`);
    }
  });
  
  logs.push(`[${timestamp}] Nightly SLA Compliance Sync completed. Processed ${resolvedTickets.length} tickets. Detected ${anomalies.length} SLA breaches.`);
  
  return {
    timestamp,
    logs,
    anomalies
  };
}

export {
  calculateResolutionTime,
  getSlaTarget,
  analyzeTicketSla,
  runNightlySlaSync
};
