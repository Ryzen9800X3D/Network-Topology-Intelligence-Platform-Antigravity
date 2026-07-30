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

export default function App() {
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
          setWarningMessage('Server running in MOCK mode (No GEMINI_API_KEY).');
        } else {
          setServerMode('connected');
          setWarningMessage('');
        }
      })
      .catch(err => {
        console.error('Cannot connect to server:', err);
        setServerMode('error');
        setWarningMessage('Cannot connect to backend server. Ensure server is running on port 3001.');
      });
  }, []);

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
      alert('Only image files (PNG, JPG, SVG, Visio export) are supported.');
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
        alert('Discovery error: ' + resData.error);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to connect to backend server endpoint.');
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
        alert('Image Discovery error: ' + resData.error);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to execute image multimodal analysis.');
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
        alert('Audit error: ' + resData.error);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to run system audit.');
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
      alert('Device with this hostname already exists.');
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
      alert('Cannot connect a device to itself.');
      return;
    }

    // Check if duplicate link
    const duplicate = edges.some(edge => 
      (edge.from === newEdge.from && edge.to === newEdge.to) ||
      (edge.from === newEdge.to && edge.to === newEdge.from)
    );

    if (duplicate) {
      alert('A physical connection already exists between these devices.');
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
    if (window.confirm('Are you sure you want to wipe the current canvas and start from scratch?')) {
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
          <h1>NOC Topology Discovery Center</h1>
        </div>
        
        <div className="noc-status-bar">
          <div className="status-item">
            <span className={`status-indicator ${serverMode === 'connected' ? '' : 'blink'}`} style={{
              backgroundColor: serverMode === 'connected' ? '#22c55e' : serverMode === 'mock' ? '#f97316' : '#ef4444',
              boxShadow: serverMode === 'connected' ? '0 0 8px #22c55e' : serverMode === 'mock' ? '0 0 8px #f97316' : '0 0 8px #ef4444'
            }}></span>
            <span>API Server: {serverMode === 'connected' ? 'Gemini AI Active' : serverMode === 'mock' ? 'Local MOCK Mode' : 'Offline'}</span>
          </div>
          <div className="status-item">
            <Cpu size={16} />
            <span>Nodes: {nodes.length}</span>
          </div>
          <div className="status-item">
            <Activity size={16} />
            <span>Edges: {edges.length}</span>
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
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#475569' }}>Topology Canvas Empty</h2>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                Upload a topology diagram or paste CLI logs in the sidebar to visualize.
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
                      <span className="inspector-label">Device Type:</span>
                      <span className={`inspector-badge badge-${selectedItem.data.type}`}>
                        {selectedItem.data.type}
                      </span>
                    </div>
                    {selectedItem.data.ip && (
                      <div className="inspector-row">
                        <span className="inspector-label">Management IP:</span>
                        <span className="inspector-value">{selectedItem.data.ip}</span>
                      </div>
                    )}
                    {selectedItem.data.mac && (
                      <div className="inspector-row">
                        <span className="inspector-label">Physical MAC:</span>
                        <span className="inspector-value">{selectedItem.data.mac}</span>
                      </div>
                    )}
                    {selectedItem.connections && selectedItem.connections.length > 0 && (
                      <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                        <span className="inspector-label" style={{ display: 'block', marginBottom: '0.25rem' }}>Active Links:</span>
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
                      <span className="inspector-label">From Host:</span>
                      <span className="inspector-value">{selectedItem.fromLabel}</span>
                    </div>
                    <div className="inspector-row">
                      <span className="inspector-label">Outbound Port:</span>
                      <span className="inspector-value">{selectedItem.data.fromPort || 'Not Auto-detected'}</span>
                    </div>
                    <div className="inspector-row">
                      <span className="inspector-label">To Host:</span>
                      <span className="inspector-value">{selectedItem.toLabel}</span>
                    </div>
                    <div className="inspector-row">
                      <span className="inspector-label">Inbound Port:</span>
                      <span className="inspector-value">{selectedItem.data.toPort || 'Not Auto-detected'}</span>
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
              AI Discovery
            </button>
            <button 
              className={`tab-btn ${sidebarTab === 'audit' ? 'active' : ''}`}
              onClick={() => setSidebarTab('audit')}
              disabled={!auditReport}
              style={{ opacity: auditReport ? 1 : 0.6 }}
            >
              <Shield size={16} />
              NOC Security Audit
            </button>
          </div>

          {sidebarTab === 'discovery' ? (
            <>
              {/* Discovery Main Console */}
              <div className="sidebar-section">
                <div className="section-title">
                  <Cpu size={18} />
                  Discovery Inputs
                </div>

                <div className="tabs-container">
                  <button 
                    className={`tab-btn ${activeTab === 'console' ? 'active' : ''}`}
                    onClick={() => setActiveTab('console')}
                  >
                    <Terminal size={14} />
                    Console Text Logs
                  </button>
                  <button 
                    className={`tab-btn ${activeTab === 'image' ? 'active' : ''}`}
                    onClick={() => setActiveTab('image')}
                  >
                    <ImageIcon size={14} />
                    Topology Diagram Image
                  </button>
                </div>

                {activeTab === 'console' ? (
                  <div className="tab-content">
                    <div className="form-group">
                      <label>CLI Neighbor logs / Show output</label>
                      <textarea
                        className="noc-textarea"
                        placeholder="Paste network console output here... (e.g. show lldp neighbors detail, show mac address-table, show cdp neighbors detail)"
                        value={consoleLog}
                        onChange={(e) => setConsoleLog(e.target.value)}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Merge Mode</label>
                      <div className="mode-options">
                        <label className="radio-label">
                          <input 
                            type="radio" 
                            name="mergeModeText" 
                            value="append" 
                            checked={mergeMode === 'append'} 
                            onChange={() => setMergeMode('append')}
                          />
                          Append to Canvas
                        </label>
                        <label className="radio-label">
                          <input 
                            type="radio" 
                            name="mergeModeText" 
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
                      onClick={runTextDiscovery}
                      disabled={loading || !consoleLog.trim()}
                      style={{ opacity: (loading || !consoleLog.trim()) ? 0.6 : 1 }}
                    >
                      {loading ? <RefreshCw className="animate-spin" size={16} /> : <Terminal size={16} />}
                      Run AI Text Discovery
                    </button>
                  </div>
                ) : (
                  <div className="tab-content">
                    <div className="form-group">
                      <label>Upload Architecture Diagram / Whiteboard Sketch</label>
                      
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
                          <p className="drag-label">Drag & drop your diagram image here</p>
                          <p className="drag-sub">Supports PNG, JPG, SVG or whiteboard photos</p>
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
                      Run Multimodal AI OCR
                    </button>
                  </div>
                )}
              </div>

              {/* Manual Device builder toggler & Quick Actions */}
              <div className="sidebar-section">
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                  <button className="btn-secondary" onClick={() => setShowManualBuilder(!showManualBuilder)} style={{ flex: 1 }}>
                    <Plus size={16} />
                    {showManualBuilder ? 'Hide Builder' : 'Manual Builder'}
                  </button>
                  <button className="btn-secondary" onClick={handleLoadDemo} style={{ flex: 1 }}>
                    <Activity size={16} />
                    Load NOC Demo
                  </button>
                </div>
                
                <button className="btn-secondary" onClick={handleClearCanvas} style={{ width: '100%', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#ef4444' }}>
                  <Trash2 size={16} />
                  Reset topology Canvas
                </button>
              </div>

              {/* Manual Builder Form */}
              {showManualBuilder && (
                <div className="sidebar-section" style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-light)' }}>
                  <div className="section-title">
                    <Plus size={18} />
                    Manual Network Builder
                  </div>

                  {/* Node Add */}
                  <form onSubmit={handleAddNode} style={{ marginBottom: '1.25rem', borderBottom: '1px dashed var(--border-color)', paddingBottom: '1rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>ADD INFRASTRUCTURE DEVICE</div>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label>Hostname</label>
                        <input 
                          type="text" 
                          className="noc-input"
                          placeholder="e.g. Sw-Floor-3"
                          value={newNode.label}
                          onChange={(e) => setNewNode({...newNode, label: e.target.value})}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Device Role</label>
                        <select 
                          className="noc-select"
                          value={newNode.type}
                          onChange={(e) => setNewNode({...newNode, type: e.target.value})}
                        >
                          <option value="core-switch">Core Switch</option>
                          <option value="switch">Switch</option>
                          <option value="server">Server</option>
                          <option value="storage">Storage SAN/NAS</option>
                          <option value="firewall">Firewall</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Management IP</label>
                        <input 
                          type="text" 
                          className="noc-input" 
                          placeholder="192.168.10.x"
                          value={newNode.ip}
                          onChange={(e) => setNewNode({...newNode, ip: e.target.value})}
                        />
                      </div>
                      <div className="form-group">
                        <label>MAC Address</label>
                        <input 
                          type="text" 
                          className="noc-input" 
                          placeholder="00:11:22:..."
                          value={newNode.mac}
                          onChange={(e) => setNewNode({...newNode, mac: e.target.value})}
                        />
                      </div>
                    </div>

                    <button type="submit" className="btn-secondary" style={{ width: '100%', padding: '0.4rem' }}>
                      <Plus size={14} /> Add Node to Canvas
                    </button>
                  </form>

                  {/* Connection Add */}
                  {nodes.length >= 2 ? (
                    <form onSubmit={handleAddEdge}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>CONNECT DEVICE PORTS</div>
                      
                      <div className="form-row">
                        <div className="form-group">
                          <label>Source Node</label>
                          <select 
                            className="noc-select"
                            value={newEdge.from}
                            onChange={(e) => setNewEdge({...newEdge, from: e.target.value})}
                            required
                          >
                            <option value="">-- Select --</option>
                            {nodes.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Destination Node</label>
                          <select 
                            className="noc-select"
                            value={newEdge.to}
                            onChange={(e) => setNewEdge({...newEdge, to: e.target.value})}
                            required
                          >
                            <option value="">-- Select --</option>
                            {nodes.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label>Outbound Port</label>
                          <input 
                            type="text" 
                            className="noc-input" 
                            placeholder="Gi0/1"
                            value={newEdge.fromPort}
                            onChange={(e) => setNewEdge({...newEdge, fromPort: e.target.value})}
                          />
                        </div>
                        <div className="form-group">
                          <label>Inbound Port</label>
                          <input 
                            type="text" 
                            className="noc-input" 
                            placeholder="Eth0"
                            value={newEdge.toPort}
                            onChange={(e) => setNewEdge({...newEdge, toPort: e.target.value})}
                          />
                        </div>
                      </div>

                      <button type="submit" className="btn-secondary" style={{ width: '100%', padding: '0.4rem' }}>
                        <Plus size={14} /> Connect Interfaces
                      </button>
                    </form>
                  ) : (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                      Add at least 2 devices to enable physical port linkage.
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
                Network Audit Center
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
                      <h3>Security Shield Health</h3>
                      <p>
                        {auditReport.healthScore >= 80 
                          ? 'Satisfactory network posture. Redundancies and Firewalls active.' 
                          : auditReport.healthScore >= 50 
                            ? 'Vulnerabilities detected. Critical redundancy alerts present.'
                            : 'Severe network posture issues. Core split-brain or perimeter threat exposed.'}
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
                        No audit items generated.
                      </div>
                    )}
                  </div>
                  
                  <button className="btn-primary" onClick={() => runAudit()} style={{ marginTop: '1.5rem' }}>
                    <RefreshCw size={16} />
                    Re-Audit Active Topology
                  </button>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                  <Shield size={48} style={{ color: 'var(--border-color)', marginBottom: '1rem' }} />
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No active audit report loaded.</p>
                  <button className="btn-primary" onClick={() => runAudit()} style={{ marginTop: '1rem' }}>
                    Generate Security Audit
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Sidebar Footer */}
          <div style={{ marginTop: 'auto', padding: '1rem', borderTop: '1px solid var(--border-color)', fontSize: '0.7rem', color: '#475569', textAlign: 'center' }}>
            NOC Auto-Discovery Engine &bull; Antigravity Agentic Design &copy; 2026
          </div>
        </aside>
      </div>
    </div>
  );
}
