// Mock Data for Smart Operations (SmartOps)
// Simulates live datasets from Freshdesk, Zoho Books/CRM, and Slack

const MOCK_CONTRACTS = [
  {
    id: "ZC-8821",
    vendor: "Apex Infrastructure Ltd",
    category: "Server",
    sla: {
      Critical: 4, // in hours
      High: 8,
      Medium: 24,
      Low: 48
    },
    startDate: "2024-01-01",
    endDate: "2026-12-31",
    monthlyRetainer: 2500
  },
  {
    id: "ZC-9902",
    vendor: "ByteForce Systems",
    category: "Laptop",
    sla: {
      Critical: 8,
      High: 12,
      Medium: 48,
      Low: 72
    },
    startDate: "2023-06-01",
    endDate: "2026-05-31",
    monthlyRetainer: 1200
  },
  {
    id: "ZC-4431",
    vendor: "CoreLink Networks",
    category: "Network Switch",
    sla: {
      Critical: 4,
      High: 6,
      Medium: 12,
      Low: 24
    },
    startDate: "2024-03-01",
    endDate: "2027-02-28",
    monthlyRetainer: 1800
  }
];

// Helper to generate dates relative to current date (June 2026)
const getRelativeDate = (monthsAgo, dayOffset = 0) => {
  const date = new Date("2026-06-06T12:00:00Z");
  date.setMonth(date.getMonth() - monthsAgo);
  date.setDate(date.getDate() + dayOffset);
  return date.toISOString().split("T")[0];
};

const MOCK_ASSETS = [
  // Servers
  { tag: "ASSET-SRV-001", category: "Server", model: "PowerEdge R750", purchaseDate: getRelativeDate(28), warrantyExpiration: getRelativeDate(-8), cost: 8500, contractId: "ZC-8821" },
  { tag: "ASSET-SRV-002", category: "Server", model: "PowerEdge R750", purchaseDate: getRelativeDate(28), warrantyExpiration: getRelativeDate(-8), cost: 8500, contractId: "ZC-8821" },
  { tag: "ASSET-SRV-003", category: "Server", model: "PowerEdge R940", purchaseDate: getRelativeDate(42), warrantyExpiration: getRelativeDate(6), cost: 12000, contractId: "ZC-8821" },
  { tag: "ASSET-SRV-004", category: "Server", model: "PowerEdge R750", purchaseDate: getRelativeDate(10), warrantyExpiration: getRelativeDate(-26), cost: 8900, contractId: "ZC-8821" },

  // Switches
  { tag: "ASSET-SW-001", category: "Network Switch", model: "Catalyst 9300", purchaseDate: getRelativeDate(30), warrantyExpiration: getRelativeDate(-6), cost: 3200, contractId: "ZC-4431" },
  { tag: "ASSET-SW-002", category: "Network Switch", model: "Catalyst 9300", purchaseDate: getRelativeDate(30), warrantyExpiration: getRelativeDate(-6), cost: 3200, contractId: "ZC-4431" },
  { tag: "ASSET-SW-003", category: "Network Switch", model: "Catalyst 9500", purchaseDate: getRelativeDate(14), warrantyExpiration: getRelativeDate(-22), cost: 6500, contractId: "ZC-4431" },

  // Laptops (Batch A - older laptops reaching 36 months soon)
  { tag: "ASSET-LAP-101", category: "Laptop", model: "ThinkPad T14 Gen 2", purchaseDate: getRelativeDate(35), warrantyExpiration: getRelativeDate(1), cost: 1450, contractId: "ZC-9902" },
  { tag: "ASSET-LAP-102", category: "Laptop", model: "ThinkPad T14 Gen 2", purchaseDate: getRelativeDate(35), warrantyExpiration: getRelativeDate(1), cost: 1450, contractId: "ZC-9902" },
  { tag: "ASSET-LAP-103", category: "Laptop", model: "ThinkPad T14 Gen 2", purchaseDate: getRelativeDate(35), warrantyExpiration: getRelativeDate(1), cost: 1450, contractId: "ZC-9902" },
  { tag: "ASSET-LAP-104", category: "Laptop", model: "ThinkPad T14 Gen 2", purchaseDate: getRelativeDate(35), warrantyExpiration: getRelativeDate(1), cost: 1450, contractId: "ZC-9902" },
  { tag: "ASSET-LAP-105", category: "Laptop", model: "ThinkPad T14 Gen 2", purchaseDate: getRelativeDate(35), warrantyExpiration: getRelativeDate(1), cost: 1450, contractId: "ZC-9902" },
  { tag: "ASSET-LAP-106", category: "Laptop", model: "ThinkPad T14 Gen 2", purchaseDate: getRelativeDate(35), warrantyExpiration: getRelativeDate(1), cost: 1450, contractId: "ZC-9902" },
  { tag: "ASSET-LAP-107", category: "Laptop", model: "ThinkPad T14 Gen 2", purchaseDate: getRelativeDate(35), warrantyExpiration: getRelativeDate(1), cost: 1450, contractId: "ZC-9902" },
  { tag: "ASSET-LAP-108", category: "Laptop", model: "ThinkPad T14 Gen 2", purchaseDate: getRelativeDate(35), warrantyExpiration: getRelativeDate(1), cost: 1450, contractId: "ZC-9902" },

  // Laptops (Batch B - newer laptops)
  { tag: "ASSET-LAP-201", category: "Laptop", model: "MacBook Pro 14", purchaseDate: getRelativeDate(12), warrantyExpiration: getRelativeDate(-24), cost: 2200, contractId: "ZC-9902" },
  { tag: "ASSET-LAP-202", category: "Laptop", model: "MacBook Pro 14", purchaseDate: getRelativeDate(12), warrantyExpiration: getRelativeDate(-24), cost: 2200, contractId: "ZC-9902" },
  { tag: "ASSET-LAP-203", category: "Laptop", model: "MacBook Pro 14", purchaseDate: getRelativeDate(14), warrantyExpiration: getRelativeDate(-22), cost: 2200, contractId: "ZC-9902" },
  { tag: "ASSET-LAP-204", category: "Laptop", model: "MacBook Pro 14", purchaseDate: getRelativeDate(14), warrantyExpiration: getRelativeDate(-22), cost: 2200, contractId: "ZC-9902" }
];

const MOCK_ENGINEERS = [
  {
    id: "ENG-01",
    name: "Sarah Connor",
    specialty: "Database", // handles database issues fast
    activeLoad: 2,
    historicalPerformance: {
      Database: { avgHours: 1.5, escalationRate: 0.05 },
      Hardware: { avgHours: 4.5, escalationRate: 0.15 },
      Networking: { avgHours: 6.0, escalationRate: 0.20 },
      Software: { avgHours: 2.5, escalationRate: 0.08 },
      Security: { avgHours: 3.5, escalationRate: 0.10 }
    }
  },
  {
    id: "ENG-02",
    name: "John Doe",
    specialty: "Hardware", // handles hardware & laptop issues fast
    activeLoad: 1,
    historicalPerformance: {
      Database: { avgHours: 5.0, escalationRate: 0.25 },
      Hardware: { avgHours: 1.2, escalationRate: 0.02 },
      Networking: { avgHours: 8.0, escalationRate: 0.30 },
      Software: { avgHours: 3.0, escalationRate: 0.10 },
      Security: { avgHours: 4.0, escalationRate: 0.15 }
    }
  },
  {
    id: "ENG-03",
    name: "Alan Turing",
    specialty: "Security", // handles security & SSL issues fast
    activeLoad: 3,
    historicalPerformance: {
      Database: { avgHours: 2.0, escalationRate: 0.08 },
      Hardware: { avgHours: 5.0, escalationRate: 0.20 },
      Networking: { avgHours: 3.5, escalationRate: 0.12 },
      Software: { avgHours: 2.0, escalationRate: 0.05 },
      Security: { avgHours: 1.1, escalationRate: 0.01 }
    }
  },
  {
    id: "ENG-04",
    name: "Grace Hopper",
    specialty: "Software", // handles software bugs/deployments fast
    activeLoad: 0,
    historicalPerformance: {
      Database: { avgHours: 2.2, escalationRate: 0.09 },
      Hardware: { avgHours: 4.0, escalationRate: 0.18 },
      Networking: { avgHours: 5.0, escalationRate: 0.22 },
      Software: { avgHours: 1.3, escalationRate: 0.02 },
      Security: { avgHours: 2.5, escalationRate: 0.07 }
    }
  },
  {
    id: "ENG-05",
    name: "Linus Torvalds",
    specialty: "Networking", // handles switches/servers/linux kernels fast
    activeLoad: 4,
    historicalPerformance: {
      Database: { avgHours: 3.0, escalationRate: 0.15 },
      Hardware: { avgHours: 3.0, escalationRate: 0.10 },
      Networking: { avgHours: 1.4, escalationRate: 0.03 },
      Software: { avgHours: 1.8, escalationRate: 0.05 },
      Security: { avgHours: 2.0, escalationRate: 0.06 }
    }
  }
];

// Seed ticket history.
// We will generate ticket history for the past 6 months to analyze ticket frequencies.
// Let's also include some SLA violations:
// E.g., Server asset going down and taking 5.2 hours to resolve (exceeding 4-hour SLA by 30%)
const MOCK_TICKETS = [
  // Resolved Tickets (Past 6 Months)
  {
    id: "FD-501",
    subject: "Production Postgres database replication delay",
    description: "The secondary replica is lagging by 15GB. Queries are getting outdated data. Critical business impact.",
    category: "Database",
    assetTag: "ASSET-SRV-001",
    severity: "Critical",
    status: "Resolved",
    engineerId: "ENG-01",
    createdAt: "2026-05-15T08:00:00Z",
    resolvedAt: "2026-05-15T09:45:00Z", // 1.75 hours (SLA = 4h. OK!)
    escalations: 0
  },
  {
    id: "FD-502",
    subject: "Core switch port flap in Rack B",
    description: "Switch ports 12 to 18 are flapping every few minutes, disconnecting several staging nodes.",
    category: "Networking",
    assetTag: "ASSET-SW-001",
    severity: "High",
    status: "Resolved",
    engineerId: "ENG-05",
    createdAt: "2026-05-18T10:15:00Z",
    resolvedAt: "2026-05-18T16:30:00Z", // 6.25 hours (SLA = 6h. Exceeded by 4.16% - not flagged as breach (>10% threshold))
    escalations: 0
  },
  {
    id: "FD-503",
    subject: "Critical Server Crash: Dell PowerEdge R940",
    description: "Kernel panic on hypervisor hosting the core ERP system. System completely offline.",
    category: "Hardware",
    assetTag: "ASSET-SRV-003",
    severity: "Critical",
    status: "Resolved",
    engineerId: "ENG-02",
    createdAt: "2026-05-20T14:00:00Z",
    resolvedAt: "2026-05-20T18:48:00Z", // 4.8 hours (SLA = 4h. Exceeded by 20% - BREACH FLAGGED!)
    escalations: 1
  },
  {
    id: "FD-504",
    subject: "Network Firewall security upgrade failed",
    description: "Attempted patch update crashed the management dashboard interface. Rollback needed.",
    category: "Security",
    assetTag: "ASSET-SW-003",
    severity: "High",
    status: "Resolved",
    engineerId: "ENG-03",
    createdAt: "2026-05-22T22:00:00Z",
    resolvedAt: "2026-05-23T05:30:00Z", // 7.5 hours (SLA = 6h. Exceeded by 25% - BREACH FLAGGED!)
    escalations: 1
  },
  {
    id: "FD-505",
    subject: "Developer laptop motherboard failure",
    description: "Laptop will not post. Keyboard lights up, but screen remains blank. Needs motherboard replacement.",
    category: "Hardware",
    assetTag: "ASSET-LAP-101",
    severity: "Medium",
    status: "Resolved",
    engineerId: "ENG-02",
    createdAt: "2026-04-10T09:00:00Z",
    resolvedAt: "2026-04-10T14:30:00Z", // 5.5 hours (SLA = 48h. OK!)
    escalations: 0
  },
  // Ticket spikes for Batch A laptops (ThinkPad T14 Gen 2, tags LAP-101 to LAP-108)
  // Let's populate ticket logs for the past quarters:
  // Q1 (Jan-Mar 2026): ~2 tickets
  // Q2 (Apr-Jun 2026): ~8 tickets (massive support spike!)
  {
    id: "FD-410",
    subject: "ThinkPad T14 battery bloated",
    description: "Laptop casing is swelling. Touchpad is hard to click. Battery needs replacement.",
    category: "Hardware",
    assetTag: "ASSET-LAP-102",
    severity: "Medium",
    status: "Resolved",
    engineerId: "ENG-02",
    createdAt: "2026-04-15T09:00:00Z",
    resolvedAt: "2026-04-15T11:00:00Z",
    escalations: 0
  },
  {
    id: "FD-411",
    subject: "ThinkPad screen flashing",
    description: "Screen flickering rapidly. Connected external monitors work fine.",
    category: "Hardware",
    assetTag: "ASSET-LAP-103",
    severity: "Medium",
    status: "Resolved",
    engineerId: "ENG-02",
    createdAt: "2026-04-28T10:00:00Z",
    resolvedAt: "2026-04-28T12:00:00Z",
    escalations: 0
  },
  {
    id: "FD-412",
    subject: "ThinkPad random shutdowns under load",
    description: "Laptop overheats and shuts down when compiling code or opening multiple containers.",
    category: "Hardware",
    assetTag: "ASSET-LAP-104",
    severity: "High",
    status: "Resolved",
    engineerId: "ENG-02",
    createdAt: "2026-05-02T13:00:00Z",
    resolvedAt: "2026-05-02T16:00:00Z",
    escalations: 0
  },
  {
    id: "FD-413",
    subject: "ThinkPad USB-C charging port broken",
    description: "Laptop only charges if cord is bent in a specific angle. Port seems loose.",
    category: "Hardware",
    assetTag: "ASSET-LAP-105",
    severity: "Medium",
    status: "Resolved",
    engineerId: "ENG-02",
    createdAt: "2026-05-10T11:00:00Z",
    resolvedAt: "2026-05-10T13:30:00Z",
    escalations: 0
  },
  {
    id: "FD-414",
    subject: "ThinkPad blue screen of death on boot",
    description: "Error: WHEA_UNCORRECTABLE_ERROR. Likely hardware memory or storage corruption.",
    category: "Hardware",
    assetTag: "ASSET-LAP-106",
    severity: "High",
    status: "Resolved",
    engineerId: "ENG-02",
    createdAt: "2026-05-24T09:00:00Z",
    resolvedAt: "2026-05-24T11:45:00Z",
    escalations: 0
  },
  {
    id: "FD-415",
    subject: "Keyboard keys sticky and unresponsive",
    description: "Spacebar and E key are hard to press on ThinkPad T14.",
    category: "Hardware",
    assetTag: "ASSET-LAP-107",
    severity: "Low",
    status: "Resolved",
    engineerId: "ENG-02",
    createdAt: "2026-05-29T14:00:00Z",
    resolvedAt: "2026-05-29T16:30:00Z",
    escalations: 0
  },
  {
    id: "FD-416",
    subject: "ThinkPad webcam not detected",
    description: "Camera is missing from Device Manager. Privacy shutter is open. Hardware failure suspected.",
    category: "Hardware",
    assetTag: "ASSET-LAP-108",
    severity: "Low",
    status: "Resolved",
    engineerId: "ENG-02",
    createdAt: "2026-06-02T10:00:00Z",
    resolvedAt: "2026-06-02T11:30:00Z",
    escalations: 0
  },

  // Active / Incoming Unassigned Tickets (For Dispatching)
  {
    id: "FD-601",
    subject: "SQL database replication lag in production",
    description: "We are seeing a 12-minute delay in master-replica sync on the main AWS Aurora PostgreSQL database. Customers reporting delayed payment status updates.",
    category: "Database",
    assetTag: "ASSET-SRV-001",
    severity: "Critical",
    status: "Open",
    engineerId: null,
    createdAt: "2026-06-06T14:30:00Z",
    escalations: 0
  },
  {
    id: "FD-602",
    subject: "Laptop battery draining fast",
    description: "My ThinkPad T14 battery only lasts 45 minutes on a full charge. Need a replacement battery ordered.",
    category: "Hardware",
    assetTag: "ASSET-LAP-103",
    severity: "Low",
    status: "Open",
    engineerId: null,
    createdAt: "2026-06-06T14:45:00Z",
    escalations: 0
  },
  {
    id: "FD-603",
    subject: "Core router config backup error",
    description: "Unable to retrieve backup config from secondary Cisco core router. Connection timeout on port 22.",
    category: "Networking",
    assetTag: "ASSET-SW-002",
    severity: "High",
    status: "Open",
    engineerId: null,
    createdAt: "2026-06-06T15:00:00Z",
    escalations: 0
  },
  {
    id: "FD-604",
    subject: "SSL Certificate expiring in 3 days",
    description: "The SSL certificate for API gateway (api.smartops.internal) is set to expire soon. Automated renewal script failed with unauthorized challenge error.",
    category: "Security",
    assetTag: "ASSET-SRV-002",
    severity: "High",
    status: "Open",
    engineerId: null,
    createdAt: "2026-06-06T15:10:00Z",
    escalations: 0
  }
];

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    MOCK_CONTRACTS,
    MOCK_ASSETS,
    MOCK_ENGINEERS,
    MOCK_TICKETS,
    getRelativeDate
  };
}
