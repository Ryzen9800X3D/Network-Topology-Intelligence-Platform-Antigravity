# 📡 API 參考文件 (API Reference)

本文件說明 Network Topology Intelligence Platform 後端所有 REST API 端點的請求格式、回應結構與使用範例。

---

## 基本資訊 (Base Info)

| 項目 | 值 |
|------|-----|
| 基礎 URL | `http://localhost:3001` |
| 請求格式 | `application/json`（文字端點）/ `multipart/form-data`（圖片端點）|
| 回應格式 | `application/json` |
| 認證 | 無（本地服務，CORS 保護）|

---

## POST /api/parse

**用途：** 解析 CLI 文字輸出（如 LLDP、CDP、MAC 位址表），自動生成網路拓樸資料。

### 請求 Body

```json
{
  "consoleLog": "string",         // 必填：CLI 指令輸出文字
  "existingTopology": {           // 選填：現有拓樸（用於 append 模式）
    "nodes": [],
    "edges": []
  },
  "mergeMode": "append"           // 選填："append"（預設）或 "replace"
}
```

### 支援的 CLI 輸出格式

- `show lldp neighbors detail`（Cisco IOS）
- `show cdp neighbors detail`（Cisco IOS）
- `show mac address-table`（Cisco IOS）
- `show lldp neighbors`（Cisco NX-OS）
- 自定義鄰居表格文字

### 成功回應 (200 OK)

```json
{
  "success": true,
  "data": {
    "nodes": [
      {
        "id": "core-switch-a",
        "label": "Core-Switch-A",
        "type": "core-switch",
        "ip": "10.0.0.1",
        "mac": "00:1A:2B:3C:4D:01"
      }
    ],
    "edges": [
      {
        "from": "core-switch-a",
        "to": "dist-switch-1",
        "fromPort": "TenGi1/1",
        "toPort": "Gi0/1"
      }
    ]
  },
  "warning": "string (optional)"  // 僅在 Mock 模式或 fallback 時出現
}
```

### 錯誤回應

```json
{
  "success": false,
  "error": "Console log input is empty."
}
```

### 使用範例

```bash
curl -X POST http://localhost:3001/api/parse \
  -H "Content-Type: application/json" \
  -d '{
    "consoleLog": "Device ID: Dist-Switch-01\nLocal Intf: TenGi1/1\nPort ID: Gi0/1",
    "mergeMode": "replace"
  }'
```

---

## POST /api/parse-image

**用途：** 上傳網路拓樸圖片（架構圖、白板草稿、Visio 截圖），透過 Gemini 多模態 OCR 自動識別設備與連線。

### 請求格式

`Content-Type: multipart/form-data`

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `image` | File | ✅ | 圖片檔案（PNG、JPG、SVG，最大 10MB）|
| `mergeMode` | String | ❌ | `"append"` 或 `"replace"`（預設 append）|
| `existingTopology` | String (JSON) | ❌ | 現有拓樸 JSON 字串（用於 append 模式）|

### 成功回應 (200 OK)

與 `/api/parse` 相同的 `data` 結構（`nodes` + `edges`）。

### 使用範例

```bash
curl -X POST http://localhost:3001/api/parse-image \
  -F "image=@/path/to/topology.png" \
  -F "mergeMode=replace"
```

### 圖片辨識能力

| 圖片類型 | 辨識準確度 |
|---------|----------|
| 清晰的網路架構圖（電腦繪製）| ⭐⭐⭐⭐⭐ |
| Visio / draw.io 截圖 | ⭐⭐⭐⭐⭐ |
| 拍攝的白板草圖（清晰） | ⭐⭐⭐⭐ |
| 手繪草稿（潦草） | ⭐⭐⭐ |

---

## POST /api/audit

**用途：** 對傳入的拓樸資料進行 AI 安全稽核，生成健康評分與具體改善建議。

### 請求 Body

```json
{
  "topology": {
    "nodes": [
      {
        "id": "core-switch-a",
        "label": "Core-Switch-A",
        "type": "core-switch",
        "ip": "10.0.0.1",
        "mac": "00:1A:2B:3C:4D:01"
      }
    ],
    "edges": [
      {
        "from": "core-switch-a",
        "to": "edge-firewall",
        "fromPort": "TenGi1/24",
        "toPort": "wan0"
      }
    ]
  }
}
```

### 節點 `type` 合法值

| 值 | 說明 | 圖標顏色 |
|----|------|---------|
| `"core-switch"` | 核心交換器 | 金黃色 |
| `"switch"` | 一般交換器 | 天空藍 |
| `"server"` | 伺服器 | 青藍色 |
| `"storage"` | SAN/NAS 儲存陣列 | 紫羅蘭色 |
| `"firewall"` | 防火牆 | 玫瑰紅 |

### 成功回應 (200 OK)

```json
{
  "success": true,
  "data": {
    "healthScore": 75,
    "audits": [
      {
        "id": "audit-sec-fw-ok-edge-firewall",
        "type": "success",
        "category": "Security",
        "title": "Perimeter Shield Active: Edge-Firewall-Rose",
        "description": "Firewall Edge-Firewall-Rose is in line and protecting the internal network switches."
      },
      {
        "id": "audit-red-san-storage-01",
        "type": "warning",
        "category": "Redundancy",
        "title": "Single Path Connection to Storage: SAN-Storage-Cabinet-1",
        "description": "Storage device SAN-Storage-Cabinet-1 has only 1 path(s). Highly critical SAN/NAS storage arrays should utilize dual-controller connections..."
      }
    ]
  }
}
```

### 稽核類型說明

| `type` | 含義 | 顯示顏色 |
|--------|------|---------|
| `"success"` | 通過檢查 | 綠色 |
| `"warning"` | 建議改善 | 橙色 |
| `"danger"` | 嚴重問題 | 紅色 |
| `"info"` | 資訊提示 | 藍色 |

| `category` | 稽核面向 |
|-----------|---------|
| `"Security"` | 防火牆、邊界防護 |
| `"Redundancy"` | 冗餘路徑、ISL 連線 |
| `"Configuration"` | 設備設定、IP 管理 |

### 使用範例

```bash
curl -X POST http://localhost:3001/api/audit \
  -H "Content-Type: application/json" \
  -d '{
    "topology": {
      "nodes": [
        {"id": "fw1", "label": "Firewall-01", "type": "firewall", "ip": "10.0.0.1"},
        {"id": "sw1", "label": "Core-SW", "type": "core-switch", "ip": "10.0.0.2"}
      ],
      "edges": [
        {"from": "fw1", "to": "sw1", "fromPort": "eth0", "toPort": "Gi0/1"}
      ]
    }
  }'
```

---

## 錯誤碼說明 (Error Codes)

| HTTP 狀態碼 | 說明 |
|-----------|------|
| `200 OK` | 請求成功（可能包含 `warning` 欄位提示 fallback 模式）|
| `400 Bad Request` | 請求格式錯誤或缺少必填欄位 |
| `500 Internal Server Error` | 伺服器內部錯誤 |

---

## Mock 模式說明

當 `GEMINI_API_KEY` 未設定時，伺服器以 **Mock 模式**運行：

| 端點 | Mock 行為 |
|------|-----------|
| `/api/parse` | 使用正規表達式解析 CLI 文字，無法解析時返回預設示範拓樸 |
| `/api/parse-image` | 返回預設的圖片解析示範拓樸（含4個節點）|
| `/api/audit` | 使用本地規則引擎進行靜態分析 |

Mock 模式下，所有回應的 `warning` 欄位會包含提示字串。
