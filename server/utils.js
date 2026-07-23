function getDemoTopology() {
  return {
    nodes: [
      { id: "core-switch-a", label: "Core-Switch-A", type: "core-switch", ip: "10.0.0.1", mac: "00:1A:2B:3C:4D:01" },
      { id: "dist-switch-1", label: "Dist-Switch-01", type: "switch", ip: "10.0.0.2", mac: "00:1A:2B:3C:4D:02" },
      { id: "dist-switch-2", label: "Dist-Switch-02", type: "switch", ip: "10.0.0.3", mac: "00:1A:2B:3C:4D:03" },
      { id: "app-server-01", label: "App-Server-01", type: "server", ip: "10.0.10.11", mac: "00:50:56:8E:12:01" },
      { id: "db-server-02", label: "DB-Server-02", type: "server", ip: "10.0.10.12", mac: "00:50:56:8E:12:02" },
      { id: "san-storage-01", label: "SAN-Storage-Cabinet-1", type: "storage", ip: "10.0.20.5", mac: "00:11:0A:9C:3E:88" },
      { id: "edge-firewall", label: "Edge-Firewall-Rose", type: "firewall", ip: "10.0.0.254", mac: "00:90:7F:12:34:56" }
    ],
    edges: [
      { from: "core-switch-a", to: "dist-switch-1", fromPort: "TenGi1/1", toPort: "Gi0/1" },
      { from: "core-switch-a", to: "dist-switch-2", fromPort: "TenGi1/2", toPort: "Gi0/1" },
      { from: "dist-switch-1", to: "app-server-01", fromPort: "Gi0/10", toPort: "eth0" },
      { from: "dist-switch-2", to: "db-server-02", fromPort: "Gi0/12", toPort: "eth0" },
      { from: "dist-switch-1", to: "san-storage-01", fromPort: "Gi0/24", toPort: "fc0/1" },
      { from: "dist-switch-2", to: "san-storage-01", fromPort: "Gi0/24", toPort: "fc0/2" },
      { from: "core-switch-a", to: "edge-firewall", fromPort: "TenGi1/24", toPort: "wan0" }
    ]
  };
}

function getImageDemoTopology() {
  return {
    nodes: [
      { id: "core-switch-a", label: "Core-Switch-A", type: "core-switch", ip: "10.0.0.1", mac: "00:1A:2B:3C:4D:01" },
      { id: "edge-firewall", label: "Edge-Firewall-Rose", type: "firewall", ip: "10.0.0.254", mac: "00:90:7F:12:34:56" },
      { id: "backup-nas-01", label: "Backup-NAS-Purple", type: "storage", ip: "10.0.20.100", mac: "00:11:0A:9C:3E:99" },
      { id: "web-server-01", label: "Web-Server-01", type: "server", ip: "10.0.10.20", mac: "00:50:56:8E:12:10" }
    ],
    edges: [
      { from: "core-switch-a", to: "edge-firewall", fromPort: "TenGi1/24", toPort: "wan0" },
      { from: "core-switch-a", to: "backup-nas-01", fromPort: "Gi0/22", toPort: "eth1" },
      { from: "core-switch-a", to: "web-server-01", fromPort: "Gi0/15", toPort: "eth0" }
    ]
  };
}

function computeTopology(existing, parsed, mode) {
  // mode is 'append' or 'replace'
  if (mode === 'replace') {
    return parsed;
  }

  const nodes = [...existing.nodes];
  const edges = [...existing.edges];

  // Helper to standardise id
  const getCleanId = (id, label) => {
    if (id) return id.toLowerCase().replace(/[^a-z0-9]/g, '-');
    if (label) return label.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return Math.random().toString(36).substr(2, 9);
  };

  // Add nodes
  if (parsed && parsed.nodes) {
    parsed.nodes.forEach(pNode => {
      const cleanId = getCleanId(pNode.id, pNode.label);
      const existingNodeIdx = nodes.findIndex(n => n.id === cleanId || (n.label && n.label.toLowerCase() === pNode.label.toLowerCase()));

      if (existingNodeIdx >= 0) {
        // Merge attributes
        nodes[existingNodeIdx] = {
          ...nodes[existingNodeIdx],
          ...pNode,
          id: nodes[existingNodeIdx].id // preserve original id
        };
      } else {
        nodes.push({
          ...pNode,
          id: cleanId
        });
      }
    });
  }

  // Add edges (prevent duplicates)
  if (parsed && parsed.edges) {
    parsed.edges.forEach(pEdge => {
      const fromId = getCleanId(pEdge.from);
      const toId = getCleanId(pEdge.to);

      // Check for direct duplicate or reversed duplicate
      const duplicate = edges.find(e => 
        (e.from === fromId && e.to === toId && e.fromPort === pEdge.fromPort && e.toPort === pEdge.toPort) ||
        (e.from === toId && e.to === fromId && e.fromPort === pEdge.toPort && e.toPort === pEdge.fromPort)
      );

      if (!duplicate && fromId !== toId) {
        edges.push({
          from: fromId,
          to: toId,
          fromPort: pEdge.fromPort || "",
          toPort: pEdge.toPort || ""
        });
      }
    });
  }

  return { nodes, edges };
}

function performMockAudit(topology) {
  const audits = [];
  const nodes = topology.nodes || [];
  const edges = topology.edges || [];

  // Check 1: Redundancy Audit
  const switches = nodes.filter(n => n.type === 'switch' || n.type === 'core-switch');
  const firewalls = nodes.filter(n => n.type === 'firewall');
  const storageNodes = nodes.filter(n => n.type === 'storage');

  // Redundancy audit
  if (switches.length > 0) {
    // Check if storage has multi-pathing (connected to > 1 switch/path)
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

  // Check 2: Firewall Security
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

  // Check 3: IP Configuration / Management
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

  // Check 4: Network Redundancy (Core loops or links)
  const coreSwitches = nodes.filter(n => n.type === 'core-switch');
  if (coreSwitches.length > 1) {
    // Check if there is an inter-link between cores
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

  // Add overall health status
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
  performMockAudit
};
