
import os

with open('src/app.js', 'r', encoding='utf-8') as f:
    js = f.read()

html = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>Landed Cost Manifest</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🚢</text></svg>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
  --bg-color: #F4F5F7;
  --surface: #FFFFFF;
  --surface-raised: #FFFFFF;
  --ink: #111827;
  --ink-soft: #6B7280;
  --ink-lighter: #9CA3AF;
  --border: #E5E7EB;
  --border-strong: #D1D5DB;
  
  --primary: #0F172A;
  --primary-hover: #1E293B;
  
  --accent: #E04D2D; /* Rust/Orange */
  --accent-light: #FCEBE7;
  
  --success: #059669;
  --success-light: #D1FAE5;
  
  --warning: #D97706;
  --warning-light: #FEF3C7;

  --danger: #DC2626;
  --danger-light: #FEE2E2;
  
  --radius-sm: 4px;
  --radius: 8px;
  --radius-lg: 12px;
  
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  
  --transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Inter', -apple-system, sans-serif;
  background-color: var(--bg-color);
  color: var(--ink);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  padding-bottom: 80px;
}

.mono { font-family: 'IBM Plex Mono', monospace; }

/* LAYOUT */
.app-container {
  display: flex;
  max-width: 1400px;
  margin: 0 auto;
  min-height: 100vh;
}

.sidebar {
  width: 280px;
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  height: 100vh;
  z-index: 20;
}

.main-content {
  flex: 1;
  min-width: 0;
  padding: 0 32px 40px;
}

.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 0;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--border);
}

.topbar-title {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

/* WIZARD & CARDS */
.step-section {
  margin-bottom: 32px;
  opacity: 1;
  transform: translateY(0);
  transition: var(--transition);
}

.step-section.hidden {
  opacity: 0;
  transform: translateY(10px);
  pointer-events: none;
  position: absolute;
  visibility: hidden;
}

.step-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.step-num {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: var(--primary);
  color: #fff;
  border-radius: 50%;
  font-size: 13px;
  font-weight: 600;
  font-family: 'IBM Plex Mono', monospace;
}

.step-title {
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  padding: 24px;
  transition: var(--transition);
}

.card:hover {
  box-shadow: var(--shadow);
}

/* BUTTONS */
button {
  font-family: 'Inter', sans-serif;
  font-weight: 500;
  font-size: 14px;
  cursor: pointer;
  border-radius: var(--radius);
  border: 1px solid transparent;
  padding: 8px 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: var(--transition);
}

button:active { transform: translateY(1px); }
button:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-primary { background: var(--primary); color: #fff; }
.btn-primary:hover { background: var(--primary-hover); }

.btn-secondary { background: var(--surface); border-color: var(--border-strong); color: var(--ink); }
.btn-secondary:hover { background: var(--bg-color); }

.btn-danger { background: var(--danger-light); color: var(--danger); border-color: transparent; }
.btn-danger:hover { background: var(--danger); color: #fff; }

.btn-ghost { background: transparent; color: var(--ink-soft); }
.btn-ghost:hover { background: var(--bg-color); color: var(--ink); }

.btn-icon { padding: 6px; border-radius: var(--radius-sm); }

/* INPUTS */
.input-group {
  margin-bottom: 16px;
}
.input-group label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--ink-soft);
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.input-field {
  display: flex;
  align-items: center;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  overflow: hidden;
  transition: var(--transition);
}
.input-field:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.1);
}
.input-prefix, .input-suffix {
  padding: 8px 12px;
  color: var(--ink-soft);
  background: var(--bg-color);
  font-family: 'IBM Plex Mono', monospace;
  font-size: 13px;
  border-right: 1px solid var(--border);
}
.input-suffix {
  border-right: none;
  border-left: 1px solid var(--border);
}
.input-field input, .input-field select {
  flex: 1;
  width: 100%;
  border: none;
  padding: 10px 12px;
  font-size: 14px;
  font-family: 'Inter', sans-serif;
  color: var(--ink);
  background: transparent;
  outline: none;
}
.input-field input.mono {
  font-family: 'IBM Plex Mono', monospace;
}
textarea {
  width: 100%;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius);
  padding: 12px;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 13px;
  resize: vertical;
  min-height: 80px;
  color: var(--ink);
}
textarea:focus {
  outline: none;
  border-color: var(--primary);
  background: var(--surface);
}

/* DROPZONE */
.dropzone {
  border: 2px dashed var(--border-strong);
  border-radius: var(--radius-lg);
  padding: 48px 24px;
  text-align: center;
  cursor: pointer;
  background: var(--surface);
  transition: var(--transition);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}
.dropzone:hover, .dropzone.dragover {
  border-color: var(--primary);
  background: rgba(15, 23, 42, 0.02);
}
.dz-icon {
  width: 48px;
  height: 48px;
  background: var(--accent-light);
  color: var(--accent);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}
.dz-title { font-size: 16px; font-weight: 600; }
.dz-sub { font-size: 13px; color: var(--ink-soft); max-width: 400px; }

/* TABS */
.tabs {
  display: flex;
  gap: 8px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 24px;
}
.tab {
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 500;
  color: var(--ink-soft);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: var(--transition);
}
.tab:hover { color: var(--ink); }
.tab.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
  font-weight: 600;
}
.tab-content { display: none; }
.tab-content.active { display: block; animation: fadeIn 0.3s ease; }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

/* TABLE */
.table-container {
  overflow-x: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
th {
  background: var(--bg-color);
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--ink-soft);
  text-align: left;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  font-weight: 600;
  white-space: nowrap;
}
td {
  padding: 10px 16px;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}
tr:last-child td { border-bottom: none; }
tr:hover td { background: rgba(15, 23, 42, 0.02); }
.num { text-align: right; }

.inline-input {
  width: 100%;
  border: 1px solid transparent;
  background: transparent;
  padding: 6px 8px;
  border-radius: var(--radius-sm);
  font-family: inherit;
  font-size: inherit;
  transition: var(--transition);
}
.inline-input:hover { border-color: var(--border-strong); }
.inline-input:focus {
  outline: none;
  border-color: var(--primary);
  background: var(--surface);
  box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.1);
}

/* FEES LIST */
.fee-item {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1.5fr auto;
  gap: 12px;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
}
.fee-item:last-child { border-bottom: none; }
.fee-header {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1.5fr auto;
  gap: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-strong);
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  text-transform: uppercase;
  color: var(--ink-soft);
  font-weight: 600;
}

/* RESULTS SUMMARY */
.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}
.summary-card {
  background: var(--bg-color);
  padding: 20px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  position: relative;
  overflow: hidden;
}
.summary-card.highlight {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}
.summary-label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--ink-soft);
  margin-bottom: 8px;
}
.summary-card.highlight .summary-label { color: rgba(255,255,255,0.8); }
.summary-value {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 24px;
  font-weight: 700;
}
.summary-stamp {
  position: absolute;
  top: 12px;
  right: 12px;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  border: 2px solid rgba(255,255,255,0.2);
  color: rgba(255,255,255,0.8);
  padding: 4px 8px;
  border-radius: 4px;
  transform: rotate(15deg);
}

/* TOASTS */
.toast-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.toast {
  background: var(--primary);
  color: #fff;
  padding: 12px 20px;
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 10px;
  animation: slideInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  opacity: 0;
  transform: translateY(20px);
}
.toast.toast-error { background: var(--danger); }
.toast.toast-success { background: var(--success); }
.toast.hiding { animation: fadeOutRight 0.3s forwards; }

@keyframes slideInUp { to { opacity: 1; transform: translateY(0); } }
@keyframes fadeOutRight { to { opacity: 0; transform: translateX(50px); } }

/* SIDEBAR HISTORY */
.history-header {
  padding: 24px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.history-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}
.history-item {
  padding: 12px;
  border-radius: var(--radius);
  margin-bottom: 8px;
  cursor: pointer;
  transition: var(--transition);
  border: 1px solid transparent;
}
.history-item:hover { background: var(--bg-color); }
.history-item.active {
  background: var(--surface);
  border-color: var(--border-strong);
  box-shadow: var(--shadow-sm);
}
.history-name { font-weight: 600; font-size: 14px; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.history-meta { font-size: 12px; color: var(--ink-soft); font-family: 'IBM Plex Mono', monospace; }

/* UTILS */
.hidden { display: none !important; }
.flex { display: flex; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.gap-2 { gap: 8px; }
.gap-3 { gap: 12px; }
.gap-4 { gap: 16px; }
.mt-2 { margin-top: 8px; }
.mt-4 { margin-top: 16px; }
.mb-2 { margin-bottom: 8px; }
.mb-4 { margin-bottom: 16px; }
.w-full { width: 100%; }
.text-right { text-align: right; }
.text-center { text-align: center; }
.text-sm { font-size: 12px; }
.text-muted { color: var(--ink-soft); }

/* SPINNER */
.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255,255,255,0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 0.8s linear infinite;
}
.spinner.dark { border-color: rgba(0,0,0,0.1); border-top-color: var(--primary); }
@keyframes spin { to { transform: rotate(360deg); } }

/* VISUAL BAR */
.cost-bar-wrap {
  height: 8px;
  width: 100%;
  background: var(--bg-color);
  border-radius: 4px;
  display: flex;
  overflow: hidden;
  margin-top: 16px;
}
.cost-bar-segment { height: 100%; transition: width 0.5s ease; }
.seg-goods { background: var(--ink-lighter); }
.seg-freight { background: var(--warning); }
.seg-fees { background: var(--accent); }

.cost-legend {
  display: flex;
  gap: 16px;
  margin-top: 8px;
  font-size: 11px;
  color: var(--ink-soft);
  text-transform: uppercase;
  font-family: 'IBM Plex Mono', monospace;
}
.legend-item { display: flex; align-items: center; gap: 4px; }
.legend-dot { width: 8px; height: 8px; border-radius: 50%; }

/* ANIMATED NUMBERS */
.anim-num {
  display: inline-block;
  transition: color 0.3s;
}
.anim-num.changed {
  color: var(--accent);
}

/* RESPONSIVE */
@media (max-width: 900px) {
  .app-container { flex-direction: column; }
  .sidebar {
    width: 100%;
    height: auto;
    border-right: none;
    border-bottom: 1px solid var(--border);
    position: static;
  }
  .history-list { display: flex; overflow-x: auto; padding: 12px 24px; gap: 12px; }
  .history-item { min-width: 200px; margin-bottom: 0; }
  .main-content { padding: 0 16px 40px; }
  .fee-header, .fee-item { grid-template-columns: 1fr; gap: 8px; }
  .fee-header { display: none; }
  .fee-item { border: 1px solid var(--border); padding: 16px; border-radius: var(--radius); margin-bottom: 12px; background: var(--bg-color); }
}

/* PRINT */
@media print {
  .sidebar, .topbar button, .step-num, .import-tabs, .tab-content, 
  .btn-primary, .btn-secondary, .btn-danger, .btn-ghost, 
  .toast-container, .dropzone, #addFeeBtn, #addRowBtn, .col-actions, .api-key-row { display: none !important; }
  
  body { background: #fff; color: #000; padding: 0; }
  .app-container { max-width: 100%; display: block; }
  .main-content { padding: 0; }
  .card { border: none; box-shadow: none; padding: 0; margin-bottom: 24px; }
  .table-container { border: none; }
  table { width: 100%; font-size: 10pt; }
  th { background: #fff !important; color: #000; border-bottom: 2px solid #000; padding: 4px; }
  td { padding: 4px; border-bottom: 1px solid #ccc; }
  input, select { border: none !important; background: transparent !important; color: #000 !important; -webkit-appearance: none; padding: 0 !important; }
  .summary-card { border: 1px solid #000; background: #fff !important; color: #000 !important; page-break-inside: avoid; padding: 12px; }
  .summary-card.highlight { border: 2px solid #000; }
  .summary-card.highlight .summary-label { color: #000; }
  .summary-stamp { border-color: #000; color: #000; }
}

</style>
</head>
<body>
<div class="app-container">

  <aside class="sidebar">
    <div class="history-header">
      <div style="font-weight:700; font-size: 16px; display:flex; align-items:center; gap:8px;">
        🚢 Landed Cost
      </div>
      <button class="btn-ghost btn-icon" id="newShipmentBtn" title="New Shipment">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14m-7-7h14"/></svg>
      </button>
    </div>
    <div class="history-list" id="historyList">
      <!-- Populated by JS -->
    </div>
  </aside>

  <main class="main-content">
    <div class="topbar">
      <div>
        <input type="text" id="shipmentName" class="topbar-title" value="Shipment Name" style="border:none; background:transparent; outline:none; font-family:inherit; color:inherit; width: 100%; max-width: 400px;" placeholder="Name this shipment...">
        <div style="display:flex; align-items:center; gap:8px; margin-top:8px; color:var(--ink-soft); font-size:13px;" class="mono">
          <input type="text" id="routeOrigin" value="GUANGZHOU" style="border:none; background:transparent; font-family:inherit; color:inherit; width:80px; text-align:right;">
          <span style="color:var(--accent);">→</span>
          <input type="text" id="routePort" value="COLOMBO" style="border:none; background:transparent; font-family:inherit; color:inherit; width:70px; text-align:center;">
          <span style="color:var(--accent);">→</span>
          <input type="text" id="routeDest" value="MATARA" style="border:none; background:transparent; font-family:inherit; color:inherit; width:80px;">
        </div>
      </div>
      <div style="display:flex; gap:12px;">
        <button class="btn-secondary" id="shareWaBtn" style="color:#25D366; border-color:#25D366;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
          Share
        </button>
        <button class="btn-secondary" id="exportPdfBtn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 15V3m0 12l-4-4m4 4l4-4M2 17l.621 2.485A2 2 0 0 0 4.561 21h14.878a2 2 0 0 0 1.94-1.515L22 17"/></svg>
          Print PDF
        </button>
        <button class="btn-secondary" id="exportExcelBtn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="8" y1="13" x2="16" y2="13"></line><line x1="8" y1="17" x2="16" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          Export .xlsx
        </button>
      </div>
    </div>

    <!-- WIZARD STEP 1 -->
    <section class="step-section" id="step1">
      <div class="step-header">
        <div class="step-num">1</div>
        <h2 class="step-title">Packing List</h2>
      </div>
      <div class="card">
        <div class="tabs">
          <div class="tab active" data-tab="upload">Drop file or photo</div>
          <div class="tab" data-tab="paste">Paste rows</div>
        </div>

        <div class="tab-content active" id="tab-upload">
          <div class="dropzone" id="dropzone">
            <div class="dz-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
            </div>
            <div class="dz-title">Drop your packing list here</div>
            <div class="dz-sub">.xls, .xlsx, .csv, .pdf — or a photo/screenshot (.jpg, .png) straight from WhatsApp.</div>
            <input type="file" id="fileInput" accept=".xls,.xlsx,.csv,.pdf,.jpg,.jpeg,.png,.webp" style="display:none;">
          </div>

          <div class="api-key-row" id="apiKeyRow" style="margin-top:16px; display:flex; align-items:center; gap:12px;">
            <span class="text-sm text-muted mono" id="apiKeyStatus">Add your Anthropic API key to read photos & PDFs.</span>
            <button class="btn-ghost" id="setApiKeyBtn" style="padding:4px 8px; font-size:12px;">Set API key</button>
          </div>
          <div id="apiKeyPanel" class="hidden" style="margin-top:12px; padding:16px; border:1px solid var(--border); border-radius:var(--radius); background:var(--bg-color);">
            <div class="input-group" style="margin-bottom:8px;">
              <label>Anthropic API Key</label>
              <div class="input-field">
                <input type="password" id="apiKeyInput" placeholder="sk-ant-...">
              </div>
            </div>
            <div class="flex gap-2">
              <button class="btn-primary" id="saveApiKeyBtn">Save</button>
              <button class="btn-secondary" id="cancelApiKeyBtn">Cancel</button>
            </div>
            <div class="text-sm text-muted mt-2">Stored only in this browser.</div>
          </div>

          <div id="parseStatus" class="hidden text-sm mono mt-4 text-center" style="color:var(--primary); display:flex; align-items:center; justify-content:center; gap:8px;">
            <div class="spinner dark hidden" id="parseSpinner"></div>
            <span id="parseStatusText"></span>
          </div>

          <!-- MAPPING PANEL -->
          <div id="mappingPanel" class="hidden mt-4" style="border:1px solid var(--border-strong); border-radius:var(--radius); padding:20px; background:var(--surface);">
            <h3 style="font-size:16px; font-weight:600; margin-bottom:4px;">Match your columns</h3>
            <p class="text-sm text-muted mb-4">We found a table starting at row <span id="headerRowLabel" class="mono"></span>. Check the mapping below.</p>
            
            <div class="input-group hidden mb-4" id="sheetPicker">
              <label>Sheet</label>
              <div class="input-field"><select id="sheetSelect"></select></div>
            </div>

            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:16px; margin-bottom:16px;">
              <div class="input-group mb-0">
                <label>Description</label>
                <div id="descChecks" style="max-height:120px; overflow-y:auto; border:1px solid var(--border); border-radius:var(--radius-sm); padding:8px; background:var(--bg-color);"></div>
              </div>
              <div class="input-group mb-0"><label>Quantity</label><div class="input-field"><select id="mapQty"></select></div></div>
              <div class="input-group mb-0"><label>Unit Price</label><div class="input-field"><select id="mapPrice"></select></div></div>
              <div class="input-group mb-0"><label>Total CBM (for line)</label><div class="input-field"><select id="mapCbm"></select></div></div>
            </div>

            <div class="table-container mb-4">
              <table id="mappingPreviewTable"></table>
            </div>

            <div class="flex items-center gap-3">
              <button class="btn-primary" id="confirmImportBtn">Import Rows</button>
              <button class="btn-secondary" id="cancelImportBtn">Cancel</button>
              <span id="mappingNote" class="text-sm text-muted mono ml-auto" style="margin-left:auto;"></span>
            </div>
          </div>
        </div>

        <div class="tab-content" id="tab-paste">
          <textarea id="pasteBox" placeholder="Paste rows from Excel here...&#10;Headlight  50  38.5  1.2"></textarea>
          <div class="flex items-center justify-between mt-2">
            <label class="flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" id="hasHeader" checked> First line is a header
            </label>
            <button class="btn-primary" id="parseBtn">Add rows from paste</button>
          </div>
        </div>

        <div class="mt-4">
          <div class="flex items-center justify-between mb-2">
            <div style="font-weight:600; font-size:14px;">Items (<span id="itemCount">0</span>)</div>
            <div class="flex gap-2">
              <button class="btn-secondary btn-icon" id="undoClearBtn" title="Undo Clear" style="display:none;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"/></svg>
              </button>
              <button class="btn-danger" id="clearItemsBtn" style="padding:4px 8px; font-size:12px;">Clear All</button>
            </div>
          </div>
          <div class="table-container">
            <table id="itemsTable">
              <thead>
                <tr>
                  <th style="width:40px">#</th>
                  <th>Description</th>
                  <th class="num" style="width:100px">Qty</th>
                  <th class="num" style="width:140px">Unit Price</th>
                  <th class="num" style="width:120px">Total CBM</th>
                  <th class="num" style="width:140px">Value Total</th>
                  <th style="width:40px"></th>
                </tr>
              </thead>
              <tbody id="itemsBody"></tbody>
            </table>
          </div>
          <div id="itemsEmpty" class="text-center text-muted" style="padding:32px 16px; font-style:italic; font-size:13px;">
            No items yet. Drop a file, paste rows, or add manually.
          </div>
          <button class="btn-ghost mt-2" id="addRowBtn">+ Add Item Manually</button>
        </div>
      </div>
    </section>

    <!-- WIZARD STEP 2 -->
    <section class="step-section" id="step2">
      <div class="step-header">
        <div class="step-num">2</div>
        <h2 class="step-title">Exchange & Freight Rate</h2>
      </div>
      <div class="card">
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:24px;">
          
          <div class="input-group mb-0">
            <label>Base Currency</label>
            <div class="input-field">
              <select id="baseCurrency">
                <option value="RMB">RMB (¥)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>
          </div>

          <div class="input-group mb-0">
            <label>Exchange Rate to LKR</label>
            <div class="input-field">
              <span class="input-prefix" id="ratePrefix">¥1 = </span>
              <input type="number" id="exRate" step="0.01" placeholder="e.g. 42.50" class="mono">
              <span class="input-suffix">LKR</span>
            </div>
          </div>

          <div class="input-group mb-0">
            <label>Ocean Freight Rate</label>
            <div class="input-field">
              <span class="input-prefix">LKR</span>
              <input type="number" id="cbmRate" step="1" placeholder="e.g. 35000" class="mono">
              <span class="input-suffix">per CBM</span>
            </div>
          </div>

        </div>
      </div>
    </section>

    <!-- WIZARD STEP 3 -->
    <section class="step-section" id="step3">
      <div class="step-header">
        <div class="step-num">3</div>
        <h2 class="step-title">Other Charges</h2>
      </div>
      <div class="card">
        <div class="fee-header">
          <div>Charge Name</div>
          <div>Type</div>
          <div>Amount</div>
          <div>Spread By</div>
          <div></div>
        </div>
        <div id="feesBody"></div>
        <div class="flex gap-2 mt-4" style="flex-wrap:wrap;">
          <button class="btn-secondary" id="addFeeBtn">+ Add charge</button>
          <button class="btn-ghost" data-preset="duty">+ Customs duty %</button>
          <button class="btn-ghost" data-preset="vat">+ VAT %</button>
          <button class="btn-ghost" data-preset="transport">+ Local transport</button>
          <button class="btn-ghost" data-preset="agent">+ Clearing agent</button>
        </div>
      </div>
    </section>

    <!-- WIZARD STEP 4 -->
    <section class="step-section" id="step4">
      <div class="step-header">
        <div class="step-num" style="background:var(--success);">4</div>
        <h2 class="step-title">Landed Cost Results</h2>
        <div style="margin-left:auto; display:flex; align-items:center; gap:12px;">
          <label style="font-size:12px; font-weight:600; color:var(--ink-soft); text-transform:uppercase;">Markup Target</label>
          <div class="input-field" style="width:100px;">
            <input type="number" id="markupPercent" value="30" class="mono text-right" style="padding:6px;">
            <span class="input-suffix">%</span>
          </div>
        </div>
      </div>
      
      <div class="summary-grid">
        <div class="summary-card">
          <div class="summary-label">Total CBM</div>
          <div class="summary-value" id="sumCbm">0.00</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Goods (LKR)</div>
          <div class="summary-value" id="sumValue">0</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Freight & Fees (LKR)</div>
          <div class="summary-value" id="sumFees">0</div>
        </div>
        <div class="summary-card highlight">
          <div class="summary-stamp">LANDED</div>
          <div class="summary-label">Total Landed Cost</div>
          <div class="summary-value" id="sumTotal">0</div>
        </div>
      </div>

      <div class="card" style="padding:0; overflow:hidden;">
        <div class="table-container" style="border:none; border-radius:0;">
          <table id="resultsTable">
            <thead style="background:var(--primary); color:#fff;">
              <tr>
                <th style="color:rgba(255,255,255,0.8); background:var(--primary);">Description</th>
                <th class="num" style="color:rgba(255,255,255,0.8); background:var(--primary);">Qty</th>
                <th class="num" style="color:rgba(255,255,255,0.8); background:var(--primary);">Value</th>
                <th class="num" style="color:rgba(255,255,255,0.8); background:var(--primary);">Freight</th>
                <th class="num" style="color:rgba(255,255,255,0.8); background:var(--primary);">Charges</th>
                <th class="num" style="color:#fff; background:var(--primary);">Unit Landed</th>
                <th class="num" style="color:var(--success-light); background:var(--primary);">Target Sell Price</th>
              </tr>
            </thead>
            <tbody id="resultsBody"></tbody>
            <tfoot style="background:var(--bg-color); font-family:'IBM Plex Mono',monospace; font-weight:700;">
              <tr>
                <td style="font-family:'Inter',sans-serif; text-transform:uppercase; font-size:11px; color:var(--ink-soft);">Totals</td>
                <td class="num" id="footQty">0</td>
                <td class="num" id="footValue">0</td>
                <td class="num" id="footFreight">0</td>
                <td class="num" id="footCharges">0</td>
                <td class="num" colspan="2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div style="padding:20px; background:var(--bg-color); border-top:1px solid var(--border);">
          <div class="cost-legend">
            <div class="legend-item"><div class="legend-dot seg-goods"></div>Goods Value</div>
            <div class="legend-item"><div class="legend-dot seg-freight"></div>Freight</div>
            <div class="legend-item"><div class="legend-dot seg-fees"></div>Other Charges</div>
          </div>
          <div class="cost-bar-wrap" id="costCompositionBar">
            <div class="cost-bar-segment seg-goods" id="barGoods" style="width:0%"></div>
            <div class="cost-bar-segment seg-freight" id="barFreight" style="width:0%"></div>
            <div class="cost-bar-segment seg-fees" id="barFees" style="width:0%"></div>
          </div>
        </div>
      </div>
      <div class="flex justify-between mt-4">
        <span class="text-sm text-muted mono" id="saveStatus">Auto-saved</span>
        <button class="btn-secondary" id="copyTableBtn">Copy to Clipboard (TSV)</button>
      </div>
    </section>
  </main>
</div>

<div class="toast-container" id="toastContainer"></div>

<!-- SheetJS for XLSX support -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>

""" + "<script>\n" + js + "\n</script></body></html>"

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Build complete.")
