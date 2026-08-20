import os

with open('src/styles.css', 'r', encoding='utf-8') as f:
    css = f.read()

with open('src/app.js', 'r', encoding='utf-8') as f:
    js = f.read()

html_body = r"""
<div class="app-container">
  <aside class="sidebar">
    <div class="history-header">
      <div class="brand-badge">
        <span class="brand-icon">🚢</span>
        <div class="brand-info">
          <span class="brand-title">Landed Cost</span>
          <span class="brand-sub">Shipments</span>
        </div>
      </div>
      <button class="btn-new-shipment" id="newShipmentBtn" title="New Shipment">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14m-7-7h14"/></svg>
        <span>New</span>
      </button>
    </div>
    <div class="history-list" id="historyList">
      <!-- Populated by JS -->
    </div>
  </aside>

  <main class="main-content">
    <div class="topbar">
      <div class="topbar-manifest">
        <input type="text" id="shipmentName" class="topbar-title" value="Shipment 1" placeholder="Name this shipment...">
        <div class="manifest-route-bar">
          <span class="route-point">
            <span class="route-flag">CN</span>
            <input type="text" id="routeOrigin" value="GUANGZHOU" class="route-input">
          </span>
          <span class="route-arrow">➔</span>
          <span class="route-point">
            <span class="route-flag">LK</span>
            <input type="text" id="routePort" value="COLOMBO" class="route-input">
          </span>
          <span class="route-arrow">➔</span>
          <span class="route-point">
            <span class="route-flag">DEST</span>
            <input type="text" id="routeDest" value="MATARA" class="route-input">
          </span>
        </div>
      </div>
      <div class="topbar-actions">
        <button class="btn-secondary" id="shareWaBtn" style="color:#16a34a; border-color:#86efac;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
          Share
        </button>
        <button class="btn-secondary" id="exportPdfBtn">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 15V3m0 12l-4-4m4 4l4-4M2 17l.621 2.485A2 2 0 0 0 4.561 21h14.878a2 2 0 0 0 1.94-1.515L22 17"/></svg>
          Print PDF
        </button>
        <button class="btn-secondary" id="exportExcelBtn">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="8" y1="13" x2="16" y2="13"></line><line x1="8" y1="17" x2="16" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
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
            <div class="dz-sub">Drag & drop files or click anywhere to browse</div>
            <div class="dz-badges">
              <span class="dz-badge">📊 Excel (.xlsx, .xls, .csv)</span>
              <span class="dz-badge">📄 PDF Invoice</span>
              <span class="dz-badge">📷 WhatsApp Photo</span>
            </div>
            <input type="file" id="fileInput" accept=".xls,.xlsx,.csv,.pdf,.jpg,.jpeg,.png,.webp" style="display:none;">
          </div>

          <div class="api-key-row" id="apiKeyRow" style="margin-top:12px; display:flex; align-items:center; justify-content:flex-end; gap:8px;">
            <button class="btn-ghost" id="setApiKeyBtn" style="padding:4px 8px; font-size:12px; color:var(--ink-soft);">
              ⚙ Photo Scanner Key
            </button>
          </div>
          <div id="apiKeyPanel" class="hidden" style="margin-top:12px; padding:16px; border:1px solid var(--border); border-radius:var(--radius); background:var(--bg-color);">
            <div class="input-group" style="margin-bottom:8px;">
              <label>Anthropic API Key (for reading photos and PDFs)</label>
              <div class="input-field">
                <input type="password" id="apiKeyInput" placeholder="sk-ant-...">
              </div>
            </div>
            <div class="flex gap-2">
              <button class="btn-primary" id="saveApiKeyBtn">Save Key</button>
              <button class="btn-secondary" id="cancelApiKeyBtn">Close</button>
            </div>
            <div class="text-sm text-muted mt-2">Saved safely in your browser only.</div>
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
        <div class="rate-grid">
          
          <div class="rate-card">
            <div class="rate-card-title">💱 Base Currency</div>
            <div class="input-field" style="margin:0;">
              <select id="baseCurrency">
                <option value="RMB">RMB (¥) Chinese Yuan</option>
                <option value="USD">USD ($) US Dollar</option>
              </select>
            </div>
          </div>

          <div class="rate-card">
            <div class="rate-card-title">📈 Exchange Rate to LKR</div>
            <div class="input-field" style="margin:0;">
              <span class="input-prefix" id="ratePrefix">¥1 = </span>
              <input type="number" id="exRate" step="0.01" placeholder="e.g. 42.50" class="mono">
              <span class="input-suffix">LKR</span>
            </div>
          </div>

          <div class="rate-card">
            <div class="rate-card-title">🚢 Ocean Freight Rate</div>
            <div class="input-field" style="margin:0;">
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
        <div class="preset-chips">
          <button class="preset-chip" id="addFeeBtn">+ Add custom charge</button>
          <button class="preset-chip" data-preset="duty">+ Customs duty (15%)</button>
          <button class="preset-chip" data-preset="vat">+ VAT (18%)</button>
          <button class="preset-chip" data-preset="transport">+ Local transport (35k)</button>
          <button class="preset-chip" data-preset="agent">+ Clearing agent (15k)</button>
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
          <div class="summary-label"><span>📦 Total Volume</span></div>
          <div class="summary-value"><span id="sumCbm">0.00</span> <span class="summary-unit">CBM</span></div>
        </div>
        <div class="summary-card">
          <div class="summary-label"><span>🏷️ Goods Value</span></div>
          <div class="summary-value"><span class="summary-currency">LKR</span> <span id="sumValue">0</span></div>
        </div>
        <div class="summary-card">
          <div class="summary-label"><span>⚓ Freight & Fees</span></div>
          <div class="summary-value"><span class="summary-currency">LKR</span> <span id="sumFees">0</span></div>
        </div>
        <div class="summary-card highlight">
          <div class="summary-stamp">LANDED</div>
          <div class="summary-label"><span>💎 Total Landed Cost</span></div>
          <div class="summary-value"><span class="summary-currency" style="color:rgba(255,255,255,0.75);">LKR</span> <span id="sumTotal">0</span></div>
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
"""

full_html = f"""<!DOCTYPE html>
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
{css}
</style>
</head>
<body>
{html_body}
<script>
{js}
</script>
</body>
</html>"""

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(full_html)

print("Build complete.")
