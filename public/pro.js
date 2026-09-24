(function(){
  // ==== STATE MANAGEMENT ====
  let state = {
    history: {}, // id -> shipment data
    currentId: null,
    apiKey: localStorage.getItem('landed-cost-anthropic-key') || ''
  };

  const DEFAULT_SHIPMENT = (name = 'Global Shipment 1') => ({
    name: name,
    cargoMode: 'sea',
    route: { origin: 'DUBAI / GLOBAL', port: 'COLOMBO', dest: 'DESTINATION' },
    baseCurrency: 'USD', // Global default
    exRate: 305.00, // Standard exchange rate default
    freightCurrency: 'LKR',
    cbmRate: 100000,
    usdToLkr: 305.00,
    items: [],
    fees: [
      { id: 'fe1', name: 'Customs Duty', type: 'percent', amount: 15, method: 'cbm', base: 'cif' },
      { id: 'fe2', name: 'PAL (Port & Airport Levy)', type: 'percent', amount: 10, method: 'cbm', base: 'cif' },
      { id: 'fe3', name: 'VAT', type: 'percent', amount: 18, method: 'cbm', base: 'running' },
      { id: 'fe4', name: 'Transport cost', type: 'flat', amount: 100000, method: 'cbm', base: 'cif' },
      { id: 'fe5', name: 'Clearing Agent', type: 'flat', amount: 15000, method: 'value', base: 'cif' }
    ],
    itemSeq: 1,
    feeSeq: 6,
    lastSaved: Date.now()
  });

  let current = null;
  let undoStack = []; // For items clear undo

  // ==== UTILITIES ====
  const fmt = n => isFinite(n) ? Math.round(n).toLocaleString('en-US') : '0';
  const fmt2 = n => isFinite(n) ? Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';
  const fmtCbm = n => isFinite(n) ? Number(n).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) : '0.000';
  const escapeAttr = s => String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
  const escapeHtml = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  
  function generateId() { return Math.random().toString(36).substr(2, 9); }

  // ==== TOASTS & ANIMATIONS ====
  function showToast(msg, type='success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = type === 'success' ? '✓ ' + escapeHtml(msg) : '⚠ ' + escapeHtml(msg);
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('hiding');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  function animateNumber(element, start, end, duration = 400, isFloat = false) {
    if (start === end) {
      element.textContent = isFloat ? fmt2(end) : fmt(end);
      return;
    }
    const startTime = performance.now();
    element.classList.add('changed');
    
    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // easeOutQuart
      const ease = 1 - Math.pow(1 - progress, 4);
      const currentVal = start + (end - start) * ease;
      
      element.textContent = isFloat ? fmt2(currentVal) : fmt(currentVal);
      
      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        setTimeout(() => element.classList.remove('changed'), 200);
      }
    }
    requestAnimationFrame(update);
  }

  // ==== STORAGE & HISTORY ====
  function loadState() {
    try {
      const saved = localStorage.getItem('landed-cost-pro-v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        state.history = parsed.history || {};
        state.currentId = parsed.currentId;
      }
    } catch (e) { console.error("Could not load state", e); }

    if (!state.currentId || !state.history[state.currentId]) {
      const id = generateId();
      state.currentId = id;
      state.history[id] = DEFAULT_SHIPMENT('Guangzhou Cargo');
    }
    current = state.history[state.currentId];
    renderHistory();
    populateUI();
  }

  function saveState() {
    if (!current) return;
    current.lastSaved = Date.now();
    current.name = document.getElementById('shipmentName').value || 'Unnamed Shipment';
    current.route.origin = document.getElementById('routeOrigin').value;
    current.route.port = document.getElementById('routePort').value;
    current.route.dest = document.getElementById('routeDest').value;
    current.cargoMode = document.getElementById('cargoMode')?.value || 'sea';
    current.baseCurrency = document.getElementById('baseCurrency').value;
    current.exRate = parseFloat(document.getElementById('exRate').value) || 0;
    current.freightCurrency = document.getElementById('freightCurrency')?.value || 'LKR';
    current.cbmRate = parseFloat(document.getElementById('cbmRate').value) || 0;
    
    state.history[state.currentId] = current;
    try {
      localStorage.setItem('landed-cost-pro-v1', JSON.stringify({ history: state.history, currentId: state.currentId }));
      const status = document.getElementById('saveStatus');
      status.textContent = `Auto-saved at ${new Date().toLocaleTimeString()}`;
    } catch (e) {}
    renderHistory();
  }

  const debouncedSave = (() => {
    let timer;
    return () => { clearTimeout(timer); timer = setTimeout(saveState, 500); };
  })();

  function switchShipment(id) {
    saveState();
    state.currentId = id;
    current = state.history[id];
    populateUI();
  }

  function newShipment() {
    saveState();
    const existingNames = Object.values(state.history).map(s => s.name || '');
    let num = 2;
    while (existingNames.some(n => n.toLowerCase() === `shipment ${num}`.toLowerCase())) {
      num++;
    }
    const name = `Shipment ${num}`;
    const id = generateId();
    state.currentId = id;
    state.history[id] = DEFAULT_SHIPMENT(name);
    current = state.history[id];
    populateUI();
    saveState();
    showToast(`${name} created`);
  }

  function deleteShipment(id, e) {
    if (e) e.stopPropagation();
    
    const remainingIds = Object.keys(state.history).filter(k => k !== id);
    if (remainingIds.length === 0) return; // Prevent deleting the last shipment
    
    delete state.history[id];
    
    if (state.currentId === id) {
      remainingIds.sort((a,b) => (state.history[b].lastSaved || 0) - (state.history[a].lastSaved || 0));
      state.currentId = remainingIds[0];
    }
    
    current = state.history[state.currentId];
    saveState();
    populateUI();
    showToast("Shipment removed");
  }

  function renderHistory() {
    const list = document.getElementById('historyList');
    list.innerHTML = '';
    const sortedIds = Object.keys(state.history).sort((a,b) => (state.history[b].lastSaved || 0) - (state.history[a].lastSaved || 0));
    const canDelete = sortedIds.length > 1;
    
    sortedIds.forEach(id => {
      const ship = state.history[id];
      const div = document.createElement('div');
      div.className = `history-item ${id === state.currentId ? 'active' : ''}`;
      const totalItems = (ship.items || []).length;
      const dateStr = new Date(ship.lastSaved || Date.now()).toLocaleDateString('en-US', {month:'short', day:'numeric'});
      
      div.innerHTML = `
        <div class="history-item-info">
          <div class="history-name">${escapeHtml(ship.name || 'Untitled Shipment')}</div>
          <div class="history-meta">${totalItems} items · ${dateStr}</div>
        </div>
        ${canDelete ? `
        <button class="btn-ghost history-delete-btn" data-delete-id="${id}" title="Delete shipment">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>` : ''}
      `;
      div.onclick = (e) => {
        if (e.target.closest('[data-delete-id]')) return;
        if (id !== state.currentId) switchShipment(id);
      };
      
      const delBtn = div.querySelector('[data-delete-id]');
      if (delBtn) {
        delBtn.onclick = (e) => deleteShipment(id, e);
      }
      
      list.appendChild(div);
    });
  }

  // ==== UI POPULATION ====
  function populateUI() {
    document.getElementById('shipmentName').value = current.name || '';
    document.getElementById('routeOrigin').value = current.route.origin || '';
    document.getElementById('routePort').value = current.route.port || '';
    document.getElementById('routeDest').value = current.route.dest || '';
    document.getElementById('cargoMode').value = current.cargoMode || 'sea';
    document.getElementById('baseCurrency').value = current.baseCurrency || 'RMB';
    document.getElementById('exRate').value = current.exRate !== undefined ? current.exRate : 45.00;
    document.getElementById('cbmRate').value = current.cbmRate !== undefined ? current.cbmRate : 100000;
    if (document.getElementById('freightCurrency')) {
      document.getElementById('freightCurrency').value = current.freightCurrency || 'LKR';
    }
    
    updateCurrencyLabels();
    renderItems();
    renderFees();
  }

  function getCurrencySymbol(code) {
    const symbols = {
      USD: '$', RMB: '¥', EUR: '€', GBP: '£', INR: '₹', 
      AED: 'د.إ', JPY: '¥', AUD: '$', CAD: '$', SGD: '$', 
      CHF: 'Fr', HKD: '$', MYR: 'RM', THB: '฿'
    };
    return symbols[code] || code;
  }

  const COUNTRY_FLAGS = {
    USD: '🇺🇸 US', RMB: '🇨🇳 CN', AED: '🇦🇪 AE', INR: '🇮🇳 IN',
    EUR: '🇪🇺 EU', GBP: '🇬🇧 UK', JPY: '🇯🇵 JP', AUD: '🇦🇺 AU',
    CAD: '🇨🇦 CA', SGD: '🇸🇬 SG', CHF: '🇨🇭 CH', HKD: '🇭🇰 HK',
    MYR: '🇲🇾 MY', THB: '🇹🇭 TH'
  };

  function updateCurrencyLabels() {
    const curr = document.getElementById('baseCurrency').value;
    const sym = getCurrencySymbol(curr);
    document.getElementById('ratePrefix').textContent = `${sym}1 = `;

    const cargoMode = document.getElementById('cargoMode')?.value || 'sea';
    const measureName = cargoMode === 'air' ? 'Kg' : 'CBM';

    // Update dynamic Route Ribbon Origin Flag & Transit Badge
    const originFlag = document.getElementById('originFlag');
    if (originFlag) originFlag.textContent = COUNTRY_FLAGS[curr] || '🌐 GLOBAL';

    const routeTransitBadge = document.getElementById('routeTransitBadge');
    if (routeTransitBadge) {
      routeTransitBadge.textContent = cargoMode === 'air' ? '✈️ AIR CARGO' : '🚢 SEA CARGO';
    }

    const thMeasure = document.getElementById('thMeasure');
    if (thMeasure) thMeasure.textContent = `Total ${measureName}`;
    const sumMeasureUnit = document.getElementById('sumMeasureUnit');
    if (sumMeasureUnit) sumMeasureUnit.textContent = measureName;

    // Freight Currency prefix and note
    const fCurr = document.getElementById('freightCurrency')?.value || 'LKR';
    const cbmPrefix = document.getElementById('cbmPrefix');
    const freightUsdNote = document.getElementById('freightUsdNote');
    if (cbmPrefix) {
       cbmPrefix.textContent = fCurr === 'USD' ? '$' : 'LKR';
    }
    const cbmSuffix = document.getElementById('cbmSuffix');
    if (cbmSuffix) {
       cbmSuffix.textContent = `/ ${measureName}`;
    }
    if (freightUsdNote) {
      if (fCurr === 'USD') {
        const rate = curr === 'USD' ? (parseFloat(document.getElementById('exRate').value) || 305) : (current.usdToLkr || 305);
        freightUsdNote.textContent = `Converted at $1 = ${rate} LKR`;
        freightUsdNote.classList.remove('hidden');
      } else {
        freightUsdNote.classList.add('hidden');
      }
    }

    // Update table headers
    const ths = document.querySelectorAll('#itemsTable th');
    if(ths.length > 5) ths[3].textContent = `Unit Price (${curr})`;
    if(ths.length > 5) ths[5].textContent = `Value (${curr})`;
  }

  document.getElementById('baseCurrency').onchange = (e) => {
    current.baseCurrency = e.target.value;
    if (current.baseCurrency === 'USD' && (!current.exRate || current.exRate === 45)) {
      current.exRate = 305.00;
      document.getElementById('exRate').value = 305.00;
    } else if (current.baseCurrency === 'RMB' && current.exRate === 305) {
      current.exRate = 45.00;
      document.getElementById('exRate').value = 45.00;
    }
    updateCurrencyLabels();
    calculate();
    debouncedSave();
  };

  const freightCurrEl = document.getElementById('freightCurrency');
  if (freightCurrEl) {
    freightCurrEl.onchange = (e) => {
      current.freightCurrency = e.target.value;
      if (current.freightCurrency === 'USD' && (!current.cbmRate || current.cbmRate === 35000)) {
        current.cbmRate = 115;
        document.getElementById('cbmRate').value = 115;
      } else if (current.freightCurrency === 'LKR' && current.cbmRate === 115) {
        current.cbmRate = 35000;
        document.getElementById('cbmRate').value = 35000;
      }
      updateCurrencyLabels();
      calculate();
      debouncedSave();
    };
  }

  

  const cargoModeEl = document.getElementById('cargoMode');
  if (cargoModeEl) {
    cargoModeEl.onchange = (e) => {
      const oldMode = current.cargoMode || 'sea';
      current.cargoMode = e.target.value;
      const cbmRateInput = document.getElementById('cbmRate');
      const rate = parseFloat(cbmRateInput.value);
      if (oldMode === 'sea' && current.cargoMode === 'air' && (isNaN(rate) || rate === 35000)) {
         current.cbmRate = 3400;
         cbmRateInput.value = 3400;
      } else if (oldMode === 'air' && current.cargoMode === 'sea' && (isNaN(rate) || rate === 3400)) {
         current.cbmRate = 35000;
         cbmRateInput.value = 35000;
      }
      updateCurrencyLabels();
      calculate();
      debouncedSave();
    };
  }

  ['shipmentName', 'routeOrigin', 'routePort', 'routeDest', 'exRate', 'cbmRate'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => { 
      updateCurrencyLabels();
      calculate(); 
      debouncedSave(); 
    });
  });

  document.getElementById('newShipmentBtn').onclick = newShipment;

  // ==== ITEMS MANAGEMENT ====
  function renderItems() {
    const body = document.getElementById('itemsBody');
    const tableWrap = document.getElementById('itemsTableWrap');
    const empty = document.getElementById('itemsEmpty');
    body.innerHTML = '';
    
    document.getElementById('itemCount').textContent = current.items.length;
    if (current.items.length === 0) {
      if (tableWrap) tableWrap.style.display = 'none';
      if (empty) empty.style.display = 'block';
    } else {
      if (tableWrap) tableWrap.style.display = 'block';
      if (empty) empty.style.display = 'none';
    }
    
    current.items.forEach((it, idx) => {
      const tr = document.createElement('tr');
      const val = it.qty * it.price;
      const sym = getCurrencySymbol(current.baseCurrency);
      
      tr.innerHTML = `
        <td class="text-muted text-sm">${idx+1}</td>
        <td><input type="text" class="inline-input" data-field="desc" data-id="${it.id}" value="${escapeAttr(it.desc)}" placeholder="Item description"></td>
        <td class="num"><input type="number" class="inline-input mono num" data-field="qty" data-id="${it.id}" value="${it.qty}" min="0" step="1"></td>
        <td class="num"><input type="number" class="inline-input mono num" data-field="price" data-id="${it.id}" value="${it.price}" min="0" step="0.01"></td>
        <td class="num"><input type="number" class="inline-input mono num" data-field="cbm" data-id="${it.id}" value="${it.cbm}" min="0" step="0.001"></td>
        <td class="num text-muted mono line-val">${sym}${fmt2(val)}</td>
        <td class="text-right">
          <button class="btn-ghost btn-icon" data-remove-item="${it.id}" title="Remove">✕</button>
        </td>
      `;
      body.appendChild(tr);
    });
    
    bindItemInputs();
    calculate();
  }

  function bindItemInputs() {
    document.querySelectorAll('#itemsBody input').forEach(inp => {
      inp.oninput = (e) => {
        const id = e.target.getAttribute('data-id');
        const field = e.target.getAttribute('data-field');
        const it = current.items.find(i => i.id === id);
        if (!it) return;
        
        if (field === 'desc') it.desc = e.target.value;
        else it[field] = parseFloat(e.target.value) || 0;
        
        const row = e.target.closest('tr');
        const valCell = row.querySelector('.line-val');
        const sym = getCurrencySymbol(current.baseCurrency);
        if (valCell) valCell.textContent = sym + fmt2(it.qty * it.price);
        
        calculate();
        debouncedSave();
      };
    });

    document.querySelectorAll('[data-remove-item]').forEach(btn => {
      btn.onclick = (e) => {
        const id = e.target.getAttribute('data-remove-item');
        current.items = current.items.filter(i => i.id !== id);
        renderItems();
        debouncedSave();
      };
    });
  }

  const handleAddRow = () => {
    current.items.push({ id: 'it'+(current.itemSeq++), desc: '', qty: 0, price: 0, cbm: 0 });
    renderItems();
    debouncedSave();
  };

  document.getElementById('addRowBtn').onclick = handleAddRow;
  const emptyAddBtn = document.getElementById('addRowBtnEmpty');
  if (emptyAddBtn) emptyAddBtn.onclick = handleAddRow;

  document.getElementById('clearItemsBtn').onclick = () => {
    if (!current.items.length) return;
    undoStack = [...current.items]; // save for undo
    current.items = [];
    renderItems();
    debouncedSave();
    showToast("Items cleared");
    const undoBtn = document.getElementById('undoClearBtn');
    undoBtn.style.display = 'inline-flex';
    setTimeout(() => { undoBtn.style.display = 'none'; }, 10000); // hide after 10s
  };

  document.getElementById('undoClearBtn').onclick = () => {
    if (undoStack.length) {
      current.items = [...undoStack];
      undoStack = [];
      document.getElementById('undoClearBtn').style.display = 'none';
      renderItems();
      debouncedSave();
      showToast("Items restored");
    }
  };

  // ==== STEP 3: OTHER CHARGES ====
  const COMMON_PRESETS = [
    { key: 'vat', name: 'VAT (18%)', check: 'vat', make: () => newFee('VAT (18%)', 'percent', 18, 'cbm', 'running') },
    { key: 'pal', name: 'PAL / Port Levy (10%)', check: 'pal', make: () => newFee('PAL (Port & Airport Levy 10%)', 'percent', 10, 'cbm', 'cif') },
    { key: 'duty', name: 'Customs Duty (15%)', check: 'duty', make: () => newFee('Customs Duty (15%)', 'percent', 15, 'cbm', 'cif') },
    { key: 'transport', name: 'Transport cost (100k)', check: 'transport', make: () => newFee('Transport cost', 'flat', 100000, 'cbm', 'cif') },
    { key: 'agent', name: 'Clearing Agent (15k)', check: 'agent', make: () => newFee('Clearing Agent Fee', 'flat', 15000, 'value', 'cif') },
    { key: 'insurance', name: 'Marine Insurance (1%)', check: 'insurance', make: () => newFee('Marine Insurance (1%)', 'percent', 1, 'cbm', 'cif') },
    { key: 'demurrage', name: 'Port Demurrage (10k)', check: 'demurrage', make: () => newFee('Port Demurrage & Storage', 'flat', 10000, 'cbm', 'cif') }
  ];

  function renderPresetChips() {
    const container = document.getElementById('presetChipsContainer');
    const wrap = document.getElementById('feeSuggestionsWrap');
    if (!container || !wrap) return;

    const existingNames = (current?.fees || []).map(f => (f.name || '').toLowerCase());
    const isFeePresent = (p) => {
      return existingNames.some(n => {
        if (p.check === 'duty') return n.includes('duty') || n.includes('customs');
        if (p.check === 'agent') return n.includes('agent') || n.includes('clearing') || n.includes('wharf');
        if (p.check === 'transport') return n.includes('transport') || n.includes('delivery') || n.includes('freight local');
        return n.includes(p.check);
      });
    };

    const available = COMMON_PRESETS.filter(p => !isFeePresent(p));

    if (available.length === 0) {
      wrap.classList.add('hidden');
      return;
    }

    wrap.classList.remove('hidden');
    container.innerHTML = '';
    available.forEach(p => {
      const chip = document.createElement('button');
      chip.className = 'preset-chip';
      chip.textContent = `+ ${p.name}`;
      chip.onclick = () => {
        current.fees.push(p.make());
        renderFees();
        debouncedSave();
        showToast(`Added ${p.name}`);
      };
      container.appendChild(chip);
    });
  }

  function renderFees() {
    const body = document.getElementById('feesBody');
    body.innerHTML = '';
    
    if (!current || !current.fees || current.fees.length === 0) {
      body.innerHTML = `
        <div style="text-align:center; padding:24px 12px; color:var(--ink-soft); font-size:13px;">
          No additional charges added. Freight and base goods cost will be calculated directly.
        </div>
      `;
      renderPresetChips();
      calculate();
      return;
    }

    current.fees.forEach(fe => {
      const row = document.createElement('div');
      row.className = 'fee-item';
      row.innerHTML = `
        <div class="input-field" style="margin:0;">
          <input type="text" data-field="name" data-id="${fe.id}" value="${escapeHtml(fe.name)}" placeholder="Charge Name (e.g. Customs Duty, Transport)">
        </div>
        <div class="input-field" style="margin:0;">
          <select data-field="type" data-id="${fe.id}">
            <option value="flat" ${fe.type==='flat'?'selected':''}>Flat LKR</option>
            <option value="percent" ${fe.type==='percent'?'selected':''}>Percent %</option>
          </select>
        </div>
        <div class="input-field" style="margin:0;">
          <input type="number" data-field="amount" data-id="${fe.id}" value="${fe.amount}" step="0.01" placeholder="${fe.type==='percent'?'%':'LKR'}" class="mono">
        </div>
        <div class="fee-basis" data-basis-for="${fe.id}"></div>
        <div class="text-right">
          <button class="btn-ghost btn-icon" data-remove-fee="${fe.id}" title="Remove charge" style="color:var(--danger); cursor:pointer;">✕</button>
        </div>
      `;
      body.appendChild(row);
      
      const basisSlot = row.querySelector(`[data-basis-for="${fe.id}"]`);
      if (fe.type === 'flat'){
        basisSlot.innerHTML = `
          <div class="input-field" style="margin:0;">
            <select data-field="method" data-id="${fe.id}">
              <option value="cbm" ${fe.method==='cbm'?'selected':''}>By Volume (CBM)</option>
              <option value="value" ${fe.method==='value'?'selected':''}>By Item Value</option>
              <option value="equal" ${fe.method==='equal'?'selected':''}>Equally per Item</option>
            </select>
          </div>`;
      } else {
        basisSlot.innerHTML = `
          <div class="input-field" style="margin:0;">
            <select data-field="base" data-id="${fe.id}">
              <option value="cif" ${fe.base==='cif'?'selected':''}>Value + Freight (CIF)</option>
              <option value="value" ${fe.base==='value'?'selected':''}>Goods Value Only</option>
              <option value="running" ${fe.base==='running'?'selected':''}>Running Total (Compounding)</option>
            </select>
          </div>`;
      }
    });
    
    bindFeeInputs();
    renderPresetChips();
    calculate();
  }

  function bindFeeInputs() {
    document.querySelectorAll('#feesBody input, #feesBody select').forEach(inp => {
      inp.onchange = inp.oninput = (e) => {
        const id = e.target.getAttribute('data-id');
        const field = e.target.getAttribute('data-field');
        const fe = current.fees.find(f => f.id === id);
        if (!fe) return;
        
        if (field === 'name') { fe.name = e.target.value; renderPresetChips(); }
        else if (field === 'type') { fe.type = e.target.value; renderFees(); debouncedSave(); return; }
        else if (field === 'amount') fe.amount = parseFloat(e.target.value) || 0;
        else if (field === 'method') fe.method = e.target.value;
        else if (field === 'base') fe.base = e.target.value;
        
        calculate();
        debouncedSave();
      };
    });
    
    document.querySelectorAll('[data-remove-fee]').forEach(btn => {
      btn.onclick = (e) => {
        const id = e.target.getAttribute('data-remove-fee');
        current.fees = current.fees.filter(f => f.id !== id);
        renderFees();
        debouncedSave();
        showToast("Charge removed");
      };
    });
  }

  function newFee(name, type, amount, method, base) {
    return { id: 'fe'+(current.feeSeq++), name: name||'', type: type||'flat', amount: amount||0, method: method||'cbm', base: base||'cif' };
  }

  const addFeeBtn = document.getElementById('addFeeBtn');
  if (addFeeBtn) {
    addFeeBtn.onclick = () => {
      current.fees.push(newFee('', 'flat', 0, 'cbm', 'cif'));
      renderFees();
      debouncedSave();
    };
  }

  const applySlBtn = document.getElementById('applySlTaxBundleBtn');
  if (applySlBtn) {
    applySlBtn.onclick = () => {
      const names = (current?.fees || []).map(f => (f.name || '').toLowerCase());
      let added = 0;
      if (!names.some(n => n.includes('duty'))) {
        current.fees.push(newFee('Customs Duty (15%)', 'percent', 15, 'cbm', 'cif'));
        added++;
      }
      if (!names.some(n => n.includes('pal'))) {
        current.fees.push(newFee('PAL (Port & Airport Levy)', 'percent', 10, 'cbm', 'cif'));
        added++;
      }
      if (!names.some(n => n.includes('vat'))) {
        current.fees.push(newFee('VAT', 'percent', 18, 'cbm', 'running'));
        added++;
      }
      renderFees();
      debouncedSave();
      showToast(added > 0 ? `Applied Sri Lanka Tax Bundle (+${added} taxes)` : "Sri Lanka Tax Bundle already active");
    };
  }

  // ==== CALCULATIONS ====
  // State for animations
  let lastTotals = { cbm: 0, value: 0, freight: 0, fees: 0, total: 0 };

  function calculate() {
    if (!current) return;
    
    const exRate = parseFloat(document.getElementById('exRate').value) || 0;
    const cbmRate = parseFloat(document.getElementById('cbmRate').value) || 0;
    const fCurr = document.getElementById('freightCurrency')?.value || 'LKR';
    const markupPct = parseFloat(document.getElementById('markupPercent').value) || 0;
    
    // Incomplete Step 2 warning alert
    const alertBanner = document.getElementById('step2AlertBanner');
    if (alertBanner) {
      if (exRate <= 0) {
        alertBanner.classList.remove('hidden');
      } else {
        alertBanner.classList.add('hidden');
      }
    }

    const cargoMode = document.getElementById('cargoMode')?.value || 'sea';
    
    // Calculate total measure (CBM or Kg) with rounding for air
    let totalMeasure = 0;
    const itemMeasures = current.items.map(i => {
      let m = parseFloat(i.cbm) || 0;
      totalMeasure += m;
      return m;
    });
    
    const billableMeasure = cargoMode === 'air' ? Math.ceil(totalMeasure) : totalMeasure;

    const totalValueBase = current.items.reduce((s,i) => s + (i.qty * i.price), 0);
    const totalValueLKR = totalValueBase * exRate;

    // Convert freight if quoted in USD
    let effFreightLkrPerUnit = cbmRate;
    if (fCurr === 'USD') {
      const convRate = current.baseCurrency === 'USD' ? (exRate || 305) : (current.usdToLkr || 305);
      effFreightLkrPerUnit = cbmRate * convRate;
    }
    const freightTotal = billableMeasure * effFreightLkrPerUnit;

    const perItem = current.items.map((it, idx) => {
      const valueLKR = it.qty * it.price * exRate;
      const measure = itemMeasures[idx];
      const freightShare = totalMeasure > 0 ? (measure/totalMeasure) * freightTotal : 0;
      return { it, valueLKR, freightShare, feesShare: 0, running: valueLKR + freightShare };
    });

    current.fees.forEach(fe => {
      if (fe.type === 'flat'){
        perItem.forEach((row, idx) => {
          let share = 0;
          if (fe.method === 'cbm') {
            const measure = itemMeasures[idx];
            share = totalMeasure > 0 ? (measure/totalMeasure) * fe.amount : 0;
          }
          else if (fe.method === 'value') share = totalValueLKR > 0 ? (row.valueLKR/totalValueLKR) * fe.amount : 0;
          else share = perItem.length > 0 ? fe.amount / perItem.length : 0;
          
          row.feesShare += share;
          row.running += share;
        });
      } else {
        perItem.forEach(row => {
          let base = row.valueLKR;
          if (fe.base === 'cif') base = row.valueLKR + row.freightShare;
          else if (fe.base === 'running') base = row.running;
          
          const amt = base * (fe.amount/100);
          row.feesShare += amt;
          row.running += amt;
        });
      }
    });

    let grandTotal = 0, grandFees = 0, sumQty = 0;
    perItem.forEach(row => {
      grandTotal += row.running;
      grandFees += row.feesShare;
      sumQty += row.it.qty;
    });

    renderResults(perItem, billableMeasure, totalValueLKR, freightTotal, grandFees, grandTotal, sumQty, markupPct);
  }

  function renderResults(perItem, tCbm, tVal, tFr, tFee, tTot, tQty, markupPct) {
    // Animate summaries
    animateNumber(document.getElementById('sumCbm'), lastTotals.cbm, tCbm, 500, true);
    animateNumber(document.getElementById('sumValue'), lastTotals.value, tVal);
    animateNumber(document.getElementById('sumFees'), lastTotals.fees, tFr + tFee);
    animateNumber(document.getElementById('sumTotal'), lastTotals.total, tTot);
    
    lastTotals = { cbm: tCbm, value: tVal, freight: tFr, fees: tFee, total: tTot };

    // Composition Bar
    const barGoods = document.getElementById('barGoods');
    const barFreight = document.getElementById('barFreight');
    const barFees = document.getElementById('barFees');
    if (tTot > 0) {
      barGoods.style.width = (tVal / tTot * 100) + '%';
      barFreight.style.width = (tFr / tTot * 100) + '%';
      barFees.style.width = (tFee / tTot * 100) + '%';
    } else {
      barGoods.style.width = barFreight.style.width = barFees.style.width = '0%';
    }

    const body = document.getElementById('resultsBody');
    const foot = document.getElementById('resultsFoot');
    const costBar = document.getElementById('costBarSection');
    const mobileCards = document.getElementById('resultsMobileCards');
    const btnCards = document.getElementById('btnViewCards');
    
    if (btnCards) {
      const label = perItem.length > 0 ? `Card View (${perItem.length})` : 'Card View';
      const span = btnCards.querySelector('span');
      if (span) span.textContent = label;
    }
    
    if (body) body.innerHTML = '';
    if (mobileCards) mobileCards.innerHTML = '';
    
    if (perItem.length === 0) {
      if (foot) foot.style.display = 'none';
      if (costBar) costBar.style.display = 'none';
      
      const emptyHtml = `
        <div style="text-align:center; padding: 36px 16px; background:#fff; border-radius:14px; border:1px dashed var(--border); box-shadow:0 1px 3px rgba(0,0,0,0.02);">
          <div style="font-size:32px; margin-bottom:8px;">📦</div>
          <div style="font-weight:800; font-size:15px; color:var(--ink); margin-bottom:4px;">Awaiting Line Items</div>
          <div style="font-size:12px; color:var(--ink-soft); max-width:300px; margin:0 auto; line-height:1.4;">Upload an Excel sheet, invoice image, or add items manually in Step 1 to generate landed costs.</div>
        </div>
      `;
      if (mobileCards) mobileCards.innerHTML = emptyHtml;
      
      if (body) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td colspan="7" style="text-align:center; padding: 44px 16px;">
            <div style="display:inline-flex; flex-direction:column; align-items:center; gap:8px;">
              <div style="width:42px; height:42px; border-radius:50%; background:rgba(15,23,42,0.04); display:flex; align-items:center; justify-content:center; font-size:20px;">📦</div>
              <div style="font-weight:700; font-size:14px; color:var(--ink);">Awaiting Line Items</div>
              <div style="font-size:12.5px; color:var(--ink-soft); max-width:320px;">Add or import items in Step 1 to calculate landed costs and target selling prices.</div>
            </div>
          </td>
        `;
        body.appendChild(tr);
      }
      return;
    }

    if (foot) foot.style.display = '';
    if (costBar) costBar.style.display = '';

    const exRate = parseFloat(document.getElementById('exRate')?.value) || 0;
    const currSym = getCurrencySymbol(current.baseCurrency || 'USD');
    const cargoMode = document.getElementById('cargoMode')?.value || 'sea';
    const measureUnit = cargoMode === 'air' ? 'Kg' : 'CBM';

    perItem.forEach((row, idx) => {
      const qty = row.it.qty || 1;
      const unitCost = qty > 0 ? row.running / qty : 0;
      const targetSell = unitCost * (1 + markupPct/100);
      const profitPerUnit = targetSell - unitCost;
      const batchTotalLanded = row.running;
      const batchTotalRevenue = targetSell * qty;
      const batchTotalProfit = profitPerUnit * qty;
      
      const unitGoodsLKR = qty > 0 ? row.valueLKR / qty : 0;
      const unitFreightLKR = qty > 0 ? row.freightShare / qty : 0;
      const unitFeesLKR = qty > 0 ? row.feesShare / qty : 0;
      
      const basePriceFormatted = (row.it.price > 0) ? `${currSym}${fmt2(row.it.price)}` : '';
      const cbmVal = parseFloat(row.it.cbm) || 0;
      const cbmFormatted = cbmVal > 0 ? `${cbmVal.toFixed(3)} ${measureUnit}` : '';
      
      // Breakdown percentages for mini progress bar
      let goodsPct = batchTotalLanded > 0 ? Math.round((row.valueLKR / batchTotalLanded) * 100) : 0;
      let freightPct = batchTotalLanded > 0 ? Math.round((row.freightShare / batchTotalLanded) * 100) : 0;
      let feesPct = Math.max(0, 100 - goodsPct - freightPct);
      if (goodsPct + freightPct + feesPct === 0) goodsPct = 100;
      
      // 1. Desktop Table Row
      if (body) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="font-weight:600;">${escapeHtml(row.it.desc || '(untitled)')}</td>
          <td class="num">${fmt(row.it.qty)}</td>
          <td class="num mono text-muted">${fmt(row.valueLKR)}</td>
          <td class="num mono text-muted">${fmt(row.freightShare)}</td>
          <td class="num mono text-muted">${fmt(row.feesShare)}</td>
          <td class="num mono" style="font-weight:700; font-size:14px;">${fmt(unitCost)}</td>
          <td class="num mono" style="font-weight:700; color:var(--success); font-size:14px;">${fmt(targetSell)}</td>
        `;
        body.appendChild(tr);
      }

      // 2. God-Mode Mobile Result Card (True Table-Alternative Matrix)
      if (mobileCards) {
        const card = document.createElement('div');
        card.className = 'result-mobile-card';
        card.style.animationDelay = `${Math.min(idx * 35, 300)}ms`;
        card.innerHTML = `
          <!-- 1. Header with # Badge & Qty -->
          <div class="rmc-header">
            <div class="rmc-title-row">
              <span class="rmc-badge">#${idx + 1 < 10 ? '0' + (idx + 1) : idx + 1}</span>
              <span class="rmc-desc">${escapeHtml(row.it.desc || '(untitled item)')}</span>
            </div>
            <div class="rmc-qty-pill">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
              <span>${fmt(qty)} units</span>
            </div>
          </div>

          <!-- Meta Info Strip (FOB Price & Volume) -->
          <div class="rmc-meta-bar">
            <span class="rmc-meta-item">🏷️ FOB: <strong>${basePriceFormatted ? basePriceFormatted + '/ea (' + fmt(unitGoodsLKR) + ' LKR)' : 'LKR ' + fmt(unitGoodsLKR) + '/ea'}</strong></span>
            ${cbmFormatted ? `<span class="rmc-meta-dot">•</span><span class="rmc-meta-item">📐 Vol: <strong>${cbmFormatted}</strong></span>` : ''}
            <span class="rmc-meta-dot">•</span>
            <span class="rmc-meta-item">📦 Total FOB: <strong>LKR ${fmt(row.valueLKR)}</strong></span>
          </div>
          
          <!-- 2. Hero 2-Box Highlights: Unit Landed Cost & Target Selling Price -->
          <div class="rmc-hero-grid">
            <div class="rmc-hero-box rmc-cost-box">
              <div class="rmc-hero-label">Unit Landed Cost</div>
              <div class="rmc-hero-val"><span class="curr">LKR</span> ${fmt(unitCost)}</div>
              <div class="rmc-hero-sub">Batch Total: LKR ${fmt(batchTotalLanded)}</div>
            </div>
            <div class="rmc-hero-box rmc-sell-box">
              <div class="rmc-hero-label">
                <span>Target Selling</span>
                <span class="profit-tag">+${markupPct}% Margin</span>
              </div>
              <div class="rmc-hero-val"><span class="curr">LKR</span> ${fmt(targetSell)}</div>
              <div class="rmc-hero-sub">+LKR ${fmt(profitPerUnit)} profit/unit</div>
            </div>
          </div>

          <!-- 3. Cost Composition Mini-Bar -->
          <div class="rmc-comp-section">
            <div class="rmc-comp-bar">
              <div class="rmc-comp-seg rmc-seg-goods" style="width: ${goodsPct}%;" title="Goods: ${goodsPct}%"></div>
              <div class="rmc-comp-seg rmc-seg-freight" style="width: ${freightPct}%;" title="Freight: ${freightPct}%"></div>
              <div class="rmc-comp-seg rmc-seg-fees" style="width: ${feesPct}%;" title="Charges: ${feesPct}%"></div>
            </div>
            <div class="rmc-comp-legend">
              <div class="rmc-comp-legend-item"><span class="rmc-comp-dot" style="background:#3B82F6;"></span> Goods ${goodsPct}%</div>
              <div class="rmc-comp-legend-item"><span class="rmc-comp-dot" style="background:#F59E0B;"></span> Freight ${freightPct}%</div>
              <div class="rmc-comp-legend-item"><span class="rmc-comp-dot" style="background:#8B5CF6;"></span> Charges ${feesPct}%</div>
            </div>
          </div>

          <!-- 4. Complete Mobile Ledger Matrix (Table-Alternative) -->
          <div class="rmc-ledger">
            <div class="rmc-ledger-header">
              <div>Cost Factor</div>
              <div class="rmc-l-head-right">Per Unit</div>
              <div class="rmc-l-head-right">Line Total</div>
            </div>
            <div class="rmc-ledger-row">
              <div class="rmc-l-col">
                <span class="rmc-l-name">🏷️ Goods (FOB)</span>
                <span class="rmc-l-sub">Base Purchase</span>
              </div>
              <div class="rmc-l-val">LKR ${fmt(unitGoodsLKR)}</div>
              <div class="rmc-l-val">LKR ${fmt(row.valueLKR)}</div>
            </div>
            <div class="rmc-ledger-row">
              <div class="rmc-l-col">
                <span class="rmc-l-name">⚓ Freight Share</span>
                <span class="rmc-l-sub">Logistics Transit</span>
              </div>
              <div class="rmc-l-val">LKR ${fmt(unitFreightLKR)}</div>
              <div class="rmc-l-val">LKR ${fmt(row.freightShare)}</div>
            </div>
            <div class="rmc-ledger-row">
              <div class="rmc-l-col">
                <span class="rmc-l-name">🏛️ Customs & Fees</span>
                <span class="rmc-l-sub">Duty, Port, Tax</span>
              </div>
              <div class="rmc-l-val">LKR ${fmt(unitFeesLKR)}</div>
              <div class="rmc-l-val">LKR ${fmt(row.feesShare)}</div>
            </div>
            <div class="rmc-ledger-row total-row">
              <div class="rmc-l-col">
                <span class="rmc-l-name" style="font-weight:800; color:#0F172A;">💎 Landed Cost</span>
                <span class="rmc-l-sub" style="color:#64748B;">Total All-In Cost</span>
              </div>
              <div class="rmc-l-val total-val">LKR ${fmt(unitCost)}</div>
              <div class="rmc-l-val total-val">LKR ${fmt(batchTotalLanded)}</div>
            </div>
          </div>

          <!-- 5. Batch Financial Bottom Bar & Actions -->
          <div class="rmc-footer">
            <div class="rmc-batch-stat">
              Revenue: <strong>LKR ${fmt(batchTotalRevenue)}</strong> • Profit: <strong style="color:#059669;">+LKR ${fmt(batchTotalProfit)}</strong>
            </div>
            <div class="rmc-btn-group">
              <button type="button" class="rmc-copy-btn" onclick="copyCardItemSummary(${idx})" title="Copy item breakdown">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                <span>Copy</span>
              </button>
              <button type="button" class="rmc-wa-btn" onclick="shareCardItemWhatsapp(${idx})" title="Share to WhatsApp">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.941-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.101.005.232-.039.362.274.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.861.174.086.275.072.376-.044.101-.116.433-.506.549-.679.116-.174.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.043.072.043.419-.101.824z"/></svg>
                <span>Share</span>
              </button>
            </div>
          </div>
        `;
        mobileCards.appendChild(card);
      }
    });

    document.getElementById('footQty').textContent = fmt(tQty);
    document.getElementById('footValue').textContent = fmt(tVal);
    document.getElementById('footFreight').textContent = fmt(tFr);
    document.getElementById('footCharges').textContent = fmt(tFee);
    const footSellingPriceEl = document.getElementById('footSellingPrice');
    if (footSellingPriceEl) {
      footSellingPriceEl.textContent = fmt(tTot * (1 + markupPct/100));
    }
  }

  // Helper to copy individual card item breakdown to clipboard
  window.copyCardItemSummary = function(idx) {
    if (!current || !current.items || !current.items[idx]) return;
    const it = current.items[idx];
    const markupPct = parseFloat(document.getElementById('markupPercent').value) || 0;
    const cardElem = document.querySelectorAll('.result-mobile-card')[idx];
    const unitCostText = cardElem ? cardElem.querySelector('.rmc-cost-box .rmc-hero-val')?.textContent?.replace(/\s+/g,' ').trim() : '';
    const sellText = cardElem ? cardElem.querySelector('.rmc-sell-box .rmc-hero-val')?.textContent?.replace(/\s+/g,' ').trim() : '';
    const profitText = cardElem ? cardElem.querySelector('.rmc-sell-box .rmc-hero-sub')?.textContent?.trim() : '';
    const batchStat = cardElem ? cardElem.querySelector('.rmc-batch-stat')?.textContent?.replace(/\s+/g,' ').trim() : '';
    
    const text = `📦 *${it.desc || 'Item #' + (idx+1)}*\n• Quantity: ${fmt(it.qty)} units\n• Unit Landed Cost: ${unitCostText || 'LKR 0'}\n• Target Selling Price (+${markupPct}%): ${sellText || 'LKR 0'}\n• Profit: ${profitText}\n• Batch Summary: ${batchStat}\n_Calculated via TrueLanded PRO_`;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast(`Copied Item #${idx+1} summary to clipboard!`);
      }).catch(() => {
        showToast(`Item #${idx+1} copied!`);
      });
    } else {
      showToast(`Item #${idx+1}: Landed ${unitCostText}`);
    }
  };

  // Helper to share individual card item via WhatsApp
  window.shareCardItemWhatsapp = function(idx) {
    if (!current || !current.items || !current.items[idx]) return;
    const it = current.items[idx];
    const markupPct = parseFloat(document.getElementById('markupPercent').value) || 0;
    const cardElem = document.querySelectorAll('.result-mobile-card')[idx];
    const unitCostText = cardElem ? cardElem.querySelector('.rmc-cost-box .rmc-hero-val')?.textContent?.replace(/\s+/g,' ').trim() : '';
    const sellText = cardElem ? cardElem.querySelector('.rmc-sell-box .rmc-hero-val')?.textContent?.replace(/\s+/g,' ').trim() : '';
    const profitText = cardElem ? cardElem.querySelector('.rmc-sell-box .rmc-hero-sub')?.textContent?.trim() : '';
    
    const text = `📦 *${it.desc || 'Item #' + (idx+1)}*\n• Quantity: ${fmt(it.qty)} pcs\n• *Unit Landed Cost: ${unitCostText}*\n• *Target Selling Price (+${markupPct}%): ${sellText}* (${profitText})\n\n_Calculated with TrueLanded PRO_`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  document.getElementById('markupPercent').addEventListener('input', calculate);

  // ==== EXPORT ====
  document.getElementById('exportPdfBtn').onclick = () => window.print();

  document.getElementById('shareWaBtn').onclick = () => {
    if(!current || !current.items.length) {
      showToast("Nothing to share yet!", "error");
      return;
    }
    const name = current.name || 'Shipment';
    const cbm = lastTotals.cbm.toFixed(2);
    const tot = fmt(lastTotals.total);
    const qty = current.items.reduce((s,i) => s + i.qty, 0);
    const text = `📦 *${name}*\nOrigin: ${current.route.origin}\nDest: ${current.route.dest}\n\n*Summary:*\nItems: ${current.items.length} (${qty} pcs)\nVolume: ${cbm} CBM\n*Total Landed Cost: LKR ${tot}*`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  
  
  // ==== STEP 4 MOBILE VIEW TOGGLE HANDLERS ====
  function setupMobileViewToggle() {
    const btnCards = document.getElementById('btnViewCards');
    const btnTable = document.getElementById('btnViewTable');
    const mobileCards = document.getElementById('resultsMobileCards');
    const tableContainer = document.getElementById('resultsTableContainer');

    if (btnCards && btnTable) {
      btnCards.onclick = (e) => {
        if (e) e.preventDefault();
        btnCards.classList.add('active');
        btnTable.classList.remove('active');
        if (mobileCards) {
          mobileCards.classList.remove('hide-cards');
          mobileCards.style.display = 'flex';
          mobileCards.style.flexDirection = 'column';
        }
        if (tableContainer) {
          tableContainer.classList.remove('show-table');
          tableContainer.style.display = 'none';
        }
      };
      btnTable.onclick = (e) => {
        if (e) e.preventDefault();
        btnTable.classList.add('active');
        btnCards.classList.remove('active');
        if (mobileCards) {
          mobileCards.classList.add('hide-cards');
          mobileCards.style.display = 'none';
        }
        if (tableContainer) {
          tableContainer.classList.add('show-table');
          tableContainer.style.display = 'block';
        }
      };
    }
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupMobileViewToggle);
  } else {
    setupMobileViewToggle();
  }

  document.getElementById('copyTableBtn').onclick = async () => {
    const table = document.getElementById('resultsTable');
    let tsv = '';
    for (let r of table.rows) {
      let rowData = [];
      for (let c of r.cells) rowData.push(c.innerText.replace(/\n/g, ' '));
      tsv += rowData.join('\t') + '\n';
    }
    try {
      await navigator.clipboard.writeText(tsv);
      showToast("Copied to clipboard!");
    } catch(e) {
      showToast("Failed to copy", "error");
    }
  };

  document.getElementById('exportExcelBtn').onclick = () => {
    if (typeof XLSX === 'undefined') {
      showToast("Excel library loading, please try again in a moment.", "error");
      return;
    }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.table_to_sheet(document.getElementById('resultsTable'));
    XLSX.utils.book_append_sheet(wb, ws, "Landed Cost");
    const filename = (current.name || "Shipment").replace(/[^a-z0-9]/gi, '_').toLowerCase() + ".xlsx";
    XLSX.writeFile(wb, filename);
    showToast("Downloaded " + filename);
  };

  // ==== IMPORT & MAPPING ====
  // Tabs
  document.querySelectorAll('.tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const targetContent = document.getElementById('tab-' + tab.getAttribute('data-tab'));
      if (targetContent) targetContent.classList.add('active');
    };
  });

  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const fileInputPhoto = document.getElementById('fileInputPhoto');
  const fileInputPdf = document.getElementById('fileInputPdf');
  const fileInputExcel = document.getElementById('fileInputExcel');
  const parseStatusText = document.getElementById('parseStatusText');
  const parseStatusDiv = document.getElementById('parseStatus');
  const parseSpinner = document.getElementById('parseSpinner');

  let workbookSheets = {};
  let currentRows = [];
  let currentHeaderRowIdx = 0;

  function bindInputHandler(el) {
    if (!el) return;
    el.onchange = (e) => {
      const f = e.target.files?.[0];
      if (f) {
        handleFile(f);
        el.value = '';
      }
    };
  }

  [fileInput, fileInputPhoto, fileInputPdf, fileInputExcel].forEach(bindInputHandler);

  if (dropzone) {
    const btnPhoto = document.getElementById('btnUploadPhoto');
    const btnPdf = document.getElementById('btnUploadPdf');
    const btnExcel = document.getElementById('btnUploadExcel');

    if (btnPhoto && fileInputPhoto) {
      btnPhoto.onclick = (e) => {
        e.stopPropagation();
        fileInputPhoto.click();
      };
    }
    if (btnPdf && fileInputPdf) {
      btnPdf.onclick = (e) => {
        e.stopPropagation();
        fileInputPdf.click();
      };
    }
    if (btnExcel && fileInputExcel) {
      btnExcel.onclick = (e) => {
        e.stopPropagation();
        fileInputExcel.click();
      };
    }

    dropzone.onclick = (e) => {
      if (fileInput) fileInput.click();
    };

    ['dragenter','dragover'].forEach(evt => dropzone.addEventListener(evt, e => { e.preventDefault(); dropzone.classList.add('dragover'); }));
    ['dragleave','drop'].forEach(evt => dropzone.addEventListener(evt, e => { e.preventDefault(); dropzone.classList.remove('dragover'); }));
    dropzone.addEventListener('drop', e => { const f = e.dataTransfer.files?.[0]; if(f) handleFile(f); });
  }

  // ==== IN-BROWSER DOCUMENT & OCR ENGINE ====
  function showParseStatus(msg, loading = false, error = false, progressPct = null) {
    if (!parseStatusDiv || !parseStatusText) return;
    parseStatusDiv.classList.remove('hidden');
    parseStatusText.textContent = msg;
    parseStatusText.style.color = error ? 'var(--danger)' : 'var(--primary)';
    
    if (parseSpinner) {
      if (loading) parseSpinner.classList.remove('hidden');
      else parseSpinner.classList.add('hidden');
    }
    
    const progressWrap = document.getElementById('ocrProgressBarWrap');
    const progressBar = document.getElementById('ocrProgressBar');
    if (progressWrap && progressBar) {
      if (progressPct !== null && progressPct >= 0) {
        progressWrap.classList.remove('hidden');
        progressBar.style.width = Math.min(100, Math.round(progressPct * 100)) + '%';
      } else {
        progressWrap.classList.add('hidden');
      }
    }
  }

  // Canvas Image Preprocessing (Contrast boost, auto-binarize, upscale for blurry WhatsApp photos)
  async function preprocessImageForOcr(fileOrBlob) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(fileOrBlob);
      img.onload = () => {
        URL.revokeObjectURL(url);
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          
          // Determine upscale factor for high OCR clarity
          let scale = 1.0;
          if (img.width < 1200 || img.height < 1200) {
            scale = Math.min(2.5, 1800 / Math.max(img.width, img.height));
            if (scale < 1.2) scale = 1.5;
          } else if (img.width > 3000 || img.height > 3000) {
            scale = 2200 / Math.max(img.width, img.height);
          }
          
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);
          canvas.width = w;
          canvas.height = h;
          
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, w, h);
          
          const imgData = ctx.getImageData(0, 0, w, h);
          const data = imgData.data;
          const len = data.length;
          
          // Contrast factor
          const contrast = 1.4;
          const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
          
          for (let i = 0; i < len; i += 4) {
            const r = data[i], g = data[i+1], b = data[i+2];
            // Grayscale
            let gray = 0.299 * r + 0.587 * g + 0.114 * b;
            // Contrast
            gray = factor * (gray - 128) + 128;
            
            // Clean up colored table headers (e.g. yellow rows) and light backgrounds
            if (gray > 190) {
              gray = Math.min(255, gray + 40);
            } else if (gray < 85) {
              gray = Math.max(0, gray - 30);
            }
            
            gray = Math.max(0, Math.min(255, gray));
            data[i] = gray;
            data[i+1] = gray;
            data[i+2] = gray;
          }
          
          ctx.putImageData(imgData, 0, 0);
          resolve(canvas);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image file.'));
      };
      img.src = url;
    });
  }

  // In-Browser OCR using Tesseract.js (loaded on demand to keep initial page fast)
  function ensureTesseractLoaded() {
    if (typeof Tesseract !== 'undefined') return Promise.resolve();
    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-tesseract]');
      if (existing) {
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', () => reject(new Error('Failed to load OCR engine. Check your connection and try again.')), { once: true });
        return;
      }
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
      s.async = true;
      s.setAttribute('data-tesseract', '1');
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Failed to load OCR engine. Check your connection and try again.'));
      document.head.appendChild(s);
    });
  }
  async function runBrowserOcr(fileOrCanvas, progressCb) {
    if (typeof Tesseract === 'undefined') {
      if (progressCb) progressCb({ status: 'Loading OCR engine (one-time download)...', progress: 0.05 });
      await ensureTesseractLoaded();
    }
    if (typeof Tesseract === 'undefined') {
      throw new Error("OCR engine is still loading. Please check your internet connection and try again.");
    }
    
    let target = fileOrCanvas;
    if (fileOrCanvas instanceof Blob || fileOrCanvas instanceof File) {
      if (progressCb) progressCb({ status: 'Enhancing image resolution and contrast...', progress: 0.1 });
      target = await preprocessImageForOcr(fileOrCanvas);
    }
    
    if (progressCb) progressCb({ status: 'Loading OCR language models (English + Chinese)...', progress: 0.2 });
    
    let worker;
    try {
      worker = await Tesseract.createWorker(['eng', 'chi_sim'], 1, {
        logger: m => {
          if (m && m.status) {
            const pct = m.progress != null ? Math.round(m.progress * 100) : null;
            let msg = 'Scanning document...';
            if (m.status === 'recognizing text') msg = `Reading text and numbers (${pct}%)...`;
            else if (m.status.includes('load')) msg = `Loading language dictionaries (${pct != null ? pct + '%' : ''})...`;
            if (progressCb) progressCb({ status: msg, progress: m.progress != null ? (0.2 + m.progress * 0.75) : 0.4 });
          }
        },
        errorHandler: err => console.warn('Tesseract notice:', err)
      });
    } catch (e) {
      // Fallback to English only if Chinese dictionary fails to download
      worker = await Tesseract.createWorker('eng', 1, {
        logger: m => {
          if (progressCb && m && m.progress != null) {
            progressCb({ status: `Scanning text (${Math.round(m.progress * 100)}%)...`, progress: 0.2 + m.progress * 0.75 });
          }
        }
      });
    }
    
    try {
      const result = await worker.recognize(target);
      await worker.terminate();
      return result.data;
    } catch (err) {
      try { await worker.terminate(); } catch(e){}
      throw err;
    }
  }

  // In-Browser PDF Parser using PDF.js
  async function runPdfExtraction(file, progressCb) {
    if (typeof pdfjsLib === 'undefined') {
      throw new Error("PDF Reader library is loading. Please try again in a few seconds.");
    }
    
    if (progressCb) progressCb({ status: 'Reading PDF document structure...', progress: 0.1 });
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;
    
    let allLines = [];
    let totalWords = 0;
    
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      if (progressCb) progressCb({ status: `Extracting page ${pageNum} of ${numPages}...`, progress: 0.1 + (pageNum / numPages) * 0.4 });
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      if (textContent.items && textContent.items.length > 5) {
        const items = textContent.items.map(it => ({
          text: it.str,
          x: it.transform[4],
          y: it.transform[5],
          w: it.width,
          h: it.height
        })).filter(it => it.text.trim().length > 0);
        
        totalWords += items.length;
        
        // Sort by Y descending (top to bottom)
        items.sort((a, b) => b.y - a.y);
        
        const rows = [];
        let currentRow = [];
        let currentY = null;
        
        items.forEach(it => {
          if (currentY === null || Math.abs(it.y - currentY) > 4) {
            if (currentRow.length > 0) {
              currentRow.sort((a, b) => a.x - b.x);
              rows.push(currentRow);
            }
            currentRow = [it];
            currentY = it.y;
          } else {
            currentRow.push(it);
          }
        });
        if (currentRow.length > 0) {
          currentRow.sort((a, b) => a.x - b.x);
          rows.push(currentRow);
        }
        
        rows.forEach(r => {
          const lineText = r.map(it => it.text).join('\t');
          if (lineText.trim()) allLines.push(lineText);
        });
      }
    }
    
    // If no text layer found (scanned PDF), render pages to canvas and OCR
    if (totalWords < 8) {
      if (progressCb) progressCb({ status: 'Scanned PDF detected. Scanning with OCR engine...', progress: 0.5 });
      allLines = [];
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;
        
        const ocrData = await runBrowserOcr(canvas, progressCb);
        const pageTextLines = (ocrData.text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        allLines.push(...pageTextLines);
      }
    }
    
    return allLines.join('\n');
  }

  // ==== AI VISION & CLOUD ENGINES ====
  async function callAiVision(base64, mediaType, isPdf) {
    const res = await fetch('/api/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base64,
        mimeType: mediaType,
        isPdf
      })
    });
    
    if (res.ok) {
      return await res.json();
    } else {
      const err = await res.json().catch(() => ({}));
      // Server now sends short `error` + full `details`. Never paste the full
      // chain into the UI banner (err.jpeg proved it fills the screen).
      if (err && err.details) console.warn('AI parse details:', err.details);
      throw new Error(err?.error || `Server error (${res.status})`);
    }
  }

  // ==== AI EXTRACTION REVIEW FLOW ====
  // AI never imports silently: the user must see & confirm what was extracted.
  // This is the guard that stops wrong qty/price/merged rows from reaching the calculation.
  let pendingAiImport = null;

  function showAiReview(result, fileName) {
    const panel = document.getElementById('aiReviewPanel');
    if (!panel) return 0; // no review UI -> caller falls back to legacy direct import

    pendingAiImport = {
      fileName,
      items: Array.isArray(result.items) ? result.items : [],
      extraCharges: Array.isArray(result.extraCharges) ? result.extraCharges : [],
      invoiceCurrency: result.invoiceCurrency || 'UNKNOWN',
      expectedRows: result.expectedRows,
      warnings: Array.isArray(result.warnings) ? result.warnings : []
    };

    const body = document.getElementById('aiReviewBody');
    body.innerHTML = '';
    pendingAiImport.items.forEach((it, idx) => {
      const clean = sanitizeItem(it);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input type="text" class="inline-input" data-rf="desc" data-ri="${idx}" value="${escapeAttr(clean.desc)}" placeholder="Item description"></td>
        <td class="num"><input type="number" class="inline-input mono num" data-rf="qty" data-ri="${idx}" value="${clean.qty}" min="0" step="1"></td>
        <td class="num"><input type="number" class="inline-input mono num" data-rf="price" data-ri="${idx}" value="${clean.price}" min="0" step="0.01"></td>
        <td class="num"><input type="number" class="inline-input mono num" data-rf="cbm" data-ri="${idx}" value="${clean.cbm}" min="0" step="0.001"></td>
      `;
      body.appendChild(tr);
    });

    const note = document.getElementById('aiReviewNote');
    let noteTxt = `AI extracted ${pendingAiImport.items.length} line item(s) from ${fileName}. Please check the values below, then click Import.`;
    if (pendingAiImport.invoiceCurrency && pendingAiImport.invoiceCurrency !== 'UNKNOWN') {
      noteTxt += ` Invoice currency: ${pendingAiImport.invoiceCurrency}.`;
    }
    if (pendingAiImport.expectedRows > 0 && pendingAiImport.expectedRows !== pendingAiImport.items.length) {
      noteTxt += ` The document appears to have ${pendingAiImport.expectedRows} rows — only ${pendingAiImport.items.length} were extracted.`;
    }
    note.textContent = noteTxt;

    const warnEl = document.getElementById('aiReviewWarnings');
    if (pendingAiImport.warnings.length) {
      warnEl.classList.remove('hidden');
      warnEl.innerHTML = pendingAiImport.warnings.map(w => '⚠️ ' + escapeHtml(w)).join('<br>');
    } else {
      warnEl.classList.add('hidden');
    }

    const statusDiv = document.getElementById('parseStatus');
    if (statusDiv) statusDiv.classList.add('hidden');
    panel.classList.remove('hidden');
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return pendingAiImport.items.length;
  }

  function bindAiReviewInputs() {
    document.querySelectorAll('#aiReviewBody input').forEach(inp => {
      inp.oninput = (e) => {
        const ri = Number(e.target.getAttribute('data-ri'));
        const rf = e.target.getAttribute('data-rf');
        if (!pendingAiImport || !pendingAiImport.items[ri]) return;
        if (rf === 'desc') pendingAiImport.items[ri].desc = e.target.value;
        else pendingAiImport.items[ri][rf] = parseFloat(e.target.value) || 0;
      };
    });
  }

  // Convert document "extra charges" (invoice currency) into flat LKR fees.
  function convertExtraCharges(charges, invoiceCurrency) {
    const toLkr = [];
    const skipped = [];
    const baseCurr = document.getElementById('baseCurrency').value;
    const exRate = parseFloat(document.getElementById('exRate').value) || 0;

    (Array.isArray(charges) ? charges : []).forEach(c => {
      const name = String((c && c.name) || '').trim();
      const amount = Number((c && c.amount) || 0);
      if (!name || !isFinite(amount) || amount <= 0) return;
      const curr = String((c && c.currency) || invoiceCurrency || 'UNKNOWN').toUpperCase().replace('CNY', 'RMB');
      if (curr === 'LKR') {
        toLkr.push({ name, amount });
      } else if (curr === baseCurr && exRate > 0) {
        toLkr.push({ name, amount: Math.round(amount * exRate) });
      } else {
        skipped.push(`${name} (${curr} ${amount})`);
      }
    });
    return { toLkr, skipped };
  }

  function confirmAiImport() {
    const panel = document.getElementById('aiReviewPanel');
    try {
      if (!pendingAiImport) return;

      // Base currency auto-detect from the invoice currency (same as the OCR flow)
      const baseCurrEl = document.getElementById('baseCurrency');
      const invCurr = String(pendingAiImport.invoiceCurrency || '').toUpperCase().replace('CNY', 'RMB');
      if (baseCurrEl && (invCurr === 'RMB' || invCurr === 'USD') && baseCurrEl.value !== invCurr) {
        baseCurrEl.value = invCurr;
        // Fire the bound onchange handler so the exchange rate default follows the currency
        baseCurrEl.dispatchEvent(new Event('change'));
      }

      const items = pendingAiImport.items.map(sanitizeItem).filter(it => it.desc && (it.qty > 0 || it.price > 0));
      if (items.length === 0) throw new Error("No valid items to import. Please fix the rows above or cancel.");

      loadExtractedItems(items, pendingAiImport.fileName || 'AI Vision');

      const charges = convertExtraCharges(pendingAiImport.extraCharges, invCurr);
      if (charges.toLkr.length) {
        charges.toLkr.forEach(c => {
          current.fees.push({ id: 'fe' + (current.feeSeq++), name: c.name, type: 'flat', amount: c.amount, method: 'cbm', base: 'cif' });
        });
        renderFees();
        calculate();
        debouncedSave();
        showToast(`Added ${charges.toLkr.length} charge(s) from document`);
      }
      if (charges.skipped.length) {
        showToast("Skipped charge(s) left in invoice currency: " + charges.skipped.join(', '), "error");
      }
    } catch (e) {
      showParseStatus(`⚠️ ${e.message}`, false, true);
      showToast(e.message, "error");
      return;
    } finally {
      if (panel) panel.classList.add('hidden');
      pendingAiImport = null;
    }
  }

  function cancelAiImport() {
    const panel = document.getElementById('aiReviewPanel');
    if (panel) panel.classList.add('hidden');
    pendingAiImport = null;
    const statusDiv = document.getElementById('parseStatus');
    if (statusDiv) statusDiv.classList.add('hidden');
    showToast("AI import cancelled. You can paste rows or upload again.");
  }

  // ---- Explicit OCR opt-in: NEVER auto-fallback after AI failure ----
  // Root cause of the first incident: /api/parse failed (dead 2.x/1.5 models,
  // quota/404), the catch block silently ran Tesseract, Tesseract misread the
  // 7-row photo table as 2 garbage rows, and loadExtractedItems showed a green
  // "Scanned and imported 2 item(s)!" success. Second incident (err.jpeg):
  // models fixed wrongly back to dead 2.x, so AI hard-failed with a
  // screen-filling 3-model chain. This function shows a SHORT friendly message
  // (full chain goes to console) and requires explicit opt-in to OCR.
  function showAiFailureWithOcrOptIn(file, isImg, isPdf, aiErr) {
    const full = (aiErr && aiErr.message) ? aiErr.message : 'AI service unreachable';
    if (full.length > 220) console.warn('AI failure details:', full);
    const short = full.length > 220 ? full.slice(0, 200).trim() + '…' : full;
    showParseStatus(`AI extraction failed (${short}). No items were imported.`, false, true);
    showToast('AI failed. Retry, or use Excel/paste. Offline OCR is last resort.', "error");
    try {
      const statusDiv = document.getElementById('parseStatus');
      if (!statusDiv || document.getElementById('tryOcrFallbackBtn')) return;
      const btn = document.createElement('button');
      btn.id = 'tryOcrFallbackBtn';
      btn.className = 'btn-secondary';
      btn.style.marginTop = '10px';
      btn.style.fontSize = '12.5px';
      btn.textContent = 'Try offline OCR anyway (less accurate — verify every row)';
      btn.onclick = () => { try { btn.remove(); } catch (e) {} runLocalExtraction(file, isImg, isPdf); };
      statusDiv.appendChild(btn);
    } catch (e) {}
  }

  // ---- Review-gated OCR: garbage can never again import with "success" ----
  // Even perfect OCR text breaks parseInvoiceAndPackingListText on this layout:
  // the "No." column (1,2,3...) and the split MIKI suffix ("AE101 99" → 99)
  // pollute the numbers array, so qty becomes 1 and price becomes 99 instead of
  // qty 15 / price 55, and Remark "4L+4R" leaks into the description. Real phone
  // photos are worse: 7 rows collapsed to 2 ("A ; 让 COROLLA JP" qty 1,
  // "0] VIOS OER or [ec" qty 1009). Routing OCR through the same review panel
  // forces the user to see and fix that before anything reaches the calculation.
  function showOcrReview(items, fileName) {
    const clean = (Array.isArray(items) ? items : []).map(sanitizeItem).filter(it => it.desc && (it.qty > 0 || it.price > 0));
    if (clean.length === 0) {
      showParseStatus('Offline extraction could not detect product rows in this file. Retake a flatter, better-lit photo, or upload the Excel/PDF instead — no items were imported.', false, true);
      showToast('Offline extraction found no rows', "error");
      return;
    }
    const warnings = [
      `Local/offline extraction found ${clean.length} row(s) — accuracy is much lower than AI on photo tables. Check every Description, Qty and Price before importing.`,
      'Tip: the supplier Excel (.xlsx) or a digital PDF imports exactly; photos of tables with product pictures often misread.'
    ];
    clean.forEach(it => {
      if (/[;\]\[]|让|OER|\[ec/i.test(it.desc) || it.qty >= 1000) {
        warnings.push(`Suspicious row "${it.desc}" (qty ${it.qty}) looks misread — fix or delete it before importing.`);
      }
    });
    const reviewed = showAiReview({ items: clean, extraCharges: [], invoiceCurrency: 'UNKNOWN', expectedRows: 0, warnings }, fileName + ' (offline)');
    if (reviewed > 0) bindAiReviewInputs();
    else showParseStatus('Offline extraction found no valid rows. No items were imported.', false, true);
  }

  // Universal unit and currency matchers
  const UNIT_TOKENS = /^(pcs|pc|set|sets|ctn|ctns|box|boxes|pkg|pkgs|units?|prs|pairs?|只|个|件|套|箱|包|张|条|台|本|把|对|支|袋)$/i;
  const CURRENCY_TOKENS = /^[¥$£€₩]|^(rmb|usd|eur|gbp|lkr|cny|cif|fob)$/i;

  // Metadata row filters (MUST never be considered product items)
  const METADATA_PATTERNS = [
    /^(proforma|commercial|tax)\s*invoice\b/i,
    /^(packing\s*list|bill\s*of\s*lading)\b/i,
    /^(invoice\s*no|inv\s*no|po\s*no|order\s*no|bill\s*no)[\s.:：]/i,
    /^(invoice\s*date|order\s*date|date|日期|订单日期)[\s.:：]/i,
    /^(buyer|seller|consignee|shipper|notify|vendor|供货方|购货方|买方|卖方)[\s.:：]/i,
    /^(tel|fax|email|phone|contact|address|地址|电话|联系人)[\s.:：]/i,
    /^(this\s*price|payment\s*terms|terms|bank|beneficiary|此价格)[\s.:：]/i,
    /^\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2}$/ // Standalone date string
  ];

  function isMetadataLine(line) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 3) return true;
    return METADATA_PATTERNS.some(pat => pat.test(trimmed));
  }

  // Smart Invoice & Packing List Table Recognizer
  function parseInvoiceAndPackingListText(rawText) {
    if (!rawText || !rawText.trim()) return [];
    
    const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const parsedItems = [];
    
    // Header keywords across English & Chinese commercial docs
    const headerTokens = ['item', 'style', 'desc', 'description', 'qty', 'quantity', 'deliver', 'price', 'amount', 'cbm', 'ctn', 'n.w', 'g.w', 'gross', '品名', '编号', '数量', '单价', '金额', '体积', '件数', 'photo', '图片', '款号', '货物名称', '规格'];
    // Footer and summary stop tokens
    const stopTokens = ['total', 'subtotal', 'grand total', '合计', '总计', '小计', '唛头', 'shipping mark', 'warehouse', '仓库', 'bank', 'payment', 'terms', 'signature', 'contact', '入库', '联系人', '收货人', '发货人'];

    let inTable = false;
    let headerPassed = false;

    // Detect currency if mentioned in headers / doc
    const lowerFull = rawText.toLowerCase();
    if (lowerFull.includes('rmb') || lowerFull.includes('¥') || lowerFull.includes('cny')) {
      const baseCurrEl = document.getElementById('baseCurrency');
      if (baseCurrEl && baseCurrEl.value !== 'RMB') {
        baseCurrEl.value = 'RMB';
        // Fire the bound onchange handler so the exchange rate default follows the currency
        baseCurrEl.dispatchEvent(new Event('change'));
      }
    } else if (lowerFull.includes('usd') || lowerFull.includes('$')) {
      const baseCurrEl = document.getElementById('baseCurrency');
      if (baseCurrEl && baseCurrEl.value !== 'USD') {
        baseCurrEl.value = 'USD';
        baseCurrEl.dispatchEvent(new Event('change'));
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lower = line.toLowerCase();

      // Skip document title and invoice/buyer metadata immediately
      if (isMetadataLine(line)) {
        continue;
      }

      // Check for stop keywords at line start or standalone
      if (inTable || headerPassed) {
        const isStop = stopTokens.some(st => lower.startsWith(st) || lower.includes(st + ':') || lower.includes(st + '：'));
        if (isStop || /^(total|subtotal|grand total|合计|总计|小计)\b/i.test(lower)) {
          break;
        }
      }

      // Check header match
      const hCount = headerTokens.filter(k => lower.includes(k)).length;
      if (hCount >= 2) {
        inTable = true;
        headerPassed = true;
        continue;
      }

      // If header hasn't passed, only accept line if it has strong product code and valid numbers
      const hasCode = /[A-Z0-9]{3,}-[A-Z0-9]+|[A-Z]{2,}\d+|\b(?:TY|YH|AE\d+|VIOS|KD|WP|NO\.)/i.test(line);
      const hasNumbers = /\d+/.test(line);
      if (!inTable && (hasCode && hasNumbers)) {
        inTable = true;
      }

      if (!inTable) continue;

      // Clean line delimiters (e.g. OCR table lines |, +, _, etc.)
      const cleanLine = line.replace(/[|+_]/g, ' ').replace(/\s+/g, ' ').trim();
      if (!cleanLine || cleanLine.length < 3) continue;

      // Parse tokens
      const rawTokens = cleanLine.split(' ');
      const textParts = [];
      const numbers = [];
      let itemCode = '';

      rawTokens.forEach(tok => {
        // Skip date patterns in tokens (e.g. 2026.08.07, 2026-08-07)
        if (/^\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2}$/.test(tok)) return;

        // Strip currency symbols and commas for number checking
        const cleanNumStr = tok.replace(/^[¥$£€]/, '').replace(/,/g, '').trim();
        const num = parseFloat(cleanNumStr);
        
        if (cleanNumStr && !isNaN(num) && /^-?\d+(\.\d+)?$/.test(cleanNumStr)) {
          // Ignore unrealistic huge numbers that might be phone numbers or dates
          if (num < 10000000) {
            numbers.push(num);
          }
        } else {
          // Identify product SKU / code
          if (!itemCode && /^[A-Z0-9]{2,}[-_/][A-Z0-9]+$/i.test(tok)) {
            itemCode = tok;
          }
          // Only add to description if not a unit or currency symbol
          if (!UNIT_TOKENS.test(tok) && !CURRENCY_TOKENS.test(tok) && tok !== 'PHOTO' && tok !== '图片') {
            textParts.push(tok);
          }
        }
      });

      if (numbers.length === 0 && textParts.length === 0) continue;

      // Assemble description
      let desc = textParts.join(' ').replace(/^(Description|PHOTO|Item|图片|产品描述|款号|品名|货物名称)\s*/i, '').trim();
      if (itemCode && !desc.includes(itemCode)) {
        desc = `${itemCode} ${desc}`.trim();
      }

      // Filter out pure header remnants or empty descriptions
      if (!desc || /^(style\s*no|item\s*name|total|unit\s*price|delivery|qty)/i.test(desc)) {
        if (numbers.length === 0) continue;
      }

      // Intelligent column heuristic from numbers array
      let qty = 0;
      let price = 0;
      let cbm = 0;

      if (numbers.length === 1) {
        qty = numbers[0];
      } else if (numbers.length === 2) {
        if (numbers[1] < 1 && numbers[1] > 0) {
          qty = numbers[0];
          cbm = numbers[1];
        } else {
          qty = numbers[0];
          price = numbers[1];
        }
      } else if (numbers.length >= 3) {
        const decimals = numbers.filter(n => n > 0 && n < 10 && String(n).includes('.'));
        const integers = numbers.filter(n => Number.isInteger(n) && n > 0);
        
        if (integers.length > 0) {
          qty = integers[0];
        }
        
        if (Math.abs(numbers[0] * numbers[1] - numbers[2]) < 5) {
          qty = numbers[0];
          price = numbers[1];
        } else if (numbers.length >= 4 && Math.abs(numbers[1] * numbers[2] - numbers[3]) < 5) {
          qty = numbers[1];
          price = numbers[2];
        } else {
          qty = numbers[0] || 0;
          price = numbers[1] || 0;
        }
        
        if (decimals.length > 0) {
          cbm = decimals[decimals.length - 1];
        }
      }

      // Only save if it has a valid description AND either qty or price > 0
      if (desc && (qty > 0 || price > 0)) {
        parsedItems.push({
          desc: desc,
          qty: isFinite(qty) ? qty : 0,
          price: isFinite(price) ? price : 0,
          cbm: isFinite(cbm) ? cbm : 0
        });
      }
    }

    return parsedItems;
  }

  // Sanitize a single parsed item (clamps absurd/hallucinated values before they hit calculations)
  function sanitizeItem(it) {
    const n = (v, cap) => { const x = Number(v); return Math.min(isFinite(x) && x > 0 ? x : 0, cap); };
    return {
      desc: String((it && it.desc) || '').trim(),
      qty: n(it && it.qty, 1000000),
      price: n(it && it.price, 100000000),
      cbm: n(it && it.cbm, 1000000)
    };
  }

  // Load structured items into manifest
  function loadExtractedItems(items, sourceName) {
    if (!items || items.length === 0) {
      throw new Error("No product line items could be detected. Please check the photo or paste rows manually.");
    }
    
    items.forEach(rawIt => {
      const it = sanitizeItem(rawIt);
      if (!it.desc) return;
      current.items.push({
        id: 'it' + (current.itemSeq++),
        desc: it.desc,
        qty: it.qty,
        price: it.price,
        cbm: it.cbm
      });
    });
    
    renderItems();
    calculate();
    debouncedSave();
    
    showParseStatus(`✓ Scanned and imported ${items.length} item(s) from ${sourceName}!`, false);
    showToast(`Added ${items.length} item(s) from ${sourceName}`);
    
    document.getElementById('mappingPanel').classList.add('hidden');
    const tableWrap = document.getElementById('itemsTableWrap');
    if (tableWrap) {
      tableWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  // Primary file router
  async function handleFile(file) {
    const isImg = /^image\//.test(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name);
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    
    document.getElementById('mappingPanel').classList.add('hidden');
    
    if (isImg || isPdf) {
      showParseStatus(`Analyzing document with AI Vision...`, true);
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64 = e.target.result.split(',')[1];
          const result = await callAiVision(base64, file.type || 'image/jpeg', isPdf);
          
          // If AI detects invalid / non-document image
          if (result && result.isDocument === false) {
            const reason = result.message || "This image does not appear to be an invoice or packing list. Please upload a commercial invoice or receipt.";
            showParseStatus(`⚠️ Notice: ${reason}`, false, true);
            showToast(reason, "error");
            return;
          }

          // Show what the AI extracted and let the user confirm before importing.
          const reviewed = showAiReview(result, file.name);
          if (reviewed > 0) {
            bindAiReviewInputs();
            return;
          }

          // No review panel on this page -> legacy direct import (kept as safety).
          const items = Array.isArray(result) ? result : (result?.items || []);
          if (items && items.length > 0) {
            loadExtractedItems(items, file.name);
            if (result?.extraCharges && Array.isArray(result.extraCharges)) {
              result.extraCharges.forEach(charge => {
                if (charge.name && charge.amount > 0) {
                  current.fees.push({
                    id: 'fe' + (current.feeSeq++),
                    name: charge.name,
                    type: 'flat',
                    amount: charge.amount,
                    method: 'cbm',
                    base: 'cif'
                  });
                }
              });
              renderFees();
              calculate();
            }
            return;
          }
          showParseStatus("No product line items could be detected in this document. Please check the photo or paste rows manually.", false, true);
          showToast("No product rows found", "error");
          return;
        } catch (aiErr) {
          console.warn("AI Vision failed:", aiErr);
          // NEVER silently fall back to offline OCR here. That silent fallback
          // is exactly how a 7-row invoice became 2 garbage rows
          // ("A ; 让 COROLLA JP" qty 1 / "0] VIOS OER or [ec" qty 1009) with a
          // green "Scanned and imported!" success message. Tesseract cannot read
          // this table layout (Picture column, split MIKI NO. like "AE101 99",
          // Remark column like "4L+4R"), so OCR output must be opt-in + reviewed.
          showAiFailureWithOcrOptIn(file, isImg, isPdf, aiErr);
          return;
        }
      };
      reader.readAsDataURL(file);
      return;
    }
    
    runLocalExtraction(file, isImg, isPdf);
  }

  async function runLocalExtraction(file, isImg, isPdf) {
    if (isImg) {
      try {
        showParseStatus(`Analyzing photo with built-in OCR...`, true, false, 0.1);
        const ocrData = await runBrowserOcr(file, p => {
          showParseStatus(p.status, true, false, p.progress);
        });
        const items = parseInvoiceAndPackingListText(ocrData.text || '');
        showOcrReview(items, file.name);
      } catch (err) {
        console.error("Image OCR error:", err);
        showParseStatus(`Image Scan Notice: ${err.message}`, false, true);
      }
      return;
    }
    
    if (isPdf) {
      try {
        showParseStatus(`Extracting tables from PDF...`, true, false, 0.1);
        const pdfText = await runPdfExtraction(file, p => {
          showParseStatus(p.status, true, false, p.progress);
        });
        const items = parseInvoiceAndPackingListText(pdfText);
        showOcrReview(items, file.name);
      } catch (err) {
        console.error("PDF Extraction error:", err);
        showParseStatus(`PDF Parse Error: ${err.message}`, false, true);
      }
      return;
    }
    
    // Excel / CSV Spreadsheets
    showParseStatus(`Reading spreadsheet ${file.name}...`, true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        workbookSheets = {};
        wb.SheetNames.forEach(name => {
          workbookSheets[name] = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '', raw: true });
        });
        
        const sheetSelect = document.getElementById('sheetSelect');
        const sheetPicker = document.getElementById('sheetPicker');
        sheetSelect.innerHTML = '';
        wb.SheetNames.forEach(name => {
          const opt = document.createElement('option');
          opt.value = opt.textContent = name;
          sheetSelect.appendChild(opt);
        });
        
        if (wb.SheetNames.length > 1) sheetPicker.classList.remove('hidden');
        else sheetPicker.classList.add('hidden');
        
        sheetSelect.onchange = () => loadSheet(sheetSelect.value);
        showParseStatus(`Loaded ${file.name} (${wb.SheetNames.length} sheet(s)). Check mapping below.`, false);
        loadSheet(wb.SheetNames[0]);
      } catch(err) {
        showParseStatus(`Error reading Excel file: ${err.message}`, false, true);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  // ==== COLUMN MAPPING & IMPORT (For Spreadsheets) ====
  const KEYWORDS = {
    qty: ['qty','quantity','数量','deliver','pcs','只'],
    price: ['price','unit price','单价','unit/price','amount','rmb'],
    cbm: ['cbm total','cbm(total)','total cbm','cbm','材积','总体积','t/cbm','u/cbm'],
    desc: ['model no','model','item','description','product','part','goods','name','货名','品名','款号','style']
  };

  function scoreHeader(row) {
    return row.reduce((score, cell) => {
      const s = String(cell).toLowerCase().trim();
      if(s) Object.values(KEYWORDS).forEach(list => { if(list.some(k => s.includes(k))) score++; });
      return score;
    }, 0);
  }

  function findHeaderRow(rows) {
    let best = 0, bestScore = -1;
    rows.forEach((r, i) => { const sc = scoreHeader(r); if(sc > bestScore){ bestScore = sc; best = i; } });
    return best;
  }

  function guessColumn(header, kind) {
    for (let i = 0; i < header.length; i++) {
      const s = String(header[i]).toLowerCase().trim();
      if (s && KEYWORDS[kind].some(k => s.includes(k))) return i;
    }
    return -1;
  }

  function loadSheet(name) {
    currentRows = workbookSheets[name] || [];
    currentHeaderRowIdx = findHeaderRow(currentRows);
    buildMappingUI();
  }

  function buildMappingUI() {
    const header = currentRows[currentHeaderRowIdx] || [];
    document.getElementById('headerRowLabel').textContent = currentHeaderRowIdx + 1;
    
    const selects = ['mapQty', 'mapPrice', 'mapCbm'].map(id => document.getElementById(id));
    const descChecks = document.getElementById('descChecks');
    selects.forEach(sel => sel.innerHTML = '');
    descChecks.innerHTML = '';
    
    const guesses = {
      qty: guessColumn(header, 'qty'),
      price: guessColumn(header, 'price'),
      cbm: -1
    };
    
    const guessCbmAll = [];
    header.forEach((c,i) => { if(KEYWORDS.cbm.some(k => String(c).toLowerCase().includes(k))) guessCbmAll.push(i); });
    let cbmTotal = guessCbmAll.find(i => String(header[i]).toLowerCase().includes('total'));
    guesses.cbm = cbmTotal !== undefined ? cbmTotal : (guessCbmAll.length ? guessCbmAll[guessCbmAll.length-1] : -1);
    
    const guessDesc = [];
    header.forEach((c,i) => { if(KEYWORDS.desc.some(k => String(c).toLowerCase().includes(k))) guessDesc.push(i); });
    
    header.forEach((c, i) => {
      const label = String(c).trim() || `Column ${i+1}`;
      selects.forEach(sel => {
        const opt = document.createElement('option');
        opt.value = i; opt.textContent = `${label} (col ${i+1})`;
        sel.appendChild(opt);
      });
      const lbl = document.createElement('label');
      lbl.className = 'flex items-center gap-2 text-sm mb-2';
      lbl.style.cursor = 'pointer';
      lbl.innerHTML = `<input type="checkbox" value="${i}" ${guessDesc.includes(i) ? 'checked' : ''}> ${label}`;
      descChecks.appendChild(lbl);
    });
    
    selects.forEach(sel => {
      const none = document.createElement('option');
      none.value = -1; none.textContent = '-- none --';
      sel.appendChild(none);
    });
    
    selects[0].value = guesses.qty;
    selects[1].value = guesses.price;
    selects[2].value = guesses.cbm;
    
    renderMappingPreview();
    selects.forEach(sel => sel.onchange = renderMappingPreview);
    descChecks.querySelectorAll('input').forEach(cb => cb.onchange = renderMappingPreview);
    
    document.getElementById('mappingPanel').classList.remove('hidden');
    document.getElementById('mappingPanel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function getSelectedDesc() {
    return Array.from(document.querySelectorAll('#descChecks input:checked')).map(cb => parseInt(cb.value));
  }

  function extractDataRows() {
    const qIdx = parseInt(document.getElementById('mapQty').value);
    const pIdx = parseInt(document.getElementById('mapPrice').value);
    const cIdx = parseInt(document.getElementById('mapCbm').value);
    const dIdx = getSelectedDesc();
    
    const out = [];
    for(let r = currentHeaderRowIdx + 1; r < currentRows.length; r++) {
      const row = currentRows[r];
      if(!row || !row.length) continue;
      
      const firstCell = String(row[0] || '').trim().toLowerCase();
      if(/^(total|subtotal|grand total|合计|总计|小计)\b/i.test(firstCell)) break; // stop row
      
      const qty = qIdx >= 0 ? parseFloat(String(row[qIdx] ?? '').replace(/[^0-9.\-]/g,'')) : NaN;
      const price = pIdx >= 0 ? parseFloat(String(row[pIdx] ?? '').replace(/[^0-9.\-]/g,'')) : NaN;
      const cbm = cIdx >= 0 ? parseFloat(String(row[cIdx] ?? '').replace(/[^0-9.\-]/g,'')) : NaN;
      const desc = dIdx.map(i => String(row[i] || '').trim()).filter(Boolean).join(' - ');
      
      if (!desc && !(qty > 0) && !(price > 0)) continue;
      if (!(qty > 0) && !(price > 0)) continue;
      
      out.push({ desc, qty: isFinite(qty)?qty:0, price: isFinite(price)?price:0, cbm: isFinite(cbm)?cbm:0 });
    }
    return out;
  }

  function renderMappingPreview() {
    const rows = extractDataRows();
    const table = document.getElementById('mappingPreviewTable');
    let html = '<thead><tr><th>Description</th><th class="num">Qty</th><th class="num">Price</th><th class="num">CBM</th></tr></thead><tbody>';
    rows.slice(0, 3).forEach(r => {
      html += `<tr><td>${escapeHtml(r.desc||'-')}</td><td class="num">${r.qty}</td><td class="num">${r.price}</td><td class="num">${r.cbm}</td></tr>`;
    });
    html += '</tbody>';
    table.innerHTML = html;
    document.getElementById('mappingNote').textContent = `${rows.length} valid item rows found`;
  }

  document.getElementById('confirmImportBtn').onclick = () => {
    const rows = extractDataRows();
    if(!rows.length) { showToast("No items mapped. Please adjust columns.", "error"); return; }
    
    rows.forEach(r => current.items.push({ id: 'it'+(current.itemSeq++), ...r }));
    document.getElementById('mappingPanel').classList.add('hidden');
    showToast(`Imported ${rows.length} items from spreadsheet`);
    renderItems();
    calculate();
    debouncedSave();
    
    const tableWrap = document.getElementById('itemsTableWrap');
    if (tableWrap) {
      tableWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  document.getElementById('cancelImportBtn').onclick = () => {
    document.getElementById('mappingPanel').classList.add('hidden');
  };

  const aiConfirmBtn = document.getElementById('aiConfirmImportBtn');
  if (aiConfirmBtn) aiConfirmBtn.onclick = confirmAiImport;
  const aiCancelBtn = document.getElementById('aiCancelImportBtn');
  if (aiCancelBtn) aiCancelBtn.onclick = cancelAiImport;

  // Paste logic
  document.getElementById('parseBtn').onclick = () => {
    const raw = document.getElementById('pasteBox').value;
    if(!raw.trim()) return;
    let lines = raw.split('\n').map(l=>l.trim()).filter(Boolean);
    if(document.getElementById('hasHeader').checked && lines.length) lines = lines.slice(1);
    
    let added = 0;
    lines.forEach(line => {
      const parts = line.split(/\t|,(?![^()]*\))/).map(p=>p.trim());
      if(parts.length < 2) return;
      const desc = parts[0] || '';
      const qty = parseFloat((parts[1]||'').replace(/[^0-9.\-]/g,'')) || 0;
      const price = parseFloat((parts[2]||'').replace(/[^0-9.\-]/g,'')) || 0;
      const cbm = parseFloat((parts[3]||'').replace(/[^0-9.\-]/g,'')) || 0;
      if(!desc) return;
      current.items.push({ id: 'it'+(current.itemSeq++), desc, qty, price, cbm });
      added++;
    });
    
    if(added) {
      document.getElementById('pasteBox').value = '';
      showToast(`Pasted ${added} items`);
      renderItems();
      debouncedSave();
    } else {
      showToast("Could not parse rows. Check format.", "error");
    }
  };

  // ==== INIT ====
  loadState();

})();