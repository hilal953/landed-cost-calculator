
import React from 'react';
import Script from 'next/script';

export default function ProDashboard() {
  return (
    <>
      {/* SheetJS for XLSX support (needed for export) */}
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js" strategy="afterInteractive" />
      {/* PDF.js and Tesseract.js are lazy-loaded on demand in pro.js */}
      {/* Pro Suite Logic */}
      <Script src="/pro.js" strategy="afterInteractive" />
      


{/*  AESTHETIC PRO SUITE TOPBAR  */}
<header className="pro-nav-header">
  <div className="pro-nav-inner">
    
    {/*  Left: Pro Brand & Global Status  */}
    <div className="pro-nav-brand-group">
      <a href="/" className="pro-nav-brand" aria-label="TrueLanded Home">
        <img src="/images/logo.svg" alt="TrueLanded" style={{"height":"26px","width":"auto","display":"block"}} />
      </a>
      <span className="pro-nav-badge">PRO</span>
      <div className="pro-nav-status">
        <span className="pro-status-dot"></span>
        <span className="pro-status-title">Global Engine Active</span>
        <span className="pro-status-sep">•</span>
        <span className="pro-status-sub">14 Currencies &amp; Air/Sea Freight</span>
      </div>
    </div>

    {/*  Right: License Verified & Home Link  */}
    <div className="pro-nav-actions">
      <div className="pro-nav-license">
        <span className="license-chk">✓</span>
        <span className="license-text">$9 LIFETIME LICENSE</span>
      </div>

      <a href="/" className="pro-nav-back-btn">
        <span>← Home</span>
      </a>
    </div>

  </div>
</header>
<div className="app-container">
  <aside className="sidebar">
    <div className="history-header">
      <div className="brand-badge">
        <span className="brand-icon">🚢</span>
        <div className="brand-info">
          <span className="brand-title">TrueLanded</span>
          <span className="brand-sub">Shipments</span>
        </div>
      </div>
      <button className="btn-new-shipment" id="newShipmentBtn" title="New Shipment">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14m-7-7h14" /></svg>
        <span>New</span>
      </button>
    </div>
    <div className="history-list" id="historyList">
      {/*  Populated by JS  */}
    </div>
  </aside>

  <main className="main-content">
    <div className="topbar">
      <div className="topbar-manifest">
        <div className="topbar-eyebrow">
          <span className="eyebrow-dot"></span>
          <span className="eyebrow-text">TrueLanded</span>
        </div>
        <input type="text" id="shipmentName" className="topbar-title" value="Shipment 1" placeholder="Name this shipment..." />
        <div className="manifest-route-ribbon">
          <div className="route-station" title="Origin Country &amp; Port">
            <span className="station-flag" style={{"fontSize":"10px","fontWeight":"800","color":"#64748B","textTransform":"uppercase","background":"transparent","border":"none","padding":"0 4px"}}>FROM</span>
            <input type="text" id="routeOrigin" value="DUBAI / GLOBAL" className="station-input" title="Origin City / Port" style={{"width":"115px"}} placeholder="Origin City" />
          </div>
          <div className="route-transit" title="Transit Mode">
            <span className="transit-line"></span>
            <span className="transit-badge" id="routeTransitBadge">🚢 SEA CARGO</span>
            <span className="transit-line"></span>
          </div>
          <div className="route-station" title="Destination Customs Port">
            <span className="station-flag" style={{"fontSize":"10px","fontWeight":"800","color":"#64748B","textTransform":"uppercase","background":"transparent","border":"none","padding":"0 4px"}}>PORT</span>
            <input type="text" id="routePort" value="COLOMBO" className="station-input" title="Customs Port" placeholder="Customs Port" style={{"width":"85px"}} />
          </div>
          <div className="route-transit" title="Local Inland Transport">
            <span className="transit-line"></span>
            <span className="transit-badge">🚛 INLAND</span>
            <span className="transit-line"></span>
          </div>
          <div className="route-station" title="Final Delivery Location">
            <span className="station-flag dest" style={{"fontSize":"10px","fontWeight":"800","color":"#64748B","textTransform":"uppercase","background":"transparent","border":"none","padding":"0 4px"}}>TO</span>
            <input type="text" id="routeDest" value="DESTINATION" className="station-input" title="Final Destination" placeholder="Final City" style={{"width":"95px"}} />
          </div>
        </div>
      </div>
      <div className="topbar-actions">
        <button className="btn-secondary" id="shareWaBtn" style={{"color":"#16a34a","borderColor":"#86efac"}}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
          Share
        </button>
        <button className="btn-secondary" id="exportPdfBtn">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 15V3m0 12l-4-4m4 4l4-4M2 17l.621 2.485A2 2 0 0 0 4.561 21h14.878a2 2 0 0 0 1.94-1.515L22 17" /></svg>
          Print PDF
        </button>
        <button className="btn-secondary" id="exportExcelBtn">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="16" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
          Export .xlsx
        </button>
      </div>
    </div>

    {/*  WIZARD STEP 1  */}
    <section className="step-section" id="step1">
      <div className="step-header">
        <div className="step-num">1</div>
        <h2 className="step-title">Packing List</h2>
      </div>
      <div className="card">
        <div className="tabs">
          <div className="tab active" data-tab="upload">Drop file or photo</div>
          <div className="tab" data-tab="paste">Paste rows</div>
        </div>

        <div className="tab-content active" id="tab-upload">
          <div className="dropzone" id="dropzone">
            <div className="dz-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
            </div>
            <div className="dz-title">Upload Packing List, Invoice, or Excel</div>
            <div className="dz-sub">Drag &amp; drop files or tap a format below</div>

            <div className="dz-action-grid">
              <button type="button" className="dz-action-btn" id="btnUploadPhoto">
                <span className="dz-action-icon">📷</span>
                <div className="dz-action-text">
                  <span className="dz-action-title">Photo / Scan</span>
                  <span className="dz-action-ext">JPG, PNG, WhatsApp</span>
                </div>
              </button>
              
              <button type="button" className="dz-action-btn" id="btnUploadPdf">
                <span className="dz-action-icon">📄</span>
                <div className="dz-action-text">
                  <span className="dz-action-title">PDF Document</span>
                  <span className="dz-action-ext">Commercial Invoice</span>
                </div>
              </button>
              
              <button type="button" className="dz-action-btn" id="btnUploadExcel">
                <span className="dz-action-icon">📊</span>
                <div className="dz-action-text">
                  <span className="dz-action-title">Excel Sheet</span>
                  <span className="dz-action-ext">XLSX, XLS, CSV</span>
                </div>
              </button>
            </div>
            <input type="file" id="fileInputPhoto" accept="image/*,.jpg,.jpeg,.png,.webp" style={{"display":"none"}} />
            <input type="file" id="fileInputPdf" accept="application/pdf,.pdf" style={{"display":"none"}} />
            <input type="file" id="fileInputExcel" accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,text/comma-separated-values,application/csv" style={{"display":"none"}} />
            <input type="file" id="fileInput" style={{"display":"none"}} />
          </div>

          <div id="parseStatus" className="hidden mt-4" style={{"textAlign":"center"}}>
            <div style={{"display":"flex","alignItems":"center","justifyContent":"center","gap":"8px","marginBottom":"8px"}}>
              <div className="spinner dark hidden" id="parseSpinner"></div>
              <span id="parseStatusText" className="text-sm mono" style={{"fontWeight":"600","color":"var(--primary)"}}></span>
            </div>
            <div id="ocrProgressBarWrap" className="hidden" style={{"width":"100%","maxWidth":"420px","margin":"0 auto","height":"6px","background":"var(--border)","borderRadius":"99px","overflow":"hidden"}}>
              <div id="ocrProgressBar" style={{"width":"0%","height":"100%","background":"var(--accent)","transition":"width 0.2s ease"}}></div>
            </div>
          </div>


          {/*  MAPPING PANEL  */}
          <div id="mappingPanel" className="hidden mt-4" style={{"border":"1px solid var(--border-strong)","borderRadius":"var(--radius)","padding":"20px","background":"var(--surface)"}}>
            <h3 style={{"fontSize":"16px","fontWeight":"600","marginBottom":"4px"}}>Match your columns</h3>
            <p className="text-sm text-muted mb-4">We found a table starting at row <span id="headerRowLabel" className="mono"></span>. Check the mapping below.</p>
            
            <div className="input-group hidden mb-4" id="sheetPicker">
              <label>Sheet</label>
              <div className="input-field"><select id="sheetSelect"></select></div>
            </div>

            <div style={{"display":"grid","gridTemplateColumns":"repeat(auto-fit, minmax(min(100%, 200px), 1fr))","gap":"16px","marginBottom":"16px"}}>
              <div className="input-group mb-0">
                <label>Description</label>
                <div id="descChecks" style={{"maxHeight":"120px","overflowY":"auto","border":"1px solid var(--border)","borderRadius":"var(--radius-sm)","padding":"8px","background":"var(--bg-color)"}}></div>
              </div>
              <div className="input-group mb-0"><label>Quantity</label><div className="input-field"><select id="mapQty"></select></div></div>
              <div className="input-group mb-0"><label>Unit Price</label><div className="input-field"><select id="mapPrice"></select></div></div>
              <div className="input-group mb-0"><label>Total CBM (for line)</label><div className="input-field"><select id="mapCbm"></select></div></div>
            </div>

            <div className="table-container mb-4">
              <table id="mappingPreviewTable"></table>
            </div>

            <div className="flex items-center gap-3">
              <button className="btn-primary" id="confirmImportBtn">Import Rows</button>
              <button className="btn-secondary" id="cancelImportBtn">Cancel</button>
              <span id="mappingNote" className="text-sm text-muted mono ml-auto" style={{"marginLeft":"auto"}}></span>
            </div>
          </div>

          {/*  AI EXTRACTION REVIEW PANEL  */}
          <div id="aiReviewPanel" className="hidden mt-4" style={{"border":"1px solid var(--border-strong)","borderRadius":"var(--radius)","padding":"20px","background":"var(--surface)"}}>
            <h3 style={{"fontSize":"16px","fontWeight":"600","marginBottom":"4px"}}>Review AI Extracted Items</h3>
            <p className="text-sm text-muted mb-4" id="aiReviewNote"></p>
            <div id="aiReviewWarnings" className="hidden mb-4" style={{"background":"#fffbeb","border":"1px solid #fde68a","borderRadius":"var(--radius-sm)","padding":"10px 14px","color":"#92400e","fontSize":"12.5px","fontWeight":"600","lineHeight":"1.5"}}></div>
            <div className="table-container mb-4">
              <table id="aiReviewTable">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th className="num" style={{"width":"110px"}}>Qty</th>
                    <th className="num" style={{"width":"130px"}}>Unit Price</th>
                    <th className="num" style={{"width":"120px"}}>Total CBM</th>
                  </tr>
                </thead>
                <tbody id="aiReviewBody"></tbody>
              </table>
            </div>
            <div className="flex items-center gap-3">
              <button className="btn-primary" id="aiConfirmImportBtn">Import Items</button>
              <button className="btn-secondary" id="aiCancelImportBtn">Cancel</button>
            </div>
          </div>
        </div>

        <div className="tab-content" id="tab-paste">
          <textarea id="pasteBox" placeholder="Paste rows from Excel here...
Headlight  50  38.5  1.2"></textarea>
          <div className="flex items-center justify-between mt-2">
            <label className="flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" id="hasHeader" defaultChecked /> First line is a header
            </label>
            <button className="btn-primary" id="parseBtn">Add rows from paste</button>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <div style={{"fontWeight":"600","fontSize":"14px"}}>Items (<span id="itemCount">0</span>)</div>
            <div className="flex gap-2">
              <button className="btn-secondary btn-icon" id="undoClearBtn" title="Undo Clear" style={{"display":"none"}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7v6h6" /><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" /></svg>
              </button>
              <button className="btn-danger" id="clearItemsBtn" style={{"padding":"4px 8px","fontSize":"12px"}}>Clear All</button>
            </div>
          </div>
          <div className="table-container" id="itemsTableWrap">
            <table id="itemsTable">
              <thead>
                <tr>
                  <th style={{"width":"40px"}}>#</th>
                  <th>Description</th>
                  <th className="num" style={{"width":"100px"}}>Qty</th>
                  <th className="num" style={{"width":"140px"}}>Unit Price</th>
                  <th className="num" style={{"width":"120px"}} id="thMeasure">Total CBM</th>
                  <th className="num" style={{"width":"140px"}}>Value Total</th>
                  <th style={{"width":"40px"}}></th>
                </tr>
              </thead>
              <tbody id="itemsBody"></tbody>
            </table>
          </div>
          <div id="itemsEmpty" className="text-center text-muted" style={{"padding":"32px 16px","background":"var(--bg-color)","border":"1px dashed var(--border-strong)","borderRadius":"var(--radius)","marginTop":"8px"}}>
            <div style={{"fontSize":"22px","marginBottom":"6px"}}>📦</div>
            <div style={{"fontWeight":"600","fontSize":"13.5px","color":"var(--ink)","marginBottom":"2px"}}>No items added yet</div>
            <div style={{"fontSize":"12px","color":"var(--ink-soft)","maxWidth":"320px","margin":"0 auto 12px"}}>Drop your packing list Excel above, paste rows, or add manually.</div>
            <button className="btn-secondary" id="addRowBtnEmpty" style={{"fontSize":"12px","padding":"6px 14px"}}>+ Add Item Manually</button>
          </div>
          <button className="btn-ghost mt-2" id="addRowBtn">+ Add Item Manually</button>
        </div>
      </div>
    </section>

    {/*  WIZARD STEP 2  */}
    <section className="step-section" id="step2">
      <div className="step-header">
        <div className="step-num">2</div>
        <h2 className="step-title">Exchange &amp; Freight Rate</h2>
      </div>
      <div className="card">
        <div className="rate-grid">
          
          <div className="rate-card">
            <div className="rate-card-title">💱 Base Currency</div>
            <div className="input-field" style={{"margin":"0"}}>
              <select id="baseCurrency">
                <option value="RMB">RMB (¥) Chinese Yuan</option>
                <option value="USD">USD ($) US Dollar</option>
                <option value="EUR">EUR (€) Euro</option>
                <option value="GBP">GBP (£) British Pound</option>
                <option value="INR">INR (₹) Indian Rupee</option>
                <option value="AED">AED (د.إ) UAE Dirham</option>
                <option value="JPY">JPY (¥) Japanese Yen</option>
                <option value="AUD">AUD ($) Australian Dollar</option>
                <option value="CAD">CAD ($) Canadian Dollar</option>
                <option value="SGD">SGD ($) Singapore Dollar</option>
                <option value="CHF">CHF (Fr) Swiss Franc</option>
                <option value="HKD">HKD ($) Hong Kong Dollar</option>
                <option value="MYR">MYR (RM) Malaysian Ringgit</option>
                <option value="THB">THB (฿) Thai Baht</option>
              </select>
            </div>
          </div>

          <div className="rate-card">
            <div className="rate-card-title">📈 Exchange Rate to LKR</div>
            <div className="input-field" style={{"margin":"0"}}>
              <span className="input-prefix" id="ratePrefix">¥1 = </span>
              <input type="number" id="exRate" step="0.01" placeholder="e.g. 42.50" className="mono" />
              <span className="input-suffix">LKR</span>
            </div>
          </div>

          <div className="rate-card">
            <div className="rate-card-title">🚢 Transport Mode</div>
            <div className="input-field" style={{"margin":"0"}}>
              <select id="cargoMode">
                <option value="sea">Sea Cargo (by CBM)</option>
                <option value="air">Air Cargo (by Kg)</option>
              </select>
            </div>
          </div>

          <div className="rate-card">
            <div className="rate-card-title">🚢 Ocean Freight Rate</div>
            <div style={{"display":"flex","gap":"6px","alignItems":"center"}}>
              <div className="input-field" style={{"margin":"0","flex":"1"}}>
                <span className="input-prefix" id="cbmPrefix">LKR</span>
                <input type="number" id="cbmRate" step="any" placeholder="100000" className="mono" />
                <span className="input-suffix" id="cbmSuffix">/ CBM</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>

    {/*  WIZARD STEP 3  */}
    <section className="step-section" id="step3">
      <div className="step-header" style={{"display":"flex","justifyContent":"space-between","alignItems":"center","marginBottom":"12px"}}>
        <div style={{"display":"flex","alignItems":"center","gap":"12px"}}>
          <div className="step-num">3</div>
          <h2 className="step-title" style={{"margin":"0"}}>Other Charges</h2>
        </div>
        <div style={{"display":"flex","gap":"8px"}}>
          <button className="btn-secondary btn-sm" id="applySlTaxBundleBtn" style={{"fontSize":"11.5px","padding":"6px 12px","display":"inline-flex","alignItems":"center","gap":"5px","cursor":"pointer"}}>
            🇱🇰 Apply SL Tax Bundle
          </button>
          <button className="btn-primary btn-sm" id="addFeeBtn" style={{"fontSize":"11.5px","padding":"6px 12px","display":"inline-flex","alignItems":"center","gap":"5px","cursor":"pointer"}}>
            + Add Charge
          </button>
        </div>
      </div>
      <div className="card">
        <div className="fee-header">
          <div>Charge Name</div>
          <div>Type</div>
          <div>Amount</div>
          <div>Spread By</div>
          <div style={{"textAlign":"right"}}>Action</div>
        </div>
        <div id="feesBody"></div>
        <div id="feeSuggestionsWrap" style={{"marginTop":"16px","paddingTop":"14px","borderTop":"1px dashed var(--border)"}}>
          <div style={{"fontSize":"11.5px","fontWeight":"700","color":"var(--ink-soft)","textTransform":"uppercase","letterSpacing":"0.05em","marginBottom":"8px"}}>
            💡 Quick Add Import Charges
          </div>
          <div className="preset-chips" id="presetChipsContainer"></div>
        </div>
      </div>
    </section>

    {/*  WIZARD STEP 4  */}
    <section className="step-section" id="step4">
      <div id="step2AlertBanner" className="hidden" style={{"marginBottom":"16px","padding":"12px 16px","background":"#fffbeb","border":"1px solid #fde68a","borderRadius":"var(--radius)","color":"#92400e","fontSize":"13px","fontWeight":"600","display":"flex","alignItems":"center","gap":"8px"}}>
        <span>⚠️ Step 2 incomplete: Please enter an Exchange Rate (e.g. 45.00) to calculate Landed Costs.</span>
      </div>
      <div className="step-header">
        <div className="step-num" style={{"background":"var(--success)"}}>4</div>
        <h2 className="step-title">Landed Cost Results</h2>
        <div style={{"marginLeft":"auto","display":"flex","alignItems":"center","gap":"12px"}}>
          <label style={{"fontSize":"12px","fontWeight":"600","color":"var(--ink-soft)","textTransform":"uppercase"}}>Markup Target</label>
          <div className="input-field" style={{"width":"100px"}}>
            <input type="number" id="markupPercent" value="30" className="mono text-right" style={{"padding":"6px"}} />
            <span className="input-suffix">%</span>
          </div>
        </div>
      </div>
      
      <div className="summary-grid">
        <div className="summary-card">
          <div className="summary-label"><span>📦 Total Volume</span></div>
          <div className="summary-value"><span id="sumCbm">0.00</span> <span className="summary-unit" id="sumMeasureUnit">CBM</span></div>
        </div>
        <div className="summary-card">
          <div className="summary-label"><span>🏷️ Goods Value</span></div>
          <div className="summary-value"><span className="summary-currency">LKR</span> <span id="sumValue">0</span></div>
        </div>
        <div className="summary-card">
          <div className="summary-label"><span>⚓ Freight &amp; Fees</span></div>
          <div className="summary-value"><span className="summary-currency">LKR</span> <span id="sumFees">0</span></div>
        </div>
        <div className="summary-card highlight">
          <div className="summary-label"><span>💎 Total Landed Cost</span></div>
          <div className="summary-value"><span className="summary-currency">LKR</span> <span id="sumTotal">0</span></div>
        </div>
      </div>

      <div className="card" style={{"padding":"0","overflow":"hidden"}}>
        {/*  Mobile View Toggle (Visible only on mobile screens)  */}
        <div className="results-view-toggle-bar" id="resultsViewToggleBar">
          <div className="results-view-toggle">
            <button type="button" className="btn-toggle-view active" id="btnViewCards" title="Card View">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /></svg>
              <span>Card View</span>
            </button>
            <button type="button" className="btn-toggle-view" id="btnViewTable" title="Table View">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
              <span>Table</span>
            </button>
          </div>
          <span className="results-mobile-hint">⚡ Full visibility</span>
        </div>

        {/*  Adaptive Mobile Cards View (God Mode for Mobile)  */}
        <div className="results-mobile-cards" id="resultsMobileCards"></div>

        {/*  Desktop & Scrollable Table View  */}
        <div className="table-container" id="resultsTableContainer" style={{"border":"none","borderRadius":"0"}}>
          <table id="resultsTable">
            <thead style={{"background":"var(--primary)","color":"#fff"}}>
              <tr>
                <th style={{"color":"rgba(255,255,255,0.8)","background":"var(--primary)"}}>Description</th>
                <th className="num" style={{"color":"rgba(255,255,255,0.8)","background":"var(--primary)"}}>Qty</th>
                <th className="num" style={{"color":"rgba(255,255,255,0.8)","background":"var(--primary)"}}>Value (LKR)</th>
                <th className="num" style={{"color":"rgba(255,255,255,0.8)","background":"var(--primary)"}}>Freight (LKR)</th>
                <th className="num" style={{"color":"rgba(255,255,255,0.8)","background":"var(--primary)"}}>Charges (LKR)</th>
                <th className="num" style={{"color":"#fff","background":"var(--primary)"}}>Unit Cost (LKR)</th>
                <th className="num" style={{"color":"var(--success-light)","background":"var(--primary)"}}>Selling Price (LKR)</th>
              </tr>
            </thead>
            <tbody id="resultsBody"></tbody>
            <tfoot id="resultsFoot" style={{"background":"var(--bg-color)","fontFamily":"'IBM Plex Mono',monospace","fontWeight":"700"}}>
              <tr>
                <td style={{"fontFamily":"'Inter',sans-serif","textTransform":"uppercase","fontSize":"11px","color":"var(--ink-soft)"}}>Totals</td>
                <td className="num" id="footQty">0</td>
                <td className="num" id="footValue">0</td>
                <td className="num" id="footFreight">0</td>
                <td className="num" id="footCharges">0</td>
                <td className="num"></td>
                <td className="num" id="footSellingPrice">0</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div id="costBarSection" style={{"padding":"20px","background":"var(--bg-color)","borderTop":"1px solid var(--border)"}}>
          <div className="cost-legend">
            <div className="legend-item"><div className="legend-dot seg-goods"></div>Goods Value</div>
            <div className="legend-item"><div className="legend-dot seg-freight"></div>Freight</div>
            <div className="legend-item"><div className="legend-dot seg-fees"></div>Other Charges</div>
          </div>
          <div className="cost-bar-wrap" id="costCompositionBar">
            <div className="cost-bar-segment seg-goods" id="barGoods" style={{"width":"0%"}}></div>
            <div className="cost-bar-segment seg-freight" id="barFreight" style={{"width":"0%"}}></div>
            <div className="cost-bar-segment seg-fees" id="barFees" style={{"width":"0%"}}></div>
          </div>
        </div>
      </div>
      <div className="flex justify-between mt-4">
        <span className="text-sm text-muted mono" id="saveStatus">Auto-saved</span>
        <button className="btn-secondary" id="copyTableBtn">Copy to Clipboard (TSV)</button>
      </div>
    </section>
  </main>
</div>

<div className="toast-container" id="toastContainer"></div>


{/*  PRO ACCESS SECURITY GATE & LOGIN MODAL  */}
<div id="proAccessGate" style={{"display":"none","position":"fixed","inset":"0","background":"rgba(15, 23, 42, 0.75)","backdropFilter":"blur(10px)","WebkitBackdropFilter":"blur(10px)","zIndex":"99999","alignItems":"center","justifyContent":"center","padding":"20px"}}>
  <div style={{"background":"#FFFFFF","borderRadius":"16px","width":"100%","maxWidth":"480px","padding":"32px 28px","boxShadow":"0 25px 50px -12px rgba(0,0,0,0.25)","textAlign":"center","border":"1px solid #E2E8F0","fontFamily":"'Inter', sans-serif"}}>
    <div style={{"width":"56px","height":"56px","borderRadius":"50%","background":"#FEF2F2","color":"#E04D2D","display":"flex","alignItems":"center","justifyContent":"center","fontSize":"26px","margin":"0 auto 16px"}}>
      🔒
    </div>
    <h3 style={{"fontSize":"20px","fontWeight":"800","color":"#0F172A","marginBottom":"8px","letterSpacing":"-0.02em"}}>Pro License Required</h3>
    <p style={{"fontSize":"14px","color":"#64748B","lineHeight":"1.55","marginBottom":"24px"}}>
      The Pro Global Calculator (14 Currencies, Air/Sea Cargo, and PDF/WhatsApp Manifests) is reserved for verified license holders ($9 one-time).
    </p>
    <div style={{"display":"flex","flexDirection":"column","gap":"10px","marginBottom":"20px"}}>
      <a href="https://built-by-aadil.lemonsqueezy.com/checkout/buy/b789412f-3a44-4c06-a3f6-4dc36eb391d8?logo=0" style={{"background":"#E04D2D","color":"#FFFFFF","textDecoration":"none","padding":"13px 20px","borderRadius":"8px","fontWeight":"700","fontSize":"14.5px","display":"flex","alignItems":"center","justifyContent":"center","gap":"8px","boxShadow":"0 4px 12px rgba(224, 77, 45, 0.25)"}}>
        <span>💳 Get Pro Lifetime License ($9)</span>
      </a>
      <a href="/" style={{"background":"#F1F5F9","color":"#334155","textDecoration":"none","padding":"11px 20px","borderRadius":"8px","fontWeight":"600","fontSize":"13.5px","border":"1px solid #CBD5E1"}}>
        <span>← Return to Home</span>
      </a>
    </div>
    <div style={{"paddingTop":"14px","borderTop":"1px dashed #E2E8F0","fontSize":"12.5px","color":"#64748B"}}>
      Already paid? <a href="javascript:void(0)" id="verifyBuyerEmailLink" style={{"color":"#0F172A","fontWeight":"700","textDecoration":"underline","cursor":"pointer"}}>Verify with your checkout email</a>
    </div>
  </div>
</div>

<Script id="pro-gate-script" strategy="afterInteractive">
{`
(function() {
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('order_id') || urlParams.get('checkout_id') || urlParams.get('license');
  const userParam = urlParams.get('user') || urlParams.get('email');

  if (orderId || userParam) {
    localStorage.setItem('landed_cost_pro_license', 'active');
    localStorage.setItem('landed_cost_pro_order', orderId || userParam || 'verified');
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  const hasAccess = localStorage.getItem('landed_cost_pro_license') === 'active';
  const gate = document.getElementById('proAccessGate');

  if (!hasAccess && gate) {
    gate.style.display = 'flex';
  }

  window.verifyBuyerEmail = async function() {
    const email = prompt("Enter the email address you used on Lemon Squeezy:");
    if (!email || !email.trim()) return;

    try {
      const res = await fetch('/api/verify?email=' + encodeURIComponent(email.trim()));
      const data = await res.json();
      if (res.ok && data.is_pro) {
        localStorage.setItem('landed_cost_pro_license', 'active');
        localStorage.setItem('landed_cost_pro_order', data.order_id || 'verified');
        localStorage.setItem('landed_cost_user_email', email.trim());
        const gate = document.getElementById('proAccessGate');
        if (gate) gate.style.display = 'none';
        alert("✓ Pro License Verified! Welcome to TrueLanded Pro.");
      } else {
        alert("No Pro license found for " + email.trim() + ". Please complete checkout first, then verify again.");
      }
    } catch (e) {
      alert("Could not verify license right now. Check your connection and try again.");
    }
  };

  const verifyLink = document.getElementById('verifyBuyerEmailLink');
  if (verifyLink) {
    verifyLink.onclick = (e) => {
      e.preventDefault();
      window.verifyBuyerEmail();
    };
  }
})();
`}
</Script>





    </>
  );
}
