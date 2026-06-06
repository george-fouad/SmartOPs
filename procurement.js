// Predictive Procurement & CapEx Forecaster (Module 2)
// Analyzes asset lifespans, ticket spikes, and projects budgets

const DEFAULT_LIFESPANS = {
  "Laptop": 36,        // 36 months EOL standard
  "Server": 60,        // 60 months EOL standard
  "Network Switch": 60 // 60 months EOL standard
};

/**
 * Calculates the age of an asset in months relative to a reference date (default June 2026).
 */
function getAssetAgeInMonths(asset, referenceDateStr = "2026-06-06") {
  const purchase = new Date(asset.purchaseDate);
  const reference = new Date(referenceDateStr);
  
  return (reference.getFullYear() - purchase.getFullYear()) * 12 + (reference.getMonth() - purchase.getMonth());
}

/**
 * Analyzes ticket frequency trends for each asset model.
 * Compares last quarter (Months 0-3 ago: Mar, Apr, May 2026) vs Previous quarter (Months 3-6 ago: Dec 2025, Jan, Feb 2026).
 */
function analyzeTicketSpikesByModel(tickets, assets, referenceDateStr = "2026-06-06") {
  const refDate = new Date(referenceDateStr);
  
  // Define quarter boundaries
  const threeMonthsAgo = new Date(refDate);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const sixMonthsAgo = new Date(refDate);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  // Count tickets per model in Q1 (months 3-6 ago) and Q2 (months 0-3 ago)
  const stats = {};
  
  // Initialize stats for each unique model
  assets.forEach(asset => {
    if (!stats[asset.model]) {
      stats[asset.model] = { q1Count: 0, q2Count: 0, assetTags: [] };
    }
    stats[asset.model].assetTags.push(asset.tag);
  });
  
  tickets.forEach(ticket => {
    if (!ticket.assetTag) return;
    const ticketDate = new Date(ticket.createdAt);
    
    // Find asset model
    const asset = assets.find(a => a.tag === ticket.assetTag);
    if (!asset) return;
    
    const model = asset.model;
    if (ticketDate >= threeMonthsAgo && ticketDate <= refDate) {
      stats[model].q2Count++;
    } else if (ticketDate >= sixMonthsAgo && ticketDate < threeMonthsAgo) {
      stats[model].q1Count++;
    }
  });
  
  // Calculate spike percentage
  const spikeAnalysis = {};
  Object.keys(stats).forEach(model => {
    const q1 = stats[model].q1Count;
    const q2 = stats[model].q2Count;
    
    let spikePercent = 0;
    if (q1 === 0 && q2 > 0) {
      spikePercent = q2 * 100; // infinite spike, represented as flat percentage
    } else if (q1 > 0) {
      spikePercent = ((q2 - q1) / q1) * 100;
    }
    
    spikeAnalysis[model] = {
      q1Count: q1,
      q2Count: q2,
      spikePercent: Math.round(spikePercent),
      hasSpike: spikePercent >= 30
    };
  });
  
  return spikeAnalysis;
}

/**
 * Generates rolling 12-month budget and flags assets for replacement.
 */
function generateCapExForecast(tickets, assets, customLifespans = {}, referenceDateStr = "2026-06-06") {
  const refDate = new Date(referenceDateStr);
  const lifespans = { ...DEFAULT_LIFESPANS, ...customLifespans };
  const ticketSpikes = analyzeTicketSpikesByModel(tickets, assets, referenceDateStr);
  
  const budgetMonths = [];
  const monthlyCostMap = {};
  
  // Initialize the next 12 months structure starting from current month
  for (let i = 0; i < 12; i++) {
    const date = new Date(refDate);
    date.setMonth(date.getMonth() + i);
    const monthKey = date.toLocaleString('default', { month: 'short', year: '2-digit' }); // e.g. "Jun 26"
    budgetMonths.push(monthKey);
    monthlyCostMap[monthKey] = 0;
  }
  
  const replacementsList = [];
  const urgentReplacements = [];
  
  assets.forEach(asset => {
    const age = getAssetAgeInMonths(asset, referenceDateStr);
    const lifespanLimit = lifespans[asset.category] || 36;
    const monthsRemaining = lifespanLimit - age;
    
    // Check ticket spike for this model
    const spikeData = ticketSpikes[asset.model] || { hasSpike: false, spikePercent: 0 };
    
    // Determine condition based on age and spikes
    let status = "Healthy";
    let replaceAction = false;
    
    if (age >= lifespanLimit) {
      status = "EOL Passed";
      replaceAction = true;
    } else if (monthsRemaining <= 3) {
      // Reaching EOL next quarter
      status = "EOL Pending (Next Quarter)";
      replaceAction = true;
    }
    
    // If laptop reaching 36 months (or older than 33 months) AND average support tickets spike by 30%
    const isAssetLaptopReachingEOL = asset.category === "Laptop" && age >= 33;
    if ((isAssetLaptopReachingEOL || status.includes("EOL")) && spikeData.hasSpike) {
      status = "Urgent Replacement (Ticket Spike)";
      replaceAction = true;
      urgentReplacements.push({
        tag: asset.tag,
        model: asset.model,
        category: asset.category,
        age,
        spikePercent: spikeData.spikePercent,
        cost: asset.cost
      });
    }
    
    if (replaceAction) {
      // Calculate which month the replacement occurs
      // If EOL passed or urgent spike, replacement is scheduled for the first month (current month)
      let replacementMonthIndex = 0;
      if (monthsRemaining > 0 && status !== "Urgent Replacement (Ticket Spike)") {
        replacementMonthIndex = Math.min(monthsRemaining, 11);
      }
      
      const targetMonthKey = budgetMonths[replacementMonthIndex];
      monthlyCostMap[targetMonthKey] += asset.cost;
      
      replacementsList.push({
        tag: asset.tag,
        model: asset.model,
        category: asset.category,
        ageMonths: age,
        monthsRemaining,
        lifespan: lifespanLimit,
        cost: asset.cost,
        scheduledMonth: targetMonthKey,
        status,
        spikePercent: spikeData.spikePercent
      });
    }
  });
  
  // Format monthly budget values for charts
  const forecastData = budgetMonths.map(month => ({
    month,
    cost: monthlyCostMap[month]
  }));
  
  const totalForecastedCapEx = Object.values(monthlyCostMap).reduce((sum, val) => sum + val, 0);
  
  return {
    forecastData, // array of { month, cost }
    totalForecastedCapEx,
    replacementsList,
    urgentReplacements,
    ticketSpikesByModel: ticketSpikes
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    getAssetAgeInMonths,
    analyzeTicketSpikesByModel,
    generateCapExForecast
  };
}
