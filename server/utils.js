/**
 * Utility functions for Network Topology Discovery, Multi-Source Inference, 
 * Draw.io XML generation, and NOC Auditing.
 */

// Major vendor OUI mapping for MAC inference
const OUI_MAP = {
  "00:50:56": { vendor: "VMware", type: "server" },
  "00:0c:29": { vendor: "VMware", type: "server" },
  "00:11:32": { vendor: "Synology", type: "storage" },
  "00:08:9b": { vendor: "QNAP", type: "storage" },
  "00:11:0a": { vendor: "NetApp", type: "storage" },
  "00:1a:2b": { vendor: "Cisco", type: "switch" },
  "04:d5:90": { vendor: "Fortinet", type: "firewall" },
  "00:09:0f": { vendor: "Fortinet", type: "firewall" },
  "00:0b:86": { vendor: "Aruba", type: "switch" },
  "a4:83:e7": { vendor: "Apple", type: "endpoint" },
  "00:14:22": { vendor: "Dell", type: "server" },
  "00:1b:21": { vendor: "Intel", type: "server" },
};

function normalizeMac(mac) {
  if (!mac) return null;
  const clean = mac.replace(/[^0-9a-fA-F]/g, '').toLowerCase();
  if (clean.length !== 12) return mac.trim().toLowerCase();
  return clean.match(/.{1,2}/g).join(':');
}

function normalizeInterface(port) {
  if (!port) return "";
  let p = port.trim();
  p = p.replace(/^GigabitEthernet/i, "Gi")
       .replace(/^TenGigabitEthernet/i, "Te")
       .replace(/^TwentyFiveGigE/i, "Twe")
       .replace(/^FortyGigabitEthernet/i, "Fo")
       .replace(/^HundredGigE/i, "Hu")
       .replace(/^FastEthernet/i, "Fa")
       .replace(/^Port-channel/i, "Po");
  return p;
}

function getDemoTopology() {
  return {
    nodes: [
      { id: "fg-edge-01", label: "FG-EDGE-01", type: "firewall", ip: "10.0.0.254", mac: "04:D5:90:12:34:56", tier: 1, role: "Firewall" },
      { id: "sw-core-01", label: "SW-CORE-01", type: "core-switch", ip: "10.0.0.1", mac: "00:1A:2B:3C:4D:01", tier: 2, role: "Core" },
      { id: "sw-dist-01", label: "SW-DIST-01", type: "switch", ip: "10.0.0.2", mac: "00:1A:2B:3C:4D:02", tier: 3, role: "Distribution" },
      { id: "sw-dist-02", label: "SW-DIST-02", type: "switch", ip: "10.0.0.3", mac: "00:1A:2B:3C:4D:03", tier: 3, role: "Distribution" },
      { id: "sw-acc-01", label: "SW-ACC-01", type: "switch", ip: "10.0.0.11", mac: "00:1A:2B:3C:4D:04", tier: 4, role: "Access" },
      { id: "app-server-01", label: "App-Server-01", type: "server", ip: "10.0.10.11", mac: "00:50:56:8E:12:01", tier: 5, role: "Server" },
      { id: "db-server-02", label: "DB-Server-02", type: "server", ip: "10.0.10.12", mac: "00:50:56:8E:12:02", tier: 5, role: "Server" },
      { id: "nas-storage-01", label: "Synology-NAS-01", type: "storage", ip: "10.0.20.50", mac: "00:11:32:AA:BB:CC", tier: 5, role: "Storage" }
    ],
    edges: [
      { from: "sw-core-01", to: "fg-edge-01", fromPort: "Gi1/0/24", toPort: "port1", confidence: 0.8, status: "confirmed" },
      { from: "sw-core-01", to: "sw-dist-01", fromPort: "Te1/1/1", toPort: "Te1/1/1", confidence: 1.0, status: "confirmed" },
      { from: "sw-core-01", to: "sw-dist-02", fromPort: "Te1/1/2", toPort: "Te1/1/1", confidence: 0.8, status: "confirmed" },
      { from: "sw-dist-01", to: "sw-acc-01", fromPort: "Gi1/0/24", toPort: "Gi0/24", confidence: 0.94, status: "confirmed" },
      { from: "sw-acc-01", to: "app-server-01", fromPort: "Gi0/1", toPort: "eth0", confidence: 0.45, status: "inferred" },
      { from: "sw-acc-01", to: "db-server-02", fromPort: "Gi0/2", toPort: "eth0", confidence: 0.45, status: "inferred" },
      { from: "sw-acc-01", to: "nas-storage-01", fromPort: "Gi0/3", toPort: "eth0", confidence: 0.45, status: "inferred" }
    ]
  };
}

function getImageDemoTopology() {
  return {
    nodes: [
      { id: "fg-edge-01", label: "Edge-Firewall-Rose", type: "firewall", ip: "10.0.0.254", mac: "00:90:7F:12:34:56", tier: 1, role: "Firewall" },
      { id: "core-switch-a", label: "Core-Switch-A", type: "core-switch", ip: "10.0.0.1", mac: "00:1A:2B:3C:4D:01", tier: 2, role: "Core" },
      { id: "backup-nas-01", label: "Backup-NAS-Purple", type: "storage", ip: "10.0.20.100", mac: "00:11:0A:9C:3E:99", tier: 5, role: "Storage" },
      { id: "web-server-01", label: "Web-Server-01", type: "server", ip: "10.0.10.20", mac: "00:50:56:8E:12:10", tier: 5, role: "Server" }
    ],
    edges: [
      { from: "core-switch-a", to: "fg-edge-01", fromPort: "TenGi1/24", toPort: "wan0", confidence: 0.8, status: "confirmed" },
      { from: "core-switch-a", to: "backup-nas-01", fromPort: "Gi0/22", toPort: "eth1", confidence: 0.45, status: "inferred" },
      { from: "core-switch-a", to: "web-server-01", fromPort: "Gi0/15", toPort: "eth0", confidence: 0.45, status: "inferred" }
    ]
  };
}

/**
 * Multi-Vendor Parser & Multi-Source Inference Engine for CLI Outputs
 */
function parseMultiVendorConsole(text) {
  const nodes = [];
  const edges = [];
  const devMap = new Map();

  // 1. Detect local hostname
  let localHostname = "SW-CORE-01";
  const hostMatch = text.match(/(?:hostname\s+([A-Za-z0-9_-]+)|([A-Za-z0-9_-]+)[#|>]\s*(?:show|get|diagnose))/i);
  if (hostMatch) {
    localHostname = (hostMatch[1] || hostMatch[2]).trim();
  }

  const localId = localHostname.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const localType = localHostname.toLowerCase().includes("core") ? "core-switch" : 
                    (localHostname.toLowerCase().includes("fw") ? "firewall" : "switch");

  const localNode = {
    id: localId,
    label: localHostname,
    type: localType,
    ip: "10.0.0.1",
    mac: "00:1A:2B:3C:4D:01",
    tier: localType === "firewall" ? 1 : (localType === "core-switch" ? 2 : 3),
    role: localType === "core-switch" ? "Core" : (localType === "firewall" ? "Firewall" : "Distribution")
  };
  devMap.set(localId, localNode);

  // 2. Parse LLDP / CDP detail blocks
  const lldpBlocks = text.split(/-{5,}/);
  for (const block of lldpBlocks) {
    if (!block.trim()) continue;

    const locPortM = block.match(/(?:Local Interface|Local Intf|Interface|Port):\s*([^\r\n]+)/i);
    // Prioritize System Name over Device ID over Chassis ID
    let remDev = null;
    const sysNameM = block.match(/System Name:\s*([^\r\n]+)/i);
    const devIdM = block.match(/Device ID:\s*([^\r\n]+)/i);
    const chassisM = block.match(/Chassis (?:id|ID):\s*([^\r\n]+)/i);
    if (sysNameM) remDev = sysNameM[1].trim();
    else if (devIdM) remDev = devIdM[1].trim();
    else if (chassisM) remDev = chassisM[1].trim();

    const remPortM = block.match(/(?:Port (?:id|ID)|Port Description|Port ID \(outgoing port\)):\s*([^\r\n]+)/i);
    const mgmtIpM = block.match(/(?:Management Addresses?|IP(?: address)?|Entry address\(es\):[\s\S]*?IP address):\s*(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/i);
    const platformM = block.match(/(?:System Description|Platform):\s*([^\r\n]+)/i);

    if (locPortM && remDev && remPortM) {
      const lPort = normalizeInterface(locPortM[1].trim());
      const rPort = normalizeInterface(remPortM[1].trim());
      const cleanRemId = remDev.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const remIp = mgmtIpM ? mgmtIpM[1].trim() : null;
      const platform = platformM ? platformM[1].trim() : null;

      // Infer remote device type & role
      let type = "switch";
      let role = "Access";
      let tier = 4;
      const s = `${remDev} ${platform || ''}`.toLowerCase();
      if (s.includes("fw") || s.includes("firewall") || s.includes("fortigate")) {
        type = "firewall"; role = "Firewall"; tier = 1;
      } else if (s.includes("core")) {
        type = "core-switch"; role = "Core"; tier = 2;
      } else if (s.includes("dist")) {
        type = "switch"; role = "Distribution"; tier = 3;
      } else if (s.includes("server") || s.includes("esxi")) {
        type = "server"; role = "Server"; tier = 5;
      } else if (s.includes("storage") || s.includes("nas") || s.includes("san")) {
        type = "storage"; role = "Storage"; tier = 5;
      }

      if (!devMap.has(cleanRemId)) {
        devMap.set(cleanRemId, {
          id: cleanRemId,
          label: remDev,
          type: type,
          ip: remIp,
          mac: null,
          tier: tier,
          role: role
        });
      } else if (remIp && !devMap.get(cleanRemId).ip) {
        devMap.get(cleanRemId).ip = remIp;
      }

      edges.push({
        from: localId,
        to: cleanRemId,
        fromPort: lPort,
        toPort: rPort,
        confidence: 0.8,
        sources: ["lldp_cdp"],
        status: "confirmed"
      });
    }
  }

  // 3. Parse MAC address table entries
  const macLines = text.match(/^\s*\*?\s*(\d+|All)\s+([0-9a-fA-F.]{14}|[0-9a-fA-F:]{17}|[0-9a-fA-F-]{17})\s+(\S+)\s+(\S+)/gm);
  if (macLines) {
    const portMacs = new Map();
    for (const line of macLines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 4) {
        const vlan = parts[0];
        const mac = normalizeMac(parts[1]);
        const port = normalizeInterface(parts[3]);
        if (port.toLowerCase() === "cpu" || port.toLowerCase() === "drop") continue;

        if (!portMacs.has(port)) portMacs.set(port, []);
        portMacs.get(port).push({ vlan, mac, port });
      }
    }

    // Infer endpoints on access ports with 1 MAC
    for (const [port, macs] of portMacs.entries()) {
      // Check if port already has a neighbor link
      const hasNeighbor = edges.some(e => (e.from === localId && e.fromPort === port) || (e.to === localId && e.toPort === port));
      if (macs.length === 1 && !hasNeighbor) {
        const singleMac = macs[0].mac;
        const prefix = singleMac.substring(0, 8);
        const ouiInfo = OUI_MAP[prefix] || { vendor: "Host", type: "endpoint" };
        const epId = `ep-${ouiInfo.vendor.toLowerCase()}-${singleMac.replace(/:/g, '').slice(-6)}`;
        
        if (!devMap.has(epId)) {
          devMap.set(epId, {
            id: epId,
            label: `${ouiInfo.vendor}-${singleMac.slice(-8)}`,
            type: ouiInfo.type,
            ip: null,
            mac: singleMac,
            tier: 5,
            role: ouiInfo.type === "storage" ? "Storage" : (ouiInfo.type === "server" ? "Server" : "Endpoint")
          });
        }

        edges.push({
          from: localId,
          to: epId,
          fromPort: port,
          toPort: "eth0",
          confidence: 0.45,
          sources: ["mac_table_single_host"],
          status: "inferred"
        });
      }
    }
  }

  // 4. Parse ARP Table for IP correlation
  const arpMatches = text.matchAll(/Internet\s+(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\s+\S+\s+([0-9a-fA-F.]{14}|[0-9a-fA-F:]{17})/gi);
  for (const m of arpMatches) {
    const ip = m[1];
    const mac = normalizeMac(m[2]);
    for (const dev of devMap.values()) {
      if (dev.mac && normalizeMac(dev.mac) === mac && !dev.ip) {
        dev.ip = ip;
      }
    }
  }

  return {
    nodes: Array.from(devMap.values()),
    edges: edges
  };
}

function computeTopology(existing, parsed, mode) {
  if (mode === 'replace') {
    return parsed;
  }

  const nodes = [...existing.nodes];
  const edges = [...existing.edges];

  const getCleanId = (id, label) => {
    if (id) return id.toLowerCase().replace(/[^a-z0-9]/g, '-');
    if (label) return label.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return Math.random().toString(36).substr(2, 9);
  };

  if (parsed && parsed.nodes) {
    parsed.nodes.forEach(pNode => {
      const cleanId = getCleanId(pNode.id, pNode.label);
      const existingNodeIdx = nodes.findIndex(n => n.id === cleanId || (n.label && n.label.toLowerCase() === pNode.label.toLowerCase()));

      if (existingNodeIdx >= 0) {
        nodes[existingNodeIdx] = {
          ...nodes[existingNodeIdx],
          ...pNode,
          id: nodes[existingNodeIdx].id
        };
      } else {
        nodes.push({
          ...pNode,
          id: cleanId
        });
      }
    });
  }

  if (parsed && parsed.edges) {
    parsed.edges.forEach(pEdge => {
      const fromId = getCleanId(pEdge.from);
      const toId = getCleanId(pEdge.to);

      const duplicate = edges.find(e => 
        (e.from === fromId && e.to === toId && e.fromPort === pEdge.fromPort && e.toPort === pEdge.toPort) ||
        (e.from === toId && e.to === fromId && e.fromPort === pEdge.toPort && e.toPort === pEdge.fromPort)
      );

      if (!duplicate && fromId !== toId) {
        edges.push({
          from: fromId,
          to: toId,
          fromPort: pEdge.fromPort || "",
          toPort: pEdge.toPort || "",
          confidence: pEdge.confidence !== undefined ? pEdge.confidence : 0.8,
          status: pEdge.status || (pEdge.confidence >= 0.8 ? "confirmed" : "inferred"),
          sources: pEdge.sources || ["manual"]
        });
      }
    });
  }

  return { nodes, edges };
}

/**
 * Generate native Draw.io mxGraphModel XML from topology data
 */
function generateDrawioXml(topology) {
  const nodes = topology.nodes || [];
  const edges = topology.edges || [];

  // 5-tier layout calculation
  const tiers = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  nodes.forEach(n => {
    let t = n.tier;
    if (!t) {
      if (n.type === 'firewall') t = 1;
      else if (n.type === 'core-switch') t = 2;
      else if (n.type === 'switch') t = 3;
      else t = 5;
    }
    if (!tiers[t]) tiers[t] = [];
    tiers[t].push(n);
  });

  const positions = new Map();
  const canvasWidth = 1600;
  const tierHeight = 160;
  const topMargin = 50;

  for (let t = 1; t <= 5; t++) {
    const list = tiers[t] || [];
    if (list.length === 0) continue;
    const y = topMargin + (t - 1) * tierHeight;
    const spacing = Math.floor(canvasWidth / (list.length + 1));
    list.forEach((node, idx) => {
      const x = spacing * (idx + 1);
      positions.set(node.id, { x, y });
    });
  }

  const roleStyles = {
    "firewall": "rounded=1;whiteSpace=wrap;html=1;fillColor=#ffe4e6;strokeColor=#e11d48;strokeWidth=2;fontStyle=1;fontSize=11;fontColor=#881337;",
    "core-switch": "rounded=1;whiteSpace=wrap;html=1;fillColor=#fef3c7;strokeColor=#d97706;strokeWidth=2;fontStyle=1;fontSize=11;fontColor=#78350f;",
    "switch": "rounded=1;whiteSpace=wrap;html=1;fillColor=#e0f2fe;strokeColor=#0284c7;strokeWidth=2;fontStyle=1;fontSize=11;fontColor=#0369a1;",
    "server": "rounded=1;whiteSpace=wrap;html=1;fillColor=#ccfbf1;strokeColor=#0d9488;strokeWidth=1.5;fontSize=11;fontColor=#134e4a;",
    "storage": "rounded=1;whiteSpace=wrap;html=1;fillColor=#f3e8ff;strokeColor=#9333ea;strokeWidth=1.5;fontSize=11;fontColor=#581c87;",
    "endpoint": "rounded=1;whiteSpace=wrap;html=1;fillColor=#f8fafc;strokeColor=#64748b;strokeWidth=1;fontSize=10;fontColor=#334155;",
  };

  const escapeXml = (str) => {
    if (!str) return "";
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<mxfile host="Electron" agent="NTIP-Platform" version="21.0.0" type="device">\n';
  xml += '  <diagram id="ntip-topology" name="Network Topology">\n';
  xml += '    <mxGraphModel dx="1600" dy="1000" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1920" pageHeight="1080" math="0" shadow="1">\n';
  xml += '      <root>\n';
  xml += '        <mxCell id="0" />\n';
  xml += '        <mxCell id="1" parent="0" />\n';

  // Add Nodes
  const nodeW = 150, nodeH = 60;
  nodes.forEach(n => {
    const pos = positions.get(n.id) || { x: 300, y: 300 };
    const style = roleStyles[n.type] || roleStyles["switch"];
    const labelLines = [`<b>${escapeXml(n.label)}</b>`];
    if (n.ip) labelLines.push(`<span style='font-size:10px;color:#64748b;'>${escapeXml(n.ip)}</span>`);
    const val = escapeXml(labelLines.join("<br>"));

    xml += `        <mxCell id="node_${n.id}" value="${val}" style="${style}" vertex="1" parent="1">\n`;
    xml += `          <mxGeometry x="${pos.x - nodeW / 2}" y="${pos.y - nodeH / 2}" width="${nodeW}" height="${nodeH}" as="geometry" />\n`;
    xml += `        </mxCell>\n`;
  });

  // Add Edges
  edges.forEach((e, idx) => {
    const conf = e.confidence !== undefined ? e.confidence : 0.8;
    let strokeStyle = "strokeColor=#0284c7;strokeWidth=2.5;";
    if (conf < 0.6) strokeStyle = "strokeColor=#ef4444;strokeWidth=1.5;dashed=1;";
    else if (conf < 0.8) strokeStyle = "strokeColor=#f59e0b;strokeWidth=2;dashed=1;";

    let label = "";
    if (e.fromPort || e.toPort) {
      label = `${escapeXml(e.fromPort || '')} &#x2794; ${escapeXml(e.toPort || '')}`;
      if (conf < 1.0) label += ` (${Math.round(conf * 100)}%)`;
    }

    const edgeStyle = `edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;${strokeStyle}fontSize=9;fontColor=#475569;labelBackgroundColor=#ffffff;`;
    xml += `        <mxCell id="edge_${idx}" value="${label}" style="${edgeStyle}" edge="1" parent="1" source="node_${e.from}" target="node_${e.to}">\n`;
    xml += `          <mxGeometry relative="1" as="geometry" />\n`;
    xml += `        </mxCell>\n`;
  });

  xml += '      </root>\n';
  xml += '    </mxGraphModel>\n';
  xml += '  </diagram>\n';
  xml += '</mxfile>';

  return xml;
}

/**
 * Compare two topology snapshots
 */
function compareTopologies(t1, t2) {
  const nodes1 = (t1 && t1.nodes) || [];
  const nodes2 = (t2 && t2.nodes) || [];
  const edges1 = (t1 && t1.edges) || [];
  const edges2 = (t2 && t2.edges) || [];

  const map1 = new Map(nodes1.map(n => [n.id, n]));
  const map2 = new Map(nodes2.map(n => [n.id, n]));

  const addedNodes = nodes2.filter(n => !map1.has(n.id));
  const removedNodes = nodes1.filter(n => !map2.has(n.id));

  const edgeKey = (e) => [e.from, e.to].sort().join("<->");
  const edgeFullKey = (e) => `${e.from}:${e.fromPort}<->${e.to}:${e.toPort}`;

  const eMap1 = new Map(edges1.map(e => [edgeFullKey(e), e]));
  const eMap2 = new Map(edges2.map(e => [edgeFullKey(e), e]));

  const ePairMap1 = new Map(edges1.map(e => [edgeKey(e), e]));
  const ePairMap2 = new Map(edges2.map(e => [edgeKey(e), e]));

  const addedEdges = [];
  const removedEdges = [];
  const changedEdges = [];

  edges2.forEach(e => {
    const k = edgeFullKey(e);
    if (!eMap1.has(k)) {
      const pair = edgeKey(e);
      if (ePairMap1.has(pair)) {
        const oldE = ePairMap1.get(pair);
        changedEdges.push({
          devices: pair,
          before: `${oldE.fromPort} <-> ${oldE.toPort}`,
          after: `${e.fromPort} <-> ${e.toPort}`
        });
      } else {
        addedEdges.push(e);
      }
    }
  });

  edges1.forEach(e => {
    const k = edgeFullKey(e);
    const pair = edgeKey(e);
    if (!eMap2.has(k) && !ePairMap2.has(pair)) {
      removedEdges.push(e);
    }
  });

  const summary = `Diff Result: +${addedNodes.length}/-${removedNodes.length} Nodes, +${addedEdges.length}/-${removedEdges.length} Links, ${changedEdges.length} Port changes`;

  return {
    addedNodes,
    removedNodes,
    addedEdges,
    removedEdges,
    changedEdges,
    summary
  };
}

function performMockAudit(topology) {
  const audits = [];
  const nodes = topology.nodes || [];
  const edges = topology.edges || [];

  const switches = nodes.filter(n => n.type === 'switch' || n.type === 'core-switch');
  const firewalls = nodes.filter(n => n.type === 'firewall');
  const storageNodes = nodes.filter(n => n.type === 'storage');

  if (switches.length > 0) {
    storageNodes.forEach(st => {
      const connections = edges.filter(e => e.from === st.id || e.to === st.id);
      if (connections.length < 2) {
        audits.push({
          id: `audit-red-${st.id}`,
          type: "warning",
          category: "Redundancy",
          title: `Single Path Connection to Storage: ${st.label}`,
          description: `Storage device ${st.label} has only ${connections.length} path(s). Highly critical SAN/NAS storage arrays should utilize dual-controller connections to redundant switches for path failover.`
        });
      } else {
        audits.push({
          id: `audit-red-${st.id}`,
          type: "success",
          category: "Redundancy",
          title: `Multi-Pathing Active for ${st.label}`,
          description: `Storage device ${st.label} is properly connected via ${connections.length} paths to the core network.`
        });
      }
    });
  }

  if (firewalls.length === 0) {
    audits.push({
      id: "audit-sec-no-fw",
      type: "danger",
      category: "Security",
      title: "No Perimeter Firewall Detected",
      description: "No firewall nodes are detected in your topology diagram. This exposes all internal distribution switches and servers directly to external perimeter threats."
    });
  } else {
    firewalls.forEach(fw => {
      const links = edges.filter(e => e.from === fw.id || e.to === fw.id);
      if (links.length === 0) {
        audits.push({
          id: `audit-sec-fw-${fw.id}`,
          type: "warning",
          category: "Security",
          title: `Isolated Firewall: ${fw.label}`,
          description: `Firewall ${fw.label} is defined but not linked to any active switches. Security policy cannot be applied.`
        });
      } else {
        audits.push({
          id: `audit-sec-fw-ok-${fw.id}`,
          type: "success",
          category: "Security",
          title: `Perimeter Shield Active: ${fw.label}`,
          description: `Firewall ${fw.label} is in line and protecting the internal network switches.`
        });
      }
    });
  }

  const missingIPs = nodes.filter(n => !n.ip);
  if (missingIPs.length > 0) {
    audits.push({
      id: "audit-cfg-ip",
      type: "info",
      category: "Configuration",
      title: "Missing Management IP Addresses",
      description: `${missingIPs.length} device(s) (e.g., ${missingIPs.slice(0, 3).map(n => n.label).join(', ')}) lack management IP addresses, which prevents remote monitoring via SNMP/SSH.`
    });
  }

  const coreSwitches = nodes.filter(n => n.type === 'core-switch');
  if (coreSwitches.length > 1) {
    const coreIds = coreSwitches.map(c => c.id);
    const hasCoreInterlink = edges.some(e => coreIds.includes(e.from) && coreIds.includes(e.to));
    if (!hasCoreInterlink) {
      audits.push({
        id: "audit-red-core-link",
        type: "danger",
        category: "Redundancy",
        title: "Split-Brain Core Switch Setup",
        description: "Multiple core switches detected but no direct inter-switch link (ISL / Port Channel) connects them. This can cause severe routing split-brain issues."
      });
    }
  }

  const dangerCount = audits.filter(a => a.type === 'danger').length;
  const warningCount = audits.filter(a => a.type === 'warning').length;
  let healthScore = 100 - (dangerCount * 30) - (warningCount * 15);
  healthScore = Math.max(10, Math.min(100, healthScore));

  return {
    healthScore,
    audits
  };
}

module.exports = {
  getDemoTopology,
  getImageDemoTopology,
  computeTopology,
  parseMultiVendorConsole,
  generateDrawioXml,
  compareTopologies,
  performMockAudit
};
