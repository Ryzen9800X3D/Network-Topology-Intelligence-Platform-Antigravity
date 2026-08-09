import React, { useState, useEffect, useRef } from 'react';
import { 
  Network, 
  Cpu, 
  Shield, 
  HardDrive, 
  Terminal, 
  Image as ImageIcon, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  X, 
  Activity, 
  Upload, 
  RefreshCw 
} from 'lucide-react';
import { DataSet } from 'vis-data';
import { Network as VisNetwork } from 'vis-network';
import { getIconDataUrl } from './icons';

// ==================== i18n Translations ====================
const translations = {
  zh: {
    title: 'NOC 拓撲發現中心',
    apiConnected: 'Gemini AI 已啟用',
    apiMock: '本地 MOCK 模式',
    apiOffline: '離線',
    nodes: '節點',
    edges: '連線',
    topologyCanvasEmpty: '拓撲畫布為空',
    uploadOrPaste: '上傳拓撲圖或貼上 CLI 日誌到側邊欄即可視覺化。',
    aiDiscovery: 'AI 發現',
    nocSecurityAudit: 'NOC 安全稽核',
    discoveryInputs: '發現輸入',
    consoleTextLogs: 'Console 文字日誌',
    topologyDiagramImage: '拓撲圖影像',
    pasteNetworkConsoleOutput: '在此貼上網路控制台輸出…（例如 show lldp neighbors detail, show mac address-table, show cdp neighbors detail）',
    mergeMode: '合併模式',
    appendToCanvas: '附加到畫布',
    replaceCanvas: '替換畫布',
    runAITextDiscovery: '執行 AI 文字發現',
    uploadArchitectureDiagram: '上傳架構圖 / 白板草圖',
    dragDropDiagram: '拖放拓撲圖到此處',
    supportsFormats: '支援 PNG, JPG, SVG 或白板照片',
    runMultimodalAI: '執行多模態 AI OCR',
    manualBuilder: '手動建置',
    hideBuilder: '隱藏建置器',
    loadNocDemo: '載入 NOC 範例',
    resetTopologyCanvas: '重置拓撲畫布',
    manualNetworkBuilder: '手動網路建置器',
    addInfrastructureDevice: '新增基礎設施設備',
    hostname: '主機名稱',
    deviceRole: '設備角色',
    managementIP: '管理 IP',
    macAddress: 'MAC 位址',
    addNodeToCanvas: '新增節點到畫布',
    connectDevicePorts: '連接設備埠',
    sourceNode: '源節點',
    destinationNode: '目標節點',
    outboundPort: '出埠',
    inboundPort: '入埠',
    connectInterfaces: '連接介面',
    addAtLeast2Devices: '至少新增 2 台設備以啟用實體埠連線。',
    networkAuditCenter: '網路稽核中心',
    securityShieldHealth: '安全防護健康度',
    satisfactoryNetworkPosture: '網路狀態良好。冗餘與防火牆運作正常。',
    vulnerabilitiesDetected: '偵測到漏洞。存在關鍵冗餘警報。',
    severeNetworkPostureIssues: '嚴重網路問題。核心分裂或邊界威脅已暴露。',
    noAuditItemsGenerated: '未產生稽核項目。',
    reAuditActiveTopology: '重新稽核當前拓撲',
    generateSecurityAudit: '產生安全稽核',
    noActiveAuditReport: '尚未載入稽核報告。',
    deviceType: '設備類型',
    managementIPLabel: '管理 IP',
    physicalMAC: '實體 MAC',
    activeLinks: '活躍連線',
    fromHost: '來源主機',
    toHost: '目標主機',
    outboundPortLabel: '出埠',
    inboundPortLabel: '入埠',
    notAutoDetected: '未自動偵測',
    cannotConnectToItself: '無法將設備連接到自身。',
    physicalConnectionExists: '這些設備之間已存在實體連線。',
    deviceWithHostnameAlreadyExists: '已存在相同主機名稱的設備。',
    discoveryError: '發現錯誤：',
    failedToConnectBackend: '無法連接後端伺服器。請確保伺服器運行在 3001 端口。',
    failedToExecuteImageOCR: '多模態影像分析執行失敗。',
    auditError: '稽核錯誤：',
    failedToRunSystemAudit: '系統稽核執行失敗。',
    areYouSureWipeCanvas: '確定要清除當前畫布並重新開始嗎？',
    footerText: 'NOC 自動發現引擎 &bull; Antigravity 智能設計 © 2026',
    language: '語言',
    selectLanguage: '選擇語言',
    coreSwitch: '核心交換器',
    switch: '交換器',
    server: '伺服器',
    storage: '儲存設備 SAN/NAS',
    firewall: '防火牆',
    select: '-- 請選擇 --',
    mockModeWarning: '伺服器運行在 MOCK 模式（無 GEMINI_API_KEY）。',
    cannotConnectToServerWarning: '無法連接後端伺服器。請確保伺服器運行在 3001 端口。',
  },
  en: {
    title: 'NOC Topology Discovery Center',
    apiConnected: 'Gemini AI Active',
    apiMock: 'Local MOCK Mode',
    apiOffline: 'Offline',
    nodes: 'Nodes',
    edges: 'Edges',
    topologyCanvasEmpty: 'Topology Canvas Empty',
    uploadOrPaste: 'Upload a topology diagram or paste CLI logs in the sidebar to visualize.',
    aiDiscovery: 'AI Discovery',
    nocSecurityAudit: 'NOC Security Audit',
    discoveryInputs: 'Discovery Inputs',
    consoleTextLogs: 'Console Text Logs',
    topologyDiagramImage: 'Topology Diagram Image',
    pasteNetworkConsoleOutput: 'Paste network console output here... (e.g. show lldp neighbors detail, show mac address-table, show cdp neighbors detail)',
    mergeMode: 'Merge Mode',
    appendToCanvas: 'Append to Canvas',
    replaceCanvas: 'Replace Canvas',
    runAITextDiscovery: 'Run AI Text Discovery',
    uploadArchitectureDiagram: 'Upload Architecture Diagram / Whiteboard Sketch',
    dragDropDiagram: 'Drag & drop your diagram image here',
    supportsFormats: 'Supports PNG, JPG, SVG or whiteboard photos',
    runMultimodalAI: 'Run Multimodal AI OCR',
    manualBuilder: 'Manual Builder',
    hideBuilder: 'Hide Builder',
    loadNocDemo: 'Load NOC Demo',
    resetTopologyCanvas: 'Reset topology Canvas',
    manualNetworkBuilder: 'Manual Network Builder',
    addInfrastructureDevice: 'ADD INFRASTRUCTURE DEVICE',
    hostname: 'Hostname',
    deviceRole: 'Device Role',
    managementIP: 'Management IP',
    macAddress: 'MAC Address',
    addNodeToCanvas: 'Add Node to Canvas',
    connectDevicePorts: 'CONNECT DEVICE PORTS',
    sourceNode: 'Source Node',
    destinationNode: 'Destination Node',
    outboundPort: 'Outbound Port',
    inboundPort: 'Inbound Port',
    connectInterfaces: 'Connect Interfaces',
    addAtLeast2Devices: 'Add at least 2 devices to enable physical port linkage.',
    networkAuditCenter: 'Network Audit Center',
    securityShieldHealth: 'Security Shield Health',
    satisfactoryNetworkPosture: 'Satisfactory network posture. Redundancies and Firewalls active.',
    vulnerabilitiesDetected: 'Vulnerabilities detected. Critical redundancy alerts present.',
    severeNetworkPostureIssues: 'Severe network posture issues. Core split-brain or perimeter threat exposed.',
    noAuditItemsGenerated: 'No audit items generated.',
    reAuditActiveTopology: 'Re-Audit Active Topology',
    generateSecurityAudit: 'Generate Security Audit',
    noActiveAuditReport: 'No active audit report loaded.',
    deviceType: 'Device Type',
    managementIPLabel: 'Management IP',
    physicalMACLabel: 'Physical MAC',
    activeLinks: 'Active Links',
    fromHost: 'From Host',
    toHost: 'To Host',
    outboundPortLabel: 'Outbound Port',
    inboundPortLabel: 'Inbound Port',
    notAutoDetected: 'Not Auto-detected',
    cannotConnectToItself: 'Cannot connect a device to itself.',
    physicalConnectionExists: 'A physical connection already exists between these devices.',
    deviceWithHostnameAlreadyExists: 'Device with this hostname already exists.',
    discoveryError: 'Discovery error: ',
    failedToConnectBackend: 'Failed to connect to backend server endpoint.',
    failedToExecuteImageOCR: 'Failed to execute image multimodal analysis.',
    auditError: 'Audit error: ',
    failedToRunSystemAudit: 'Failed to run system audit.',
    areYouSureWipeCanvas: 'Are you sure you want to wipe the current canvas and start from scratch?',
    footerText: 'NOC Auto-Discovery Engine &bull; Antigravity Agentic Design &copy; 2026',
    language: 'Language',
    selectLanguage: 'Select Language',
    coreSwitch: 'Core Switch',
    switch: 'Switch',
    server: 'Server',
    storage: 'Storage SAN/NAS',
    firewall: 'Firewall',
    select: '-- Select --',
    mockModeWarning: 'Server running in MOCK mode (No GEMINI_API_KEY).',
    cannotConnectToServerWarning: 'Cannot connect to backend server. Ensure server is running on port 3001.',
  }
};

export default function App() {
  const [lang, setLang] = useState('zh'); // 'zh' | 'en'
  const t = translations[lang];

  // Canvas data
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  
  // Selected node or edge in inspector
  const [selectedItem, setSelectedItem] = useState(null);
  
  // AI Discovery Panel States
  const [activeTab, setActiveTab] = useState('console'); // 'console' | 'image'
  const [consoleLog, setConsoleLog] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [mergeMode, setMergeMode] = useState('append'); // 'append' | 'replace'
  
  // App UI states
  const [loading, setLoading] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [serverMode, setServerMode] = useState('connecting'); // 'connected' | 'mock' | 'error'
  const [auditReport, setAuditReport] = useState(null);
  const [showManualBuilder, setShowManualBuilder] = useState(false);
  const [sidebarTab, setSidebarTab] = useState('discovery'); // 'discovery' | 'audit'

  // Load language preference from localStorage on mount
  useEffect(() => {
    const savedLang = localStorage.getItem('ntip-lang');
    if (savedLang && (savedLang === 'zh' || savedLang === 'en')) {
      setLang(savedLang);
    }
  }, []);

  // Save language preference when changed
  useEffect(() => {
    localStorage.setItem('ntip-lang', lang);
  }, [lang]);

  // Manual Node Builder Form
  const [newNode, setNewNode] = useState({
    label: '',
    type: 'switch',
    ip: '',
    mac: ''
  });

  // Manual Edge Builder Form
  const [newEdge, setNewEdge] = useState({
    from: '',
    to: '',
    fromPort: '',
    toPort: ''
  });

  const canvasRef = useRef(null);
  const networkRef = useRef(null);
  const fileInputRef = useRef(null);

  // Check backend server mode on mount
  useEffect(() => {
    fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topology: { nodes: [], edges: [] } })
    })
      .then(res => res.json())
      .then(data => {
        if (data.warning && data.warning.includes('Mock')) {
          setServerMode('mock');
          setWarningMessage(t.mockModeWarning);
        } else {
          setServerMode('connected');
          setWarningMessage('');
        }
      })
      .catch(err => {
        console.error('Cannot connect to server:', err);
        setServerMode('error');
        setWarningMessage(t.cannotConnectToServerWarning);
      });
  }, [t]);

  // Initialize and update vis-network canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    // Convert nodes to vis-network format
    const formattedNodes = nodes.map(n => ({
      id: n.id,
      label: `${n.label}\n${n.ip || ''}`,
      shape: 'image',
      image: getIconDataUrl(n.type),
      font: {
        color: '#0f172a',
        size: 11,
        face: 'Inter',
        background: 'rgba(255, 255, 255, 0.85)',
        padding: 3
      },
      borderWidth: 2,
      shadow: { enabled: true, color: 'rgba(0,0,0,0.1)', size: 4, x: 2, y: 2 }
    }));

    // Convert edges to vis-network format
    const formattedEdges = edges.map((e, idx) => ({
      id: `edge-${idx}`,
      from: e.from,
      to: e.to,
      label: (e.fromPort || e.toPort) ? `${e.fromPort || ''} ➔ ${e.toPort || ''}` : '',
      font: {
        color: '#475569',
        size: 9,
        face: 'Inter',
        background: 'rgba(255, 255, 255, 0.9)',
        align: 'middle'
      },
      color: {
        color: '#cbd5e1',
        highlight: '#0284c7',
        hover: '#0284c7'
      },
      width: 2,
      arrows: { to: { enabled: false } }
    }));

    const data = {
      nodes: new DataSet(formattedNodes),
      edges: new DataSet(formattedEdges)
    };

    const options = {
      physics: {
        enabled: true,
        solver: 'forceAtlas2Based',
        forceAtlas2Based: {
          gravitationalConstant: -70,
          centralGravity: 0.015,
          springLength: 120,
          springConstant: 0.05,
          damping: 0.4
        },
        stabilization: {
          iterations: 100,
          updateInterval: 25
        }
      },
      interaction: {
        hover: true,
        tooltipDelay: 200,
        selectConnectedEdges: true
      }
    };

    // Create or update network
    const network = new VisNetwork(canvasRef.current, data, options);
    networkRef.current = network;

    // Selection listener
    network.on('click', (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
          const connectedEdges = edges.filter(e => e.from === nodeId || e.to === nodeId);
          setSelectedItem({
            type: 'node',
            data: node,
            connections: connectedEdges.map(e => {
              const isSource = e.from === nodeId;
              const neighborId = isSource ? e.to : e.from;
              const neighbor = nodes.find(n => n.id === neighborId);
              return {
                hostname: neighbor ? neighbor.label : neighborId,
                localPort: isSource ? e.fromPort : e.toPort,
                remotePort: isSource ? e.toPort : e.fromPort
              };
            })
          });
        }
      } else if (params.edges.length > 0) {
        const edgeId = params.edges[0];
        const idx = parseInt(edgeId.replace('edge-', ''));
        const edge = edges[idx];
        if (edge) {
          const fromNode = nodes.find(n => n.id === edge.from);
          const toNode = nodes.find(n => n.id === edge.to);
          setSelectedItem({
            type: 'edge',
            data: edge,
            fromLabel: fromNode ? fromNode.label : edge.from,
            toLabel: toNode ? toNode.label : edge.to
          });
        }
      } else {
        setSelectedItem(null);
      }
    });

    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
    };
  }, [nodes, edges]);

  // Drag & Drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file) => {
    if (!file.type.startsWith('image/')) {
      alert(lang === 'zh' ? '僅支援影像檔案 (PNG, JPG, SVG, Visio 匯出)。' : 'Only image files (PNG, JPG, SVG, Visio export) are supported.');
      return;
    }
    setUploadedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Run AI Discovery (Text Logs)
  const runTextDiscovery = async () => {
    if (!consoleLog.trim()) return;
    setLoading(true);
    try {
      const response = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consoleLog,
          existingTopology: { nodes, edges },
          mergeMode
        })
      });
      const resData = await response.json();
      if (resData.success) {
        setNodes(resData.data.nodes);
        setEdges(resData.data.edges);
        if (resData.warning) {
          setWarningMessage(resData.warning);
        } else {
          setWarningMessage('');
        }
        // Run audit automatically on new discovery
        runAudit({ nodes: resData.data.nodes, edges: resData.data.edges });
      } else {
        alert(t.discoveryError + resData.error);
      }
    } catch (err) {
      console.error(err);
      alert(t.failedToConnectBackend);
    } finally {
      setLoading(false);
    }
  };

  // Run AI Discovery (Image OCR)
  const runImageDiscovery = async () => {
    if (!uploadedFile) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', uploadedFile);
      formData.append('mergeMode', mergeMode);
      formData.append('existingTopology', JSON.stringify({ nodes, edges }));

      const response = await fetch('/api/parse-image', {
        method: 'POST',
        body: formData
      });
      
      const resData = await response.json();
      if (resData.success) {
        setNodes(resData.data.nodes);
        setEdges(resData.data.edges);
        if (resData.warning) {
          setWarningMessage(resData.warning);
        } else {
          setWarningMessage('');
        }
        // Run audit automatically on new discovery
        runAudit({ nodes: resData.data.nodes, edges: resData.data.edges });
      } else {
        alert(t.discoveryError + resData.error);
      }
    } catch (err) {
      console.error(err);
      alert(t.failedToExecuteImageOCR);
    } finally {
      setLoading(false);
    }
  };

  // Run AI Audit
  const runAudit = async (currentTopology = { nodes, edges }) => {
    setLoading(true);
    try {
      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topology: currentTopology })
      });
      const resData = await response.json();
      if (resData.success) {
        setAuditReport(resData.data);
        setSidebarTab('audit');
      } else {
        alert(t.auditError + resData.error);
      }
    } catch (err) {
      console.error(err);
      alert(t.failedToRunSystemAudit);
    } finally {
      setLoading(false);
    }
  };

  // Manual Node Add
  const handleAddNode = (e) => {
    e.preventDefault();
    if (!newNode.label.trim()) return;

    const id = newNode.label.toLowerCase().replace(/[^a-z0-9]/g, '-');
    if (nodes.some(n => n.id === id)) {
      alert(t.deviceWithHostnameAlreadyExists);
      return;
    }

    const createdNode = {
      id,
      label: newNode.label,
      type: newNode.type,
      ip: newNode.ip || null,
      mac: newNode.mac || null
    };

    setNodes([...nodes, createdNode]);
    setNewNode({ label: '', type: 'switch', ip: '', mac: '' });
  };

  // Manual Link Add
  const handleAddEdge = (e) => {
    e.preventDefault();
    if (!newEdge.from || !newEdge.to) return;
    if (newEdge.from === newEdge.to) {
      alert(t.cannotConnectToItself);
      return;
    }

    // Check if duplicate link
    const duplicate = edges.some(edge => 
      (edge.from === newEdge.from && edge.to === newEdge.to) ||
      (edge.from === newEdge.to && edge.to === newEdge.from)
    );

    if (duplicate) {
      alert(t.physicalConnectionExists);
      return;
    }

    const createdEdge = {
      from: newEdge.from,
      to: newEdge.to,
      fromPort: newEdge.fromPort || '',
      toPort: newEdge.toPort || ''
    };

    setEdges([...edges, createdEdge]);
    setNewEdge({ from: '', to: '', fromPort: '', toPort: '' });
  };

  // Clear Canvas
  const handleClearCanvas = () => {
    if (window.confirm(t.areYouSureWipeCanvas)) {
      setNodes([]);
      setEdges([]);
      setSelectedItem(null);
      setAuditReport(null);
    }
  };

  // Load Demo Topology
  const handleLoadDemo = () => {
    // Generate a default mock network topology
    const demo = {
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
    setNodes(demo.nodes);
    setEdges(demo.edges);
    setSelectedItem(null);
    runAudit(demo);
  };

  return (
    <div className="app-container">
      {/* Header Area */}
      <header className="noc-header">
        <div className="noc-logo">
          <Network size={28} />
          <h1>{t.title}</h1>
        </div>

        {/* Language Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{t.language}:</span>
          <select 
            value={lang} 
            onChange={(e) => setLang(e.target.value)}
            style={{ 
              background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', 
              color: '#f8fafc', padding: '0.25rem 0.5rem', fontSize: '0.75rem', cursor: 'pointer' 
            }}
          >
            <option value="zh">🇹🇼 繁體中文</option>
            <option value="en">🇺🇸 English</option>
          </select>
        </div>

        <div className="noc-status-bar">
          <div className="status-item">
            <span className={`status-indicator ${serverMode === 'connected' ? '' : 'blink'}`} style={{
              backgroundColor: serverMode === 'connected' ? '#22c55e' : serverMode === 'mock' ? '#f97316' : '#ef4444',
              boxShadow: serverMode === 'connected' ? '0 0 8px #22c55e' : serverMode === 'mock' ? '0 0 8px #f97316' : '0 0 8px #ef4444'
            }}></span>
            <span>API Server: {serverMode === 'connected' ? t.apiConnected : serverMode === 'mock' ? t.apiMock : t.apiOffline}</span>
          </div>
          <div className="status-item">
            <Cpu size={16} />
            <span>{t.nodes}: {nodes.length}</span>
          </div>
          <div className="status-item">
            <Activity size={16} />
            <span>{t.edges}: {edges.length}</span>
          </div>
        </div>
      </header>

      {/* Warning Banners */}
      {warningMessage && (
        <div className={`connection-alert ${serverMode === 'connected' ? 'success' : ''}`}>
          <AlertCircle size={14} />
          <span>{warningMessage}</span>
        </div>
      )}

      {/* Main Panel */}
      <div className="dashboard-main">
        
        {/* Canvas Viewport (White Canvas Background) */}
        <div className="canvas-wrapper">
          {nodes.length === 0 && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              color: '#64748b',
              pointerEvents: 'none',
              zIndex: 10
            }}>
              <Network size={64} style={{ color: '#cbd5e1', marginBottom: '1rem' }} />
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#475569' }}>{t.topologyCanvasEmpty}</h2>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                {t.uploadOrPaste}
              </p>
            </div>
          )}

          {/* Network Canvas Div */}
          <div ref={canvasRef} className="network-canvas"></div>

          {/* Floating Inspector Card */}
          {selectedItem && (
            <div className="floating-inspector">
              <div className="inspector-header">
                <div className="inspector-title" title={selectedItem.type === 'node' ? selectedItem.data.label : 'Network Link Connection'}>
                  {selectedItem.type === 'node' ? selectedItem.data.label : `${selectedItem.fromLabel} ➔ ${selectedItem.toLabel}`}
                </div>
                <button className="close-btn" onClick={() => setSelectedItem(null)}>
                  <X size={16} />
                </button>
              </div>

              <div className="inspector-body">
                {selectedItem.type === 'node' ? (
                  <>
                    <div className="inspector-row">
                      <span className="inspector-label">{t.deviceType}:</span>
                      <span className={`inspector-badge badge-${selectedItem.data.type}`}>
                        {selectedItem.data.type}
                      </span>
                    </div>
                    {selectedItem.data.ip && (
                      <div className="inspector-row">
                        <span className="inspector-label">{t.managementIPLabel}:</span>
                        <span className="inspector-value">{selectedItem.data.ip}</span>
                      </div>
                    )}
                    {selectedItem.data.mac && (
                      <div className="inspector-row">
                        <span className="inspector-label">{t.physicalMAC}:</span>
                        <span className="inspector-value">{selectedItem.data.mac}</span>
                      </div>
                    )}
                    {selectedItem.connections && selectedItem.connections.length > 0 && (
                      <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                        <span className="inspector-label" style={{ display: 'block', marginBottom: '0.25rem' }}>{t.activeLinks}:</span>
                        <div style={{ maxHeight: '100px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          {selectedItem.connections.map((c, i) => (
                            <div key={i} style={{ fontSize: '0.75rem', color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between' }}>
                              <span>{c.localPort || 'any'} ➔ {c.hostname}</span>
                              <span style={{ color: 'var(--text-secondary)' }}>{c.remotePort || 'any'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="inspector-row">
                      <span className="inspector-label">{t.fromHost}:</span>
                      <span className="inspector-value">{selectedItem.fromLabel}</span>
                    </div>
                    <div className="inspector-row">
                      <span className="inspector-label">{t.outboundPortLabel}:</span>
                      <span className="inspector-value">{selectedItem.data.fromPort || t.notAutoDetected}</span>
                    </div>
                    <div className="inspector-row">
                      <span className="inspector-label">{t.toHost}:</span>
                      <span className="inspector-value">{selectedItem.toLabel}</span>
                    </div>
                    <div className="inspector-row">
                      <span className="inspector-label">{t.inboundPortLabel}:</span>
                      <span className="inspector-value">{selectedItem.data.toPort || t.notAutoDetected}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Panel */}
        <aside className="dashboard-sidebar">
          
          {/* Navigation Tabs */}
          <div className="tabs-container" style={{ margin: '1rem' }}>
            <button 
              className={`tab-btn ${sidebarTab === 'discovery' ? 'active' : ''}`}
              onClick={() => setSidebarTab('discovery')}
            >
              <Terminal size={16} />
              {t.aiDiscovery}
            </button>
            <button 
              className={`tab-btn ${sidebarTab === 'audit' ? 'active' : ''}`}
              onClick={() => setSidebarTab('audit')}
              disabled={!auditReport}
              style={{ opacity: auditReport ? 1 : 0.6 }}
            >
              <Shield size={16} />
              {t.nocSecurityAudit}
            </button>
          </div>

          {sidebarTab === 'discovery' ? (
            <>
              {/* Discovery Main Console */}
              <div className="sidebar-section">
                <div className="section-title">
                  <Cpu size={18} />
                  {t.discoveryInputs}
                </div>

                <div className="tabs-container">
                  <button 
                    className={`tab-btn ${activeTab === 'console' ? 'active' : ''}`}
                    onClick={() => setActiveTab('console')}
                  >
                    <Terminal size={14} />
                    {t.consoleTextLogs}
                  </button>
                  <button 
                    className={`tab-btn ${activeTab === 'image' ? 'active' : ''}`}
                    onClick={() => setActiveTab('image')}
                  >
                    <ImageIcon size={14} />
                    {t.topologyDiagramImage}
                  </button>
                </div>

                {activeTab === 'console' ? (
                  <div className="tab-content">
                    <div className="form-group">
                      <label>{t.pasteNetworkConsoleOutput}</label>
                      <textarea
                        className="noc-textarea"
                        value={consoleLog}
                        onChange={(e) => setConsoleLog(e.target.value)}
                        placeholder={t.pasteNetworkConsoleOutput}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>{t.mergeMode}</label>
                      <div className="mode-options">
                        <label className="radio-label">
                          <input 
                            type="radio" 
                            name="mergeModeText" 
                            value="append" 
                            checked={mergeMode === 'append'} 
                            onChange={() => setMergeMode('append')}
                          />
                          {t.appendToCanvas}
                        </label>
                        <label className="radio-label">
                          <input 
                            type="radio" 
                            name="mergeModeText" 
                            value="replace" 
                            checked={mergeMode === 'replace'} 
                            onChange={() => setMergeMode('replace')}
                          />
                          {t.replaceCanvas}
                        </label>
                      </div>
                    </div>

                    <button 
                      className="btn-primary" 
                      onClick={runTextDiscovery}
                      disabled={loading || !consoleLog.trim()}
                      style={{ opacity: (loading || !consoleLog.trim()) ? 0.6 : 1 }}
                    >
                      {loading ? <RefreshCw className="animate-spin" size={16} /> : <Terminal size={16} />}
                      {t.runAITextDiscovery}
                    </button>
                  </div>
                ) : (
                  <div className="tab-content">
                    <div className="form-group">
                      <label>{t.uploadArchitectureDiagram}</label>
                      
                      {!imagePreview ? (
                        <div 
                          className={`drag-drop-zone ${dragActive ? 'active' : ''}`}
                          onDragEnter={handleDrag}
                          onDragOver={handleDrag}
                          onDragLeave={handleDrag}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current && fileInputRef.current.click()}
                        >
                          <Upload className="drag-icon" size={28} />
                          <p className="drag-label">{t.dragDropDiagram}</p>
                          <p className="drag-sub">{t.supportsFormats}</p>
                          <input 
                            type="file" 
                            ref={fileInputRef} 
                            style={{ display: 'none' }} 
                            onChange={handleFileChange}
                            accept="image/*"
                          />
                        </div>
                      ) : (
                        <div className="image-preview-card">
                          <img src={imagePreview} alt="Topology upload preview" className="preview-thumbnail" />
                          <div className="preview-details">
                            <p className="preview-name">{uploadedFile?.name}</p>
                            <p className="preview-size">{(uploadedFile?.size / 1024).toFixed(1)} KB</p>
                          </div>
                          <button className="remove-btn" onClick={handleRemoveFile}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="form-group">
                      <label>Merge Mode</label>
                      <div className="mode-options">
                        <label className="radio-label">
                          <input 
                            type="radio" 
                            name="mergeModeImg" 
                            value="append" 
                            checked={mergeMode === 'append'} 
                            onChange={() => setMergeMode('append')}
                          />
                          Append to Canvas
                        </label>
                        <label className="radio-label">
                          <input 
                            type="radio" 
                            name="mergeModeImg" 
                            value="replace" 
                            checked={mergeMode === 'replace'} 
                            onChange={() => setMergeMode('replace')}
                          />
                          Replace Canvas
                        </label>
                      </div>
                    </div>

                    <button 
                      className="btn-primary" 
                      onClick={runImageDiscovery}
                      disabled={loading || !uploadedFile}
                      style={{ opacity: (loading || !uploadedFile) ? 0.6 : 1 }}
                    >
                      {loading ? <RefreshCw className="animate-spin" size={16} /> : <ImageIcon size={16} />}
                      {t.runMultimodalAI}
                    </button>
                  </div>
                )}
              </div>

              {/* Manual Device builder toggler & Quick Actions */}
              <div className="sidebar-section">
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                  <button className="btn-secondary" onClick={() => setShowManualBuilder(!showManualBuilder)} style={{ flex: 1 }}>
                    <Plus size={16} />
                    {showManualBuilder ? t.hideBuilder : t.manualBuilder}
                  </button>
                  <button className="btn-secondary" onClick={handleLoadDemo} style={{ flex: 1 }}>
                    <Activity size={16} />
                    {t.loadNocDemo}
                  </button>
                </div>
                
                <button className="btn-secondary" onClick={handleClearCanvas} style={{ width: '100%', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#ef4444' }}>
                  <Trash2 size={16} />
                  {t.resetTopologyCanvas}
                </button>
              </div>

              {/* Manual Builder Form */}
              {showManualBuilder && (
                <div className="sidebar-section" style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-light)' }}>
                  <div className="section-title">
                    <Plus size={18} />
                    {t.manualNetworkBuilder}
                  </div>

                  {/* Node Add */}
                  <form onSubmit={handleAddNode} style={{ marginBottom: '1.25rem', borderBottom: '1px dashed var(--border-color)', paddingBottom: '1rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>{t.addInfrastructureDevice}</div>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label>{t.hostname}</label>
                        <input 
                          type="text" 
                          className="noc-input"
                          placeholder={lang === 'zh' ? '例如 Sw-Floor-3' : 'e.g. Sw-Floor-3'}
                          value={newNode.label}
                          onChange={(e) => setNewNode({...newNode, label: e.target.value})}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>{t.deviceRole}</label>
                        <select 
                          className="noc-select"
                          value={newNode.type}
                          onChange={(e) => setNewNode({...newNode, type: e.target.value})}
                        >
                          <option value="core-switch">{t.coreSwitch}</option>
                          <option value="switch">{t.switch}</option>
                          <option value="server">{t.server}</option>
                          <option value="storage">{t.storage}</option>
                          <option value="firewall">{t.firewall}</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>{t.managementIP}</label>
                        <input 
                          type="text" 
                          className="noc-input" 
                          placeholder={lang === 'zh' ? '192.168.10.x' : '192.168.10.x'}
                          value={newNode.ip}
                          onChange={(e) => setNewNode({...newNode, ip: e.target.value})}
                        />
                      </div>
                      <div className="form-group">
                        <label>{t.macAddress}</label>
                        <input 
                          type="text" 
                          className="noc-input" 
                          placeholder={lang === 'zh' ? '00:11:22:...' : '00:11:22:...'}
                          value={newNode.mac}
                          onChange={(e) => setNewNode({...newNode, mac: e.target.value})}
                        />
                      </div>
                    </div>

                    <button type="submit" className="btn-secondary" style={{ width: '100%', padding: '0.4rem' }}>
                      <Plus size={14} /> {t.addNodeToCanvas}
                    </button>
                  </form>

                  {/* Connection Add */}
                  {nodes.length >= 2 ? (
                    <form onSubmit={handleAddEdge}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>{t.connectDevicePorts}</div>
                      
                      <div className="form-row">
                        <div className="form-group">
                          <label>{t.sourceNode}</label>
                          <select 
                            className="noc-select"
                            value={newEdge.from}
                            onChange={(e) => setNewEdge({...newEdge, from: e.target.value})}
                            required
                          >
                            <option value="">{t.select}</option>
                            {nodes.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
                          </select>
                        </div>
                        <div className="form-group">
                          <label>{t.destinationNode}</label>
                          <select 
                            className="noc-select"
                            value={newEdge.to}
                            onChange={(e) => setNewEdge({...newEdge, to: e.target.value})}
                            required
                          >
                            <option value="">{t.select}</option>
                            {nodes.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label>{t.outboundPort}</label>
                          <input 
                            type="text" 
                            className="noc-input" 
                            placeholder={lang === 'zh' ? 'Gi0/1' : 'Gi0/1'}
                            value={newEdge.fromPort}
                            onChange={(e) => setNewEdge({...newEdge, fromPort: e.target.value})}
                          />
                        </div>
                        <div className="form-group">
                          <label>{t.inboundPort}</label>
                          <input 
                            type="text" 
                            className="noc-input" 
                            placeholder={lang === 'zh' ? 'Eth0' : 'Eth0'}
                            value={newEdge.toPort}
                            onChange={(e) => setNewEdge({...newEdge, toPort: e.target.value})}
                          />
                        </div>
                      </div>

                      <button type="submit" className="btn-secondary" style={{ width: '100%', padding: '0.4rem' }}>
                        <Plus size={14} /> {t.connectInterfaces}
                      </button>
                    </form>
                  ) : (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                      {t.addAtLeast2Devices}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Security Audit Tab */
            <div className="sidebar-section" style={{ animation: 'fade-in 0.4s ease' }}>
              <div className="section-title">
                <Shield size={18} />
                {t.networkAuditCenter}
              </div>

              {auditReport ? (
                <>
                  {/* Circular Health Progress Score */}
                  <div className="audit-health-header">
                    <svg className="health-gauge-svg" viewBox="0 0 100 100">
                      <circle className="gauge-bg" cx="50" cy="50" r="40" />
                      <circle 
                        className="gauge-fill" 
                        cx="50" 
                        cy="50" 
                        r="40" 
                        strokeDasharray="251.2"
                        strokeDashoffset={251.2 - (251.2 * auditReport.healthScore) / 100}
                        style={{
                          stroke: auditReport.healthScore >= 80 ? '#22c55e' : auditReport.healthScore >= 50 ? '#f97316' : '#ef4444'
                        }}
                      />
                      <text className="health-gauge-text" x="50" y="50">
                        {auditReport.healthScore}%
                      </text>
                    </svg>

                    <div className="health-status-desc">
                      <h3>{t.securityShieldHealth}</h3>
                      <p>
                        {auditReport.healthScore >= 80 
                          ? t.satisfactoryNetworkPosture 
                          : auditReport.healthScore >= 50 
                            ? t.vulnerabilitiesDetected
                            : t.severeNetworkPostureIssues}
                      </p>
                    </div>
                  </div>

                  {/* Audit Cards List */}
                  <div className="audit-list">
                    {auditReport.audits && auditReport.audits.length > 0 ? (
                      auditReport.audits.map((a, i) => (
                        <div key={a.id || i} className={`audit-card audit-${a.type}`}>
                          <div className="audit-card-title">
                            <span>{a.title}</span>
                            <span className={`audit-category cat-${a.category ? a.category.toLowerCase() : 'security'}`}>
                              {a.category || 'Security'}
                            </span>
                          </div>
                          <div className="audit-card-desc">{a.description}</div>
                        </div>
                      ))
                    ) : (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>
                        {t.noAuditItemsGenerated}
                      </div>
                    )}
                  </div>
                  
                  <button className="btn-primary" onClick={() => runAudit()} style={{ marginTop: '1.5rem' }}>
                    <RefreshCw size={16} />
                    {t.reAuditActiveTopology}
                  </button>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                  <Shield size={48} style={{ color: 'var(--border-color)', marginBottom: '1rem' }} />
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{t.noActiveAuditReport}</p>
                  <button className="btn-primary" onClick={() => runAudit()} style={{ marginTop: '1rem' }}>
                    {t.generateSecurityAudit}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Sidebar Footer */}
          <div style={{ marginTop: 'auto', padding: '1rem', borderTop: '1px solid var(--border-color)', fontSize: '0.7rem', color: '#475569', textAlign: 'center' }}>
            {t.footerText}
          </div>
        </aside>
      </div>
    </div>
  );
}
