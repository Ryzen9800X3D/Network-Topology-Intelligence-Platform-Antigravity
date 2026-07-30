# 📦 詳細安裝指南 (Detailed Installation Guide)

## 目錄 (Table of Contents)

1. [系統需求](#1-系統需求-system-requirements)
2. [安裝 Node.js](#2-安裝-nodejs)
3. [取得專案程式碼](#3-取得專案程式碼)
4. [設定後端環境](#4-設定後端環境)
5. [取得 Gemini API Key](#5-取得-gemini-api-key)
6. [設定前端環境](#6-設定前端環境)
7. [啟動服務](#7-啟動服務)
8. [驗證安裝](#8-驗證安裝)
9. [常見問題排除](#9-常見問題排除-troubleshooting)

---

## 1. 系統需求 (System Requirements)

| 項目 | 最低需求 | 建議 |
|------|---------|------|
| 作業系統 | Windows 10 / macOS 12 / Ubuntu 20.04 | Windows 11 / macOS 14 / Ubuntu 22.04 |
| Node.js | v18.0.0 | v20.x LTS |
| npm | v9.x | v10.x |
| 記憶體 | 4 GB RAM | 8 GB RAM |
| 磁碟空間 | 500 MB（含 node_modules）| 1 GB |
| 網路 | 需要網路連線（下載套件及呼叫 Gemini API）| — |
| 瀏覽器 | Chrome 100+ / Firefox 100+ / Edge 100+ | Chrome 最新版 |

---

## 2. 安裝 Node.js

### Windows

**方法一：官方安裝程式（推薦）**
1. 前往 [https://nodejs.org/](https://nodejs.org/)
2. 下載 **LTS 版本**（例如 v20.x）的 `.msi` 安裝程式
3. 執行安裝程式，保持預設選項（確保勾選 "Add to PATH"）
4. 安裝完成後，重新開啟 PowerShell 並驗證：
   ```powershell
   node -v   # 應顯示 v20.x.x
   npm -v    # 應顯示 10.x.x
   ```

**方法二：使用 winget（Windows 11）**
```powershell
winget install OpenJS.NodeJS.LTS
```

**方法三：免安裝可攜版（無管理員權限）**
1. 前往 [https://nodejs.org/dist/](https://nodejs.org/dist/) 下載 `node-v20.x.x-win-x64.zip`
2. 解壓縮至您的工作目錄
3. 在 PowerShell 中臨時加入路徑：
   ```powershell
   $env:PATH = "C:\path\to\node;" + $env:PATH
   ```

### macOS

```bash
# 使用 Homebrew（推薦）
brew install node@20
brew link node@20

# 驗證
node -v && npm -v
```

### Linux (Ubuntu / Debian)

```bash
# 使用 NodeSource 官方 PPA
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 驗證
node -v && npm -v
```

---

## 3. 取得專案程式碼

```bash
# 克隆儲存庫
git clone https://github.com/Ryzen9800X3D/Network-Topology-Intelligence-Platform-Antigravity.git

# 進入專案目錄
cd Network-Topology-Intelligence-Platform-Antigravity

# 確認目錄結構
ls
# 應看到：client/  server/  start.ps1  README.md  .gitignore
```

---

## 4. 設定後端環境

```bash
# 進入 server 目錄
cd server

# 安裝所有後端相依套件
npm install

# 確認安裝成功（應看到 node_modules 目錄）
ls node_modules | head -5
```

### 設定環境變數

```bash
# 從範本複製 .env 檔案
cp .env.example .env
```

使用任意文字編輯器開啟 `.env`：

```env
PORT=3001
GEMINI_API_KEY=your_gemini_api_key_here
```

> ⚠️ **重要：** `.env` 檔案包含敏感資訊，已被 `.gitignore` 排除，**請勿提交至 Git 儲存庫**。

---

## 5. 取得 Gemini API Key

> **注意：** Gemini API Key 為選用項目。若不設定，系統將自動以 **Mock 模式**運行，使用本地規則引擎和預設拓樸範本，功能仍完整可用（適合開發測試）。

### 取得步驟

1. 前往 [Google AI Studio](https://aistudio.google.com/)
2. 使用 Google 帳號登入
3. 點擊左側選單的 **"Get API key"**
4. 點擊 **"Create API key"**
5. 選擇現有的 Google Cloud 專案或建立新專案
6. 複製產生的 API Key
7. 將 API Key 貼入 `server/.env` 的 `GEMINI_API_KEY=` 後面

### API 使用費用說明

| 模型 | 免費額度 | 超出費用 |
|------|---------|---------|
| Gemini 1.5 Flash | 每分鐘 15 次請求，每日 1,500 次 | 按用量計費 |

本平台使用 **Gemini 1.5 Flash**（最具成本效益的模型），一般日常使用量通常在免費額度範圍內。

---

## 6. 設定前端環境

```bash
# 回到專案根目錄
cd ..

# 進入 client 目錄
cd client

# 安裝所有前端相依套件（包含 React、vis-network、lucide-react 等）
npm install

# 驗證安裝（應看到 node_modules 目錄）
ls node_modules | head -5
```

---

## 7. 啟動服務

### Windows（推薦：使用一鍵啟動腳本）

```powershell
# 回到專案根目錄
cd ..

# 執行啟動腳本
.\start.ps1
```

> 若出現執行策略錯誤，請先執行：
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```

### 手動分別啟動（Windows / macOS / Linux 通用）

**終端機視窗 1 — 後端伺服器：**
```bash
cd server
node server.js
# 應看到：Backend Server running on port 3001
```

**終端機視窗 2 — 前端開發伺服器：**
```bash
cd client
npm run dev
# 應看到：Local: http://localhost:3000/
```

### 開啟應用程式

開啟瀏覽器，訪問：**http://localhost:3000**

---

## 8. 驗證安裝

### 確認後端正常運行

```bash
# 使用 curl 測試 API（需安裝 curl）
curl -X POST http://localhost:3001/api/audit \
  -H "Content-Type: application/json" \
  -d '{"topology": {"nodes": [], "edges": []}}'

# 應回傳類似以下 JSON（含 healthScore 欄位）：
# {"success":true,"data":{"healthScore":70,"audits":[...]},"warning":"Server running in Mock mode..."}
```

### 確認前端正常渲染

1. 訪問 http://localhost:3000
2. 應看到深色標題列「NOC Topology Discovery Center」
3. 右側顯示 API Server 狀態（橙色 = Mock Mode，綠色 = Gemini AI Active）
4. 點擊 **"Load NOC Demo"** 按鈕
5. 畫布應自動出現 7 個節點（核心交換器、發布層交換器、伺服器、紫色儲存陣列、玫瑰紅防火牆）

---

## 9. 常見問題排除 (Troubleshooting)

### ❌ `npm install` 失敗

**可能原因與解決方式：**
```bash
# 清除 npm 快取後重試
npm cache clean --force
npm install

# 若有 proxy 問題
npm config set proxy null
npm config set https-proxy null
npm install
```

### ❌ 後端啟動後顯示 `Cannot find module 'express'`

```bash
# 確認在 server/ 目錄執行 npm install
cd server
npm install
node server.js
```

### ❌ 前端顯示「Cannot connect to backend server」

1. 確認後端伺服器已在 Port 3001 啟動
2. 確認 `client/vite.config.js` 的 proxy 目標為 `http://localhost:3001`
3. 檢查防火牆是否阻擋 Port 3001

**Windows 防火牆快速放行：**
```powershell
New-NetFirewallRule -DisplayName "NOC Backend 3001" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow
```

### ❌ 畫布節點不顯示圖標

- 確認瀏覽器支援 SVG Data URI（Chrome、Firefox、Edge 均支援）
- 嘗試強制重新整理：`Ctrl + Shift + R`

### ❌ Git push 被拒絕（authentication failed）

```bash
# 使用 Personal Access Token（PAT）替代密碼
# 前往 GitHub Settings → Developer settings → Personal Access Tokens
# 建立 Token 並賦予 repo 權限
# 推送時使用 Token 作為密碼

git push -u origin main
# Username: 您的 GitHub 帳號
# Password: 您的 Personal Access Token
```

### ❌ Windows 網路磁碟機執行 Git 出現「dubious ownership」錯誤

```powershell
git config --global --add safe.directory '%(prefix)///server_name/share/path'
```

---

## 進階配置 (Advanced Configuration)

### 更換 Gemini 模型

在 `server/server.js` 中修改模型名稱：
```javascript
// 預設使用 gemini-1.5-flash（最佳速度/成本比）
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// 可改為 gemini-1.5-pro（更高精確度，但費用較高）
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
```

### 修改 API 伺服器 Port

在 `server/.env` 中修改：
```env
PORT=8080
```

並同步更新 `client/vite.config.js`：
```javascript
proxy: {
  '/api': {
    target: 'http://localhost:8080',
  }
}
```

### 建置生產版本 (Production Build)

```bash
cd client
npm run build
# 產出靜態檔案至 client/dist/
# 可部署至任何靜態檔案伺服器（Nginx、Apache、Vercel、Netlify）
```
