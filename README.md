# 🌐 Network Topology Intelligence Platform

<div align="center">

![NOC Banner](https://img.shields.io/badge/NOC-Topology%20Intelligence-0284c7?style=for-the-badge&logo=cisco&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?style=for-the-badge&logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-18.x-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Express](https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express&logoColor=white)
![Gemini AI](https://img.shields.io/badge/Gemini-AI%20Powered-4285F4?style=for-the-badge&logo=google&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)

**企業級 AI 驅動網路拓樸自動發現與安全稽核平台**

*Enterprise-grade AI-powered Network Topology Auto-Discovery & Security Audit Platform*

[🚀 快速開始](#-快速開始) · [📖 功能特色](#-功能特色) · [🏗️ 系統架構](#️-系統架構) · [📡 API 文件](#-api-文件) · [🔐 安全說明](#-安全說明)

</div>

---

## 📋 專案目標 (Project Goals)

本平台旨在解決企業網路維運中心（NOC）工程師最核心的痛點：**網路拓樸可視化困難、設備關係難以追蹤、安全合規檢查耗時費力**。

傳統方式需人工繪製 Visio 架構圖、手動比對 CLI 輸出，耗費大量時間且容易出錯。本平台透過 **Google Gemini AI 多模態能力**，實現：

| 痛點 | 解決方案 |
|------|----------|
| 🔴 手動繪製拓樸費時 | ✅ 貼上 CLI 輸出，AI 自動解析並繪製 |
| 🔴 架構圖無法快速轉為資料 | ✅ 上傳圖片/白板照片，AI OCR 識別節點與連線 |
| 🔴 安全稽核需人工逐項比對 | ✅ 一鍵 AI 自動稽核，生成安全健康評分與建議 |
| 🔴 拓樸變更難以即時同步 | ✅ 手動建置器支援即時增刪設備與連線 |

---

## ✨ 功能特色 (Key Features)

### 🤖 AI 驅動發現引擎
- **CLI 文字解析** — 支援 Cisco LLDP、CDP、MAC 位址表等多種格式自動解析
- **多模態圖片 OCR** — 上傳網路圖、白板草稿、Visio 截圖，AI 自動識別拓樸
- **雙模式整合** — 新發現可「追加」至現有畫布或「取代」重建
- **智慧備用機制** — 無 API Key 時自動切換本地規則引擎，確保功能完整

### 🗺️ 互動式拓樸畫布
- **Force Atlas 2 物理引擎** — 節點具備彈性排斥與吸引力學，自動展開呈對稱排列
- **高對比向量圖標（SVG）** — 五種設備角色各有專屬設計：
  - 🟡 **核心交換器（Core Switch）** — 金黃色放射形環形圖標
  - 🔵 **交換器（Switch）** — 天空藍含 LED 狀態燈端口面板
  - 🟢 **伺服器（Server）** — 青藍色機架式伺服器槽位圖
  - 🟣 **儲存陣列（Storage SAN/NAS）** — 紫羅蘭色多磁碟刀鋒機箱
  - 🔴 **防火牆（Firewall）** — 玫瑰紅磚牆防禦盾牌結構
- **拖曳縮放** — 全畫布支援滑鼠滾輪縮放與拖曳平移

### 🔍 浮動屬性檢視器（Inspector Card）
點擊畫布任意設備或連線，即在左下角彈出詳細資訊浮動卡片：
- 設備主機名稱、類型標籤
- 管理 IP 位址與實體 MAC 位址
- 所有對接連線的本端/遠端介面清單

### 🛠️ 手動拓樸編輯器
- 新增任意類型基礎設施設備
- 填入管理 IP 與 MAC 位址
- 透過下拉選單選擇設備連接埠進行連線
- 即時在畫布上呈現新增節點與邊線

### 🛡️ NOC 安全稽核儀表板
- **安全健康評分（0~100）** — 圓形進度儀表顯示整體網路安全狀態
- **三大稽核維度**：
  - **Security（安全性）** — 偵測防火牆是否存在且在線
  - **Redundancy（冗餘性）** — 偵測儲存設備多路徑、核心交換器 ISL 連線
  - **Configuration（配置）** — 偵測管理 IP 缺失等設定問題
- 每張稽核卡片提供具體改善建議

---

## 🏗️ 系統架構 (System Architecture)

```
┌─────────────────────────────────────────────────────────────┐
│                     使用者瀏覽器                              │
│                                                              │
│  ┌──────────────────────┐    ┌──────────────────────────┐   │
│  │   Vis-Network Canvas  │    │     React Sidebar         │   │
│  │   (Force Atlas 2)     │    │  ┌──────────────────────┐│   │
│  │                       │    │  │  AI Discovery Panel  ││   │
│  │  ┌─────┐  ┌──────┐   │    │  │  (Text / Image tabs) ││   │
│  │  │  🟡 │  │  🔵  │   │◄──►│  ├──────────────────────┤│   │
│  │  └─────┘  └──────┘   │    │  │  Manual Builder       ││   │
│  │      │         │      │    │  ├──────────────────────┤│   │
│  │  ┌───┴─────────┴──┐  │    │  │  NOC Audit Dashboard  ││   │
│  │  │   Floating      │  │    │  └──────────────────────┘│   │
│  │  │  Inspector Card │  │    └──────────────────────────┘   │
│  │  └────────────────┘  │                                    │
│  └──────────────────────┘                                    │
└─────────────────────┬───────────────────────────────────────┘
                       │ HTTP /api/*  (Vite Proxy → Port 3001)
┌─────────────────────▼───────────────────────────────────────┐
│                  Express Backend (Port 3001)                 │
│                                                              │
│  ┌──────────────┐  ┌─────────────────┐  ┌───────────────┐  │
│  │ POST         │  │ POST            │  │ POST          │  │
│  │ /api/parse   │  │ /api/parse-image│  │ /api/audit    │  │
│  │ (CLI Logs)   │  │ (Multimodal OCR)│  │ (Security)    │  │
│  └──────┬───────┘  └────────┬────────┘  └──────┬────────┘  │
│         │                   │                   │           │
│  ┌──────▼───────────────────▼───────────────────▼────────┐  │
│  │              Google Gemini 1.5 Flash API               │  │
│  │         (with regex / rule-based local fallback)       │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │         computeTopology() — 拓樸聚合引擎                │  │
│  │    ● 節點去重合併  ● 重複邊線過濾  ● Append / Replace  │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 技術棧 (Tech Stack)

| 層次 | 技術 | 用途 |
|------|------|------|
| 前端框架 | React 18 + Vite 5 | 單頁應用程式建置 |
| 圖形渲染 | vis-network 9.x | 互動式物理模擬網路圖 |
| UI 圖標 | lucide-react | 介面向量圖標 |
| 樣式 | Vanilla CSS | 自定義 NOC 主題設計系統 |
| 後端框架 | Express 4.x | REST API 服務 |
| AI 模型 | Google Gemini 1.5 Flash | 文字/圖片解析與安全稽核 |
| 檔案上傳 | multer | 多模態圖片接收處理 |
| 環境管理 | dotenv | API 金鑰安全載入 |

---

## 🚀 快速開始 (Quick Start)

### 前置需求 (Prerequisites)

- [Node.js](https://nodejs.org/) **v18 或以上版本**
- [Git](https://git-scm.com/)
- Google Gemini API Key（可選，無 Key 時以 Mock 模式運行）

### 安裝步驟 (Installation)

```bash
# 1. 克隆儲存庫
git clone https://github.com/Ryzen9800X3D/Network-Topology-Intelligence-Platform-Antigravity.git
cd Network-Topology-Intelligence-Platform-Antigravity

# 2. 安裝後端相依套件
cd server
npm install

# 3. 設定環境變數
cp .env.example .env
# 編輯 .env，填入您的 Gemini API Key：
# GEMINI_API_KEY=your_api_key_here

# 4. 安裝前端相依套件
cd ../client
npm install

# 5. 回到根目錄，使用啟動腳本
cd ..
```

### 啟動服務 (Start Services)

**Windows (PowerShell)：**
```powershell
.\start.ps1
```

**或分別手動啟動：**
```bash
# 終端機 1 — 啟動後端
cd server
node server.js

# 終端機 2 — 啟動前端
cd client
npm run dev
```

開啟瀏覽器訪問 **http://localhost:3000** 即可使用。

> 詳細安裝說明請參閱 [INSTALLATION.md](./INSTALLATION.md)

---

## 📡 API 文件 (API Reference)

詳細 API 說明請參閱 [docs/API.md](./docs/API.md)。

| 端點 | 方法 | 說明 |
|------|------|------|
| `/api/parse` | POST | 解析 CLI 文字輸出為拓樸資料 |
| `/api/parse-image` | POST | 多模態圖片 OCR 識別拓樸 |
| `/api/audit` | POST | AI 安全稽核並生成評分報告 |

---

## 📁 專案結構 (Project Structure)

```
Network-Topology-Intelligence-Platform-Antigravity/
├── 📄 README.md                  # 本文件
├── 📄 INSTALLATION.md            # 詳細安裝指南
├── 📄 CHANGELOG.md               # 版本更新紀錄
├── 📄 .gitignore                 # Git 忽略規則
├── 📄 start.ps1                  # Windows 一鍵啟動腳本
│
├── 📁 server/                    # Express 後端
│   ├── 📄 server.js              # API 主程式
│   ├── 📄 utils.js               # 拓樸聚合與稽核引擎
│   ├── 📄 package.json
│   └── 📄 .env.example           # 環境變數範本
│
├── 📁 client/                    # React 前端
│   ├── 📄 index.html             # 應用程式入口
│   ├── 📄 vite.config.js         # Vite 建置設定
│   ├── 📄 package.json
│   └── 📁 src/
│       ├── 📄 main.jsx           # React 入口點
│       ├── 📄 App.jsx            # 主控元件
│       ├── 📄 icons.js           # SVG 網路設備圖標庫
│       └── 📄 index.css          # NOC 風格設計系統
│
└── 📁 docs/                      # 說明文件
    ├── 📄 API.md                 # API 端點詳細說明
    └── 📄 ARCHITECTURE.md        # 架構設計說明
```

---

## 🔐 安全說明 (Security Notes)

- **`.env` 檔案已被 `.gitignore` 排除**，Gemini API Key 不會上傳至 GitHub
- 使用前請務必從 `.env.example` 複製並設定您的 API Key
- 建議在生產環境中使用環境變數注入而非 `.env` 檔案
- 所有 API 端點預設僅允許本機存取（CORS 設定）

---

## 📜 授權條款 (License)

本專案採用 [MIT License](./LICENSE) 授權。

---

## 🤝 貢獻指南 (Contributing)

歡迎提交 Issue 或 Pull Request！在提交之前，請確保：

1. 程式碼符合現有風格（Vanilla CSS，不使用 Tailwind）
2. 新功能附有對應的說明更新
3. 提交訊息清晰描述變更內容

---

<div align="center">

**由 Antigravity Agentic Design 協助開發 · 2026**

</div>
