# 🏗️ 系統架構設計說明 (Architecture Design)

本文件說明 Network Topology Intelligence Platform 的架構設計決策、資料流與核心模組。

---

## 整體設計理念

本平台採用**全端分離架構（Decoupled Full-Stack）**，前端與後端透過 REST API 通訊，並以 Vite Proxy 抹平開發環境的跨域問題：

```
使用者 ──HTTP─→ React (Port 3000) ──Proxy /api/*──→ Express (Port 3001) ──→ Gemini API
```

### 設計原則

1. **漸進式降級（Graceful Degradation）**  
   每個 API 端點在 Gemini 失敗或無 API Key 時，均有完整的本地備用方案，確保 100% 可用性。

2. **拓樸不可變性（Topology Immutability）**  
   前端的 `nodes` 與 `edges` 狀態永遠是最終真實來源（Single Source of Truth），所有 API 回傳的拓樸資料透過 `computeTopology()` 合併，不直接修改現有狀態。

3. **向量圖標設計（SVG-first Icons）**  
   所有設備圖標採用 SVG Data URI 格式，確保在任何 DPI 和縮放比例下均保持清晰，且不依賴外部圖標字型或 CDN。

---

## 前端架構 (Frontend Architecture)

### 元件狀態管理

```
App.jsx (Root Component)
│
├── Canvas State
│   ├── nodes: Node[]          ← 所有設備節點
│   └── edges: Edge[]          ← 所有連線邊線
│
├── UI State
│   ├── selectedItem           ← 點擊的節點/邊線（供 Inspector Card 使用）
│   ├── sidebarTab             ← 'discovery' | 'audit'
│   ├── activeTab              ← 'console' | 'image'（Discovery 子分頁）
│   ├── mergeMode              ← 'append' | 'replace'
│   └── showManualBuilder      ← 手動建置器展開狀態
│
└── Data State
    ├── auditReport            ← 最新稽核報告
    ├── serverMode             ← 'connected' | 'mock' | 'error'
    └── warningMessage         ← 警告訊息橫幅文字
```

### Vis-Network 整合策略

每次 `nodes` 或 `edges` 狀態改變時，`useEffect` Hook 完整重建 vis-network 實例：

```
nodes/edges 狀態更新
    ↓
useEffect 觸發
    ↓
銷毀舊 VisNetwork 實例
    ↓
格式化節點（SVG 圖標、字型設定）
    ↓
格式化邊線（標籤、顏色、箭頭）
    ↓
建立新 VisNetwork 實例（含 Force Atlas 2 物理引擎）
    ↓
綁定 click 事件 → 更新 selectedItem
```

**Force Atlas 2 物理參數調校：**

| 參數 | 值 | 效果 |
|------|-----|------|
| `gravitationalConstant` | -70 | 節點間排斥力 |
| `centralGravity` | 0.015 | 向中心的引力 |
| `springLength` | 120 | 邊線最適長度（px）|
| `springConstant` | 0.05 | 邊線彈力係數 |
| `damping` | 0.4 | 物理模擬阻尼值 |

---

## 後端架構 (Backend Architecture)

### 請求處理流程

```
HTTP Request
    ↓
Express Middleware
    ├── cors()           ← CORS 跨域設定
    ├── express.json()   ← JSON body 解析（最大 50MB）
    └── multer()         ← 圖片檔案上傳解析（僅 /api/parse-image）
    ↓
Route Handler
    ↓
┌── Gemini API 可用？ ──Yes──→ 呼叫 Gemini API ──失敗──┐
│                                                        ↓
No                                              fallback 本地解析
│                                                        ↓
└────────────────────────────────────────────────────────┘
                                                         ↓
                                                 computeTopology()
                                                 （append/replace 合併）
                                                         ↓
                                                   JSON 回應
```

### computeTopology() 邏輯

```javascript
function computeTopology(existing, parsed, mode) {
  if (mode === 'replace') return parsed;

  // append 模式：
  // 1. 遍歷 parsed.nodes，若 id 或 label 已存在則合併屬性，否則新增
  // 2. 遍歷 parsed.edges，檢查正向和反向重複，若不重複則新增
  return { nodes: mergedNodes, edges: mergedEdges };
}
```

**邊線去重邏輯（防止重複連線）：**
```javascript
const duplicate = edges.find(e =>
  (e.from === fromId && e.to === toId && e.fromPort === pEdge.fromPort) ||
  (e.from === toId && e.to === fromId && e.fromPort === pEdge.toPort)
);
```

---

## 資料模型 (Data Models)

### Node（節點）

```typescript
interface Node {
  id: string;         // 唯一識別碼（小寫 URL-friendly 格式）
  label: string;      // 設備主機名稱
  type: NodeType;     // 'core-switch' | 'switch' | 'server' | 'storage' | 'firewall'
  ip?: string;        // 管理 IP 位址（選填）
  mac?: string;       // 實體 MAC 位址（選填）
}
```

### Edge（邊線）

```typescript
interface Edge {
  from: string;       // 來源節點 id
  to: string;         // 目標節點 id
  fromPort?: string;  // 來源端口（如 "Gi0/1"）
  toPort?: string;    // 目標端口（如 "eth0"）
}
```

### AuditReport（稽核報告）

```typescript
interface AuditReport {
  healthScore: number;   // 0-100 整體健康評分
  audits: AuditItem[];   // 稽核項目清單
}

interface AuditItem {
  id: string;
  type: 'success' | 'warning' | 'danger' | 'info';
  category: 'Security' | 'Redundancy' | 'Configuration';
  title: string;
  description: string;
}
```

---

## Gemini Prompt 設計

### 文字解析 Prompt 設計原則

1. **角色設定**：明確告知 AI 是「網路工程助理」
2. **輸出格式約束**：使用 `responseMimeType: "application/json"` 強制 JSON 輸出
3. **Schema 提供**：在 Prompt 中明確提供 JSON Schema，減少格式錯誤
4. **類型限制**：明確說明 type 只能為 5 種合法值

### 圖片解析 Prompt 設計原則

1. **視覺線索提示**：提示 AI 注意圖標形狀（磚牆=防火牆、多磁碟=儲存）
2. **空結果處理**：若無法識別任何節點，應返回空陣列而非錯誤
3. **同樣的 JSON 強制輸出**

---

## 安全考量 (Security Considerations)

| 風險 | 緩解措施 |
|------|---------|
| API Key 外洩 | `.env` 加入 `.gitignore`，不提交至版本控制 |
| 惡意大型檔案上傳 | multer 限制最大 10MB |
| 跨域攻擊（CSRF） | CORS 僅允許本機請求 |
| Prompt Injection | 僅允許標準網路設備相關輸入，AI 回應強制 JSON 格式 |
| Node.js 依賴漏洞 | 定期執行 `npm audit` 檢查 |

---

## 效能考量 (Performance Considerations)

| 面向 | 現狀 | 優化建議 |
|------|------|---------|
| 大型拓樸渲染（>200 節點）| vis-network 可能較慢 | 關閉物理引擎後靜態渲染 |
| 圖片上傳大小 | 限制 10MB | 前端加入影像壓縮（canvas.toBlob）|
| API 回應時間 | Gemini Flash 約 2-5 秒 | 加入 Loading 動畫（已實作）|
| 前端 Bundle 大小 | ~675KB（主要來自 vis-network）| 動態 import vis-network |
