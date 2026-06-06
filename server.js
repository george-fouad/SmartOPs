// Express Proxy Server for SmartOps SaaS Integrations (ES Modules Version)
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.PORT || 3000;

// Set up __dirname equivalent in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());

// Serve static compiled dashboard files from Vite build folder (dist)
app.use(express.static(path.join(__dirname, 'dist')));

/**
 * Helper to classify ticket categories based on text description
 */
function classifyCategory(text = "") {
  const bodyText = text.toLowerCase();
  const keywords = {
    Database: ["sql", "postgres", "db", "query", "replication", "lag", "index", "oracle", "mysql", "aurora", "latency", "slow query", "database"],
    Networking: ["switch", "router", "wifi", "network", "ping", "port", "vlan", "dhcp", "dns", "gateway", "cisco", "connection", "offline"],
    Security: ["ssl", "cert", "expired", "breach", "access", "unauthorized", "phishing", "password", "vpn", "mfa", "login", "firewall", "authentication"],
    Hardware: ["laptop", "battery", "keyboard", "screen", "webcam", "hardware", "motherboard", "overheat", "fan", "disk", "ram", "power", "casings", "keys"],
    Software: ["git", "deploy", "build", "ci/cd", "kubernetes", "k8s", "docker", "api", "crash", "error", "application", "code", "bug", "software"]
  };
  
  let bestCategory = "Software";
  let maxMatches = 0;
  
  Object.keys(keywords).forEach(cat => {
    let count = 0;
    keywords[cat].forEach(kw => {
      const regex = new RegExp("\\b" + kw + "\\b", "gi");
      const matches = (bodyText.match(regex) || []).length;
      count += matches;
    });
    if (count > maxMatches) {
      maxMatches = count;
      bestCategory = cat;
    }
  });
  
  return bestCategory;
}

/**
 * Proxy Route: Fetch and map tickets from Freshdesk
 */
app.post('/api/freshdesk/tickets', async (req, res) => {
  const { domain, apiKey } = req.body;
  
  if (!domain || !apiKey) {
    return res.status(400).json({ error: "Missing required fields: domain and apiKey." });
  }
  
  // Format domain URL (e.g. ensure https and remove trailing slashes)
  let cleanDomain = domain.trim();
  if (!cleanDomain.startsWith('http')) {
    cleanDomain = `https://${cleanDomain}`;
  }
  cleanDomain = cleanDomain.replace(/\/$/, "");
  
  try {
    // Basic Auth header setup: apiKey as username, "X" as password
    const authHeader = `Basic ${Buffer.from(`${apiKey.trim()}:X`).toString('base64')}`;
    
    console.log(`[Proxy] Fetching tickets from: ${cleanDomain}/api/v2/tickets?include=description`);
    
    const response = await axios.get(`${cleanDomain}/api/v2/tickets`, {
      params: {
        include: 'description',
        per_page: 50,
        order_by: 'created_at',
        direction: 'desc'
      },
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      }
    });
    
    // Map Freshdesk tickets to our unified schema
    const mappedTickets = response.data.map(ticket => {
      // 1. Map Priority: 1 -> Low, 2 -> Medium, 3 -> High, 4 -> Critical (Urgent)
      let severity = "Medium";
      if (ticket.priority === 1) severity = "Low";
      else if (ticket.priority === 2) severity = "Medium";
      else if (ticket.priority === 3) severity = "High";
      else if (ticket.priority === 4) severity = "Critical";
      
      // 2. Map Status: 2 -> Open, 3 -> Pending, 4 -> Resolved, 5 -> Closed
      let status = "Open";
      if (ticket.status === 4 || ticket.status === 5) {
        status = "Resolved";
      }
      
      // 3. Extract description text
      const descText = ticket.description_text || ticket.description || "";
      
      // 4. Scan for Asset Tag in subject and description (e.g. ASSET-SRV-001 or ASSET-LAP-101)
      const assetPattern = /ASSET-[A-Z0-9]+-[0-9]+/i;
      const combinedText = `${ticket.subject} ${descText}`;
      const assetMatch = combinedText.match(assetPattern);
      const assetTag = assetMatch ? assetMatch[0].toUpperCase() : null;
      
      // 5. Classify Category based on semantic keywords
      const category = classifyCategory(combinedText);
      
      return {
        id: `FD-${ticket.id}`,
        subject: ticket.subject || "No Subject",
        description: descText.substring(0, 500), // Cap description length
        category,
        assetTag,
        severity,
        status,
        engineerId: ticket.responder_id ? `ENG-${ticket.responder_id}` : null,
        createdAt: ticket.created_at,
        resolvedAt: status === "Resolved" ? ticket.updated_at : null,
        escalations: ticket.fr_escalated || ticket.spam ? 1 : 0
      };
    });
    
    console.log(`[Proxy] Successfully fetched and mapped ${mappedTickets.length} tickets.`);
    res.json(mappedTickets);
    
  } catch (err) {
    console.error("[Proxy Error] Freshdesk API request failed:", err.message);
    
    const status = err.response ? err.response.status : 500;
    const message = err.response && err.response.data && err.response.data.message 
      ? err.response.data.message 
      : err.message;
      
    res.status(status).json({ error: `Freshdesk Connection Failed: ${message}` });
  }
});

/**
 * Proxy Route: Dispatch Slack notifications
 */
app.post('/api/slack/notify', async (req, res) => {
  const { webhookUrl, service, message } = req.body;
  
  if (!webhookUrl || !message) {
    return res.status(400).json({ error: "Missing webhookUrl or message." });
  }
  
  try {
    const payload = {
      text: `⚡ *[SmartOps Alert - ${service.toUpperCase()}]* ${message}`
    };
    
    await axios.post(webhookUrl, payload, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    res.json({ success: true });
  } catch (err) {
    console.error("[Proxy Error] Slack notify failed:", err.message);
    res.status(500).json({ error: `Slack Notification Failed: ${err.message}` });
  }
});

// Fallback all other GET routes to index.html (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start listening with port retry logic in case of EADDRINUSE
function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`===================================================`);
    console.log(`🚀 SmartOps Local Server running at http://localhost:${port}`);
    console.log(`📁 Serving frontend folder: ${path.join(__dirname, 'dist')}`);
    console.log(`===================================================`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️  Port ${port} is already in use. Trying port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error(`[Server Error]`, err.message);
    }
  });
}

startServer(PORT);
