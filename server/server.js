const express = require("express");
const cors = require("cors");
const multer = require("multer");
const dotenv = require("dotenv");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { 
  getDemoTopology, 
  getImageDemoTopology, 
  computeTopology, 
  performMockAudit 
} = require("./utils");

// Load Environment Variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Multer Config for memory storage uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Initialize Gemini SDK if API Key exists
let genAI = null;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  console.log("Gemini API Client initialized successfully.");
} else {
  console.log("No GEMINI_API_KEY found in environment. Server running in MOCK mode.");
}

// Regex fallback parser for LLDP neighbor outputs
function fallbackRegexParse(text) {
  const nodes = [];
  const edges = [];
  const localId = "core-switch-a";
  
  // Base local node
  nodes.push({ id: localId, label: "Core-Switch-A", type: "core-switch", ip: "10.0.0.1", mac: "00:1A:2B:3C:4D:01" });

  // Look for Device ID, Port ID, Local Intf patterns (Cisco standard style)
  const deviceRegex = /Device ID:\s*([^\r\n]+)/gi;
  const localIntfRegex = /Local Intf:\s*([^\r\n]+)/gi;
  const portIdRegex = /Port ID:\s*([^\r\n]+)/gi;

  const devices = [];
  let match;
  while ((match = deviceRegex.exec(text)) !== null) {
    devices.push(match[1].trim());
  }

  const localPorts = [];
  while ((match = localIntfRegex.exec(text)) !== null) {
    localPorts.push(match[1].trim());
  }

  const remotePorts = [];
  while ((match = portIdRegex.exec(text)) !== null) {
    remotePorts.push(match[1].trim());
  }

  if (devices.length > 0) {
    for (let i = 0; i < devices.length; i++) {
      const devName = devices[i];
      const cleanId = devName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const lPort = localPorts[i] || `Gi0/${i+1}`;
      const rPort = remotePorts[i] || `Eth${i+1}`;

      // Determine type based on name
      let type = "switch";
      const lowerName = devName.toLowerCase();
      if (lowerName.includes("srv") || lowerName.includes("server")) type = "server";
      else if (lowerName.includes("storage") || lowerName.includes("san") || lowerName.includes("nas") || lowerName.includes("cabinet")) type = "storage";
      else if (lowerName.includes("fw") || lowerName.includes("firewall") || lowerName.includes("brick")) type = "firewall";
      else if (lowerName.includes("core")) type = "core-switch";

      if (!nodes.some(n => n.id === cleanId)) {
        nodes.push({
          id: cleanId,
          label: devName,
          type: type,
          ip: `10.0.10.${100 + i}`,
          mac: `00:50:56:8E:AA:${(10 + i).toString(16).toUpperCase()}`
        });
      }

      edges.push({
        from: localId,
        to: cleanId,
        fromPort: lPort,
        toPort: rPort
      });
    }
    return { nodes, edges };
  }
  
  // Return the default demo network if no patterns matched
  return getDemoTopology();
}

// -------------------------------------------------------------
// Endpoint: POST /api/parse
// -------------------------------------------------------------
app.post("/api/parse", async (req, res) => {
  const { consoleLog, existingTopology, mergeMode } = req.body;
  const existing = existingTopology || { nodes: [], edges: [] };
  const mode = mergeMode || "append";

  if (!consoleLog || consoleLog.trim() === "") {
    return res.status(400).json({ success: false, error: "Console log input is empty." });
  }

  // Use Gemini if active, else fall back to regex/mock
  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `You are a professional network engineering assistant. Analyze the following network device console outputs (e.g., "show lldp neighbors detail", "show cdp neighbors", "show mac address-table") and parse them into a structured network topology JSON.

Identify all devices (nodes) and their link connections (edges).
For each node, extract:
- id: a clean url-friendly unique identifier (e.g., hostname lowercased and dashed)
- label: hostname/device ID
- type: must be one of "core-switch", "switch", "server", "storage", "firewall" (default to "switch" if unsure)
- ip: management IP (if shown)
- mac: MAC address (if shown)

For each edge, extract:
- from: source node id
- to: destination node id
- fromPort: port name on the source node (e.g., Gi0/1, Eth1, TenGi1/1)
- toPort: port name on the destination node (e.g., Gi0/2, eth0)

Return ONLY a valid JSON object matching the schema below. Do not include any markdown fences or explanation.
Schema:
{
  "nodes": [
    { "id": "node-1", "label": "Switch-A", "type": "switch", "ip": "10.0.0.1", "mac": "00:11:22:33:44:55" }
  ],
  "edges": [
    { "from": "node-1", "to": "node-2", "fromPort": "Gi0/1", "toPort": "eth0" }
  ]
}

Console Output Logs to Parse:
${consoleLog}`;

      const response = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      });

      const rawJson = response.response.text().trim();
      const parsedTopology = JSON.parse(rawJson);
      const finalTopology = computeTopology(existing, parsedTopology, mode);
      
      return res.json({ success: true, data: finalTopology });
    } catch (error) {
      console.error("Gemini Parse Error, falling back to regex: ", error);
      const parsedTopology = fallbackRegexParse(consoleLog);
      const finalTopology = computeTopology(existing, parsedTopology, mode);
      return res.json({ 
        success: true, 
        data: finalTopology, 
        warning: `Gemini parsing failed (${error.message}). Fell back to regex parsing.` 
      });
    }
  } else {
    // Mock Mode
    const parsedTopology = fallbackRegexParse(consoleLog);
    const finalTopology = computeTopology(existing, parsedTopology, mode);
    return res.json({ 
      success: true, 
      data: finalTopology, 
      warning: "Server running in Mock mode. Console parsed using local regex parser." 
    });
  }
});

// -------------------------------------------------------------
// Endpoint: POST /api/parse-image
// -------------------------------------------------------------
app.post("/api/parse-image", upload.single("image"), async (req, res) => {
  try {
    const file = req.file;
    const existing = req.body.existingTopology ? JSON.parse(req.body.existingTopology) : { nodes: [], edges: [] };
    const mode = req.body.mergeMode || "append";

    if (!file) {
      return res.status(400).json({ success: false, error: "No image file uploaded." });
    }

    if (genAI) {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const imagePart = {
          inlineData: {
            data: file.buffer.toString("base64"),
            mimeType: file.mimetype
          }
        };

        const prompt = `You are a network topology diagram parser. Analyze the uploaded network topology diagram, hand-drawn architecture, whiteboard sketch, or Visio diagram.
Extract all network devices (nodes) and their interconnecting links (edges).

For each node, identify:
- id: a clean url-friendly unique identifier (e.g. lowercase hostname)
- label: device label/hostname
- type: categorize into: "core-switch", "switch", "server", "storage", "firewall" (based on their shapes, labels, or icons: purple arrays are storage, brick walls are firewalls, core switch labels indicate core)
- ip: IP address (if displayed)
- mac: MAC address (if displayed)

For each edge, identify:
- from: source node id
- to: destination node id
- fromPort: local interface port label (e.g. Gi0/1, Eth1, if displayed)
- toPort: remote interface port label (if displayed)

Return ONLY a valid JSON object matching the schema below. Do not wrap in markdown or include extra explanations.
Schema:
{
  "nodes": [
    { "id": "node-1", "label": "Switch-A", "type": "switch", "ip": "10.0.0.1", "mac": "00:11:22:33:44:55" }
  ],
  "edges": [
    { "from": "node-1", "to": "node-2", "fromPort": "Gi0/1", "toPort": "eth0" }
  ]
}

If you cannot read any nodes, return empty arrays.`;

        const response = await model.generateContent({
          contents: [{ role: "user", parts: [imagePart, { text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        });

        const rawJson = response.response.text().trim();
        const parsedTopology = JSON.parse(rawJson);
        const finalTopology = computeTopology(existing, parsedTopology, mode);

        return res.json({ success: true, data: finalTopology });
      } catch (error) {
        console.error("Gemini Multimodal Parse Error, falling back to mock: ", error);
        const parsedTopology = getImageDemoTopology();
        const finalTopology = computeTopology(existing, parsedTopology, mode);
        return res.json({ 
          success: true, 
          data: finalTopology, 
          warning: `Gemini Multimodal OCR failed (${error.message}). Fell back to demo topology.` 
        });
      }
    } else {
      // Mock Mode for Images
      const parsedTopology = getImageDemoTopology();
      const finalTopology = computeTopology(existing, parsedTopology, mode);
      return res.json({ 
        success: true, 
        data: finalTopology, 
        warning: "Server running in Mock mode. Image parsed using local network mockup template." 
      });
    }
  } catch (err) {
    console.error("Server API Error in /api/parse-image: ", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// Endpoint: POST /api/audit
// -------------------------------------------------------------
app.post("/api/audit", async (req, res) => {
  const { topology } = req.body;

  if (!topology || !topology.nodes) {
    return res.status(400).json({ success: false, error: "No topology data provided for auditing." });
  }

  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `You are a network security engineer and NOC specialist. Analyze the following network topology structure and provide a comprehensive security, redundancy, and configuration audit report.

Topology JSON:
${JSON.stringify(topology, null, 2)}

Provide the report in JSON format matching the schema below.
Important checks to perform:
1. Check if perimeter firewalls (type: 'firewall') are active and in path.
2. Check if servers and storage units (type: 'storage') have redundancy (redundant links/multi-pathing).
3. Check if core switches (type: 'core-switch') are connected via interlinks to avoid split-brain setup.
4. Check if devices are missing management IPs.

Return ONLY a valid JSON matching this schema:
{
  "healthScore": 85, // Integer 0-100 indicating overall security & health score
  "audits": [
    {
      "id": "audit-id",
      "type": "success" | "warning" | "danger" | "info",
      "category": "Security" | "Redundancy" | "Configuration",
      "title": "Title of the issue or check",
      "description": "Detailed explanation of why it is an issue or a success, and how to improve it."
    }
  ]
}

No markdown wrappers or explanation.`;

      const response = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      });

      const rawJson = response.response.text().trim();
      const auditResult = JSON.parse(rawJson);

      return res.json({ success: true, data: auditResult });
    } catch (error) {
      console.error("Gemini Audit Error, falling back to rule-based audit: ", error);
      const auditResult = performMockAudit(topology);
      return res.json({ 
        success: true, 
        data: auditResult, 
        warning: `Gemini AI Audit failed (${error.message}). Fell back to rule-based audit.` 
      });
    }
  } else {
    // Mock Audit
    const auditResult = performMockAudit(topology);
    return res.json({ 
      success: true, 
      data: auditResult, 
      warning: "Server running in Mock mode. Audit performed using local static analyzer rules." 
    });
  }
});

// Start Server
app.listen(port, () => {
  console.log(`Backend Server running on port ${port}`);
});
