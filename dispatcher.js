// Intelligent Ticket Dispatcher (Resource Optimizer) (Module 3)
// Routes tickets based on semantic content matching, resolution speed, and workload.

// Keywords mapping to identify category from ticket title & description
const CATEGORY_KEYWORDS = {
  Database: ["sql", "postgres", "db", "query", "replication", "lag", "index", "oracle", "mysql", "aurora", "latency", "slow query", "database"],
  Networking: ["switch", "router", "wifi", "network", "ping", "port", "vlan", "dhcp", "dns", "gateway", "cisco", "connection", "offline"],
  Security: ["ssl", "cert", "expired", "breach", "access", "unauthorized", "phishing", "password", "vpn", "mfa", "login", "firewall", "authentication"],
  Hardware: ["laptop", "battery", "keyboard", "screen", "webcam", "hardware", "motherboard", "overheat", "fan", "disk", "ram", "power", "casings", "keys"],
  Software: ["git", "deploy", "build", "ci/cd", "kubernetes", "k8s", "docker", "api", "crash", "error", "application", "code", "bug", "software"]
};

/**
 * Categorizes a ticket using simple semantic keyword matching on subject & description.
 */
function classifyTicketCategory(subject = "", description = "") {
  const text = `${subject} ${description}`.toLowerCase();
  
  let bestCategory = "Software"; // Default fallback
  let maxMatches = 0;
  
  Object.keys(CATEGORY_KEYWORDS).forEach(category => {
    let matches = 0;
    CATEGORY_KEYWORDS[category].forEach(keyword => {
      // Count instances of keyword
      const regex = new RegExp("\\b" + keyword + "\\b", "gi");
      const count = (text.match(regex) || []).length;
      matches += count;
    });
    
    if (matches > maxMatches) {
      maxMatches = matches;
      bestCategory = category;
    }
  });
  
  return bestCategory;
}

/**
 * Calculates a recommendation score for an engineer for a specific ticket category.
 * High score is better.
 * Formula:
 *  Base Score = 100
 *  Speed Factor = - (avgHours * 10) (faster is better)
 *  Escalation Penalty = - (escalationRate * 100) (fewer escalations is better)
 *  Workload Penalty = - (activeLoad * 15) (lower workload is better)
 *  Specialty Bonus = +15 (if category matches engineer specialty)
 */
function scoreEngineer(engineer, category) {
  const perf = engineer.historicalPerformance[category] || { avgHours: 5, escalationRate: 0.1 };
  
  const baseScore = 100;
  const speedPenalty = perf.avgHours * 10;
  const escalationPenalty = perf.escalationRate * 100;
  const workloadPenalty = engineer.activeLoad * 15;
  const specialtyBonus = engineer.specialty === category ? 15 : 0;
  
  const finalScore = baseScore - speedPenalty - escalationPenalty - workloadPenalty + specialtyBonus;
  
  return {
    engineerId: engineer.id,
    name: engineer.name,
    specialty: engineer.specialty,
    activeLoad: engineer.activeLoad,
    avgHours: perf.avgHours,
    escalationRate: Math.round(perf.escalationRate * 100),
    scores: {
      speedPenalty: Math.round(speedPenalty),
      escalationPenalty: Math.round(escalationPenalty),
      workloadPenalty,
      specialtyBonus,
      total: Math.round(finalScore)
    }
  };
}

/**
 * Suggests the best engineering resources for a ticket.
 */
function getDispatcherRecommendations(ticket, engineers) {
  const category = ticket.category || classifyTicketCategory(ticket.subject, ticket.description);
  
  // Score all engineers
  const recommendations = engineers.map(eng => {
    const scored = scoreEngineer(eng, category);
    
    // Construct recommendation reason
    let reason = "";
    if (eng.specialty === category) {
      reason += `Specialist in ${category}. `;
    }
    reason += `Solves ${category} issues in avg ${scored.avgHours} hrs. `;
    if (eng.activeLoad >= 3) {
      reason += `Note: high active workload (${eng.activeLoad} tickets).`;
    } else {
      reason += `Low active workload (${eng.activeLoad} tickets).`;
    }
    
    return {
      ...scored,
      reason
    };
  });
  
  // Sort recommendations descending by total score
  recommendations.sort((a, b) => b.scores.total - a.scores.total);
  
  return {
    classifiedCategory: category,
    recommendations
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    classifyTicketCategory,
    scoreEngineer,
    getDispatcherRecommendations
  };
}
