(function(){
  // ==== STATE MANAGEMENT ====
  let state = {
    history: {}, // id -> shipment data
    currentId: null,
    apiKey: localStorage.getItem('landed-cost-anthropic-key') || ''
  };

  const DEFAULT_SHIPMENT = () => ({
    name: 'New Shipment ' + new Date().toLocaleDateString(),
    route: { origin: 'GUANGZHOU', port: 'COLOMBO', dest: 'MATARA' },
    baseCurrency: 'RMB', // RMB or USD
    exRate: '',
    cbmRate: '',
    items: [],
    fees: [
      { id: 'fe1', name: 'Customs Duty', type: 'percent', amount: 15, method: 'cbm', base: 'cif' },
      { id: 'fe2', name: 'Colombo-Matara Transport', type: 'flat', amount: 35000, method: 'cbm', base: 'cif' },
      { id: 'fe3', name: 'Clearing Agent', type: 'flat', amount: 15000, method: 'value', base: 'cif' }
    ],
    itemSeq: 1,
    feeSeq: 4,
    lastSaved: Date.now()
  });

  let current = null;
  let undoStack = []; // For items clear undo

  // ==== UTILITIES ====
  const fmt = n => isFinite(n) ? Math.round(n).toLocaleString('en-LK') : '0';
  const fmt2 = n => isFinite(n) ? n.toFixed(2) : '0.00';
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
      const saved = localStorage.getItem('landed-cost-v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        state.history = parsed.history || {};
        state.currentId = parsed.currentId;
      }
    } catch (e) { console.error("Could not load state", e); }

    if (!state.currentId || !state.history[state.currentId]) {
      const id = generateId();
      state.currentId = id;
      state.history[id] = DEFAULT_SHIPMENT();
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
    current.baseCurrency = document.getElementById('baseCurrency').value;
    current.exRate = parseFloat(document.getElementById('exRate').value) || 0;
    current.cbmRate = parseFloat(document.getElementById('cbmRate').value) || 0;
    
    state.history[state.currentId] = current;
    try {
      localStorage.setItem('landed-cost-v2', JSON.stringify({ history: state.history, currentId: state.currentId }));
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
    const id = generateId();
    state.currentId = id;
    state.history[id] = DEFAULT_SHIPMENT();
    populateUI();
    showToast("New shipment created");
  }

  function renderHistory() {
    const list = document.getElementById('historyList');
    list.innerHTML = '';
    const sortedIds = Object.keys(state.history).sort((a,b) => state.history[b].lastSaved - state.history[a].lastSaved);
    
    sortedIds.forEach(id => {
      const ship = state.history[id];
      const div = document.createElement('div');
      div.className = `history-item ${id === state.currentId ? 'active' : ''}`;
      const totalItems = ship.items.length;
      const dateStr = new Date(ship.lastSaved).toLocaleDateString();
      div.innerHTML = `
        <div class="history-name">${escapeHtml(ship.name)}</div>
        <div class="history-meta">${totalItems} items · ${dateStr}</div>
      `;
      div.onclick = () => { if(id !== state.currentId) switchShipment(id); };
      list.appendChild(div);
    });
  }

  // ==== UI POPULATION ====
  function populateUI() {
    document.getElementById('shipmentName').value = current.name || '';
    document.getElementById('routeOrigin').value = current.route.origin || '';
    document.getElementById('routePort').value = current.route.port || '';
    document.getElementById('routeDest').value = current.route.dest || '';
    document.getElementById('baseCurrency').value = current.baseCurrency || 'RMB';
    document.getElementById('exRate').value = current.exRate || '';
    document.getElementById('cbmRate').value = current.cbmRate || '';
    
    updateCurrencyLabels();
    renderItems();
    renderFees();
  }

  function updateCurrencyLabels() {
    const curr = document.getElementById('baseCurrency').value;
    const sym = curr === 'USD' ? '$' : '¥';
    document.getElementById('ratePrefix').textContent = `${sym}1 = `;
    // Update table headers
    const ths = document.querySelectorAll('#itemsTable th');
    if(ths.length > 5) ths[3].textContent = `Unit Price (${curr})`;
    if(ths.length > 5) ths[5].textContent = `Value (${curr})`;
  }

  document.getElementById('baseCurrency').onchange = (e) => {
    current.baseCurrency = e.target.value;
    updateCurrencyLabels();
    calculate();
    debouncedSave();
  };

  ['shipmentName', 'routeOrigin', 'routePort', 'routeDest', 'exRate', 'cbmRate'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => { calculate(); debouncedSave(); });
  });

  document.getElementById('newShipmentBtn').onclick = newShipment;

  // ==== ITEMS MANAGEMENT ====
  function renderItems() {
    const body = document.getElementById('itemsBody');
    const empty = document.getElementById('itemsEmpty');
    body.innerHTML = '';
    
    document.getElementById('itemCount').textContent = current.items.length;
    empty.style.display = current.items.length ? 'none' : 'block';
    
    current.items.forEach((it, idx) => {
      const tr = document.createElement('tr');
      const val = it.qty * it.price;
      const sym = current.baseCurrency === 'USD' ? '$' : '¥';
      
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
        const sym = current.baseCurrency === 'USD' ? '$' : '¥';
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

  document.getElementById('addRowBtn').onclick = () => {
    current.items.push({ id: 'it'+(current.itemSeq++), desc: '', qty: 0, price: 0, cbm: 0 });
    renderItems();
    debouncedSave();
  };

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

  // ==== FEES MANAGEMENT ====
  function renderFees() {
    const body = document.getElementById('feesBody');
    body.innerHTML = '';
    
    current.fees.forEach((fe) => {
      const row = document.createElement('div');
      row.className = 'fee-item';
      row.innerHTML = `
        <div class="input-field" style="margin:0;"><input type="text" data-field="name" data-id="${fe.id}" value="${escapeAttr(fe.name)}" placeholder="Fee name"></div>
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
          <button class="btn-ghost btn-icon" data-remove-fee="${fe.id}" title="Remove">✕</button>
        </div>
      `;
      body.appendChild(row);
      
      const basisSlot = row.querySelector(`[data-basis-for="${fe.id}"]`);
      if (fe.type === 'flat'){
        basisSlot.innerHTML = `
          <div class="input-field" style="margin:0;">
            <select data-field="method" data-id="${fe.id}">
              <option value="cbm" ${fe.method==='cbm'?'selected':''}>CBM Share</option>
              <option value="value" ${fe.method==='value'?'selected':''}>Value Share</option>
              <option value="equal" ${fe.method==='equal'?'selected':''}>Equally</option>
            </select>
          </div>`;
      } else {
        basisSlot.innerHTML = `
          <div class="input-field" style="margin:0;">
            <select data-field="base" data-id="${fe.id}">
              <option value="value" ${fe.base==='value'?'selected':''}>Goods Value</option>
              <option value="cif" ${fe.base==='cif'?'selected':''}>Value + Freight (CIF)</option>
              <option value="running" ${fe.base==='running'?'selected':''}>Running Total</option>
            </select>
          </div>`;
      }
    });
    bindFeeInputs();
    calculate();
  }

  function bindFeeInputs() {
    document.querySelectorAll('#feesBody input, #feesBody select').forEach(inp => {
      inp.onchange = inp.oninput = (e) => {
        const id = e.target.getAttribute('data-id');
        const field = e.target.getAttribute('data-field');
        const fe = current.fees.find(f => f.id === id);
        if (!fe) return;
        
        if (field === 'name') fe.name = e.target.value;
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
      };
    });
  }

  function newFee(name, type, amount, method, base) {
    return { id: 'fe'+(current.feeSeq++), name: name||'', type: type||'flat', amount: amount||0, method: method||'cbm', base: base||'cif' };
  }

  document.getElementById('addFeeBtn').onclick = () => {
    current.fees.push(newFee('', 'flat', 0, 'cbm', 'cif'));
    renderFees();
    debouncedSave();
  };

  document.querySelectorAll('[data-preset]').forEach(btn => {
    btn.onclick = () => {
      const p = btn.getAttribute('data-preset');
      if (p === 'duty') current.fees.push(newFee('Customs Duty', 'percent', 15, 'cbm', 'cif'));
      if (p === 'vat') current.fees.push(newFee('VAT', 'percent', 18, 'cbm', 'running'));
      if (p === 'transport') current.fees.push(newFee('Local Transport', 'flat', 35000, 'cbm', 'cif'));
      if (p === 'agent') current.fees.push(newFee('Clearing Agent', 'flat', 15000, 'value', 'cif'));
      renderFees();
      debouncedSave();
      showToast("Fee added");
    };
  });

  // ==== CALCULATIONS ====
  // State for animations
  let lastTotals = { cbm: 0, value: 0, freight: 0, fees: 0, total: 0 };

  function calculate() {
    if (!current) return;
    
    const exRate = parseFloat(document.getElementById('exRate').value) || 0;
    const cbmRate = parseFloat(document.getElementById('cbmRate').value) || 0;
    const markupPct = parseFloat(document.getElementById('markupPercent').value) || 0;
    
    const totalCBM = current.items.reduce((s,i) => s + (parseFloat(i.cbm)||0), 0);
    const totalValueBase = current.items.reduce((s,i) => s + (i.qty * i.price), 0);
    const totalValueLKR = totalValueBase * exRate;
    const freightTotal = totalCBM * cbmRate;

    const perItem = current.items.map(it => {
      const valueLKR = it.qty * it.price * exRate;
      const freightShare = totalCBM > 0 ? (it.cbm/totalCBM) * freightTotal : 0;
      return { it, valueLKR, freightShare, feesShare: 0, running: valueLKR + freightShare };
    });

    current.fees.forEach(fe => {
      if (fe.type === 'flat'){
        perItem.forEach(row => {
          let share = 0;
          if (fe.method === 'cbm') share = totalCBM > 0 ? (row.it.cbm/totalCBM) * fe.amount : 0;
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

    renderResults(perItem, totalCBM, totalValueLKR, freightTotal, grandFees, grandTotal, sumQty, markupPct);
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
    body.innerHTML = '';
    
    perItem.forEach(row => {
      const unitCost = row.it.qty > 0 ? row.running / row.it.qty : 0;
      const targetSell = unitCost * (1 + markupPct/100);
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight:600;">${escapeHtml(row.it.desc || '(untitled)')}</td>
        <td class="num">${row.it.qty}</td>
        <td class="num mono text-muted">${fmt(row.valueLKR)}</td>
        <td class="num mono text-muted">${fmt(row.freightShare)}</td>
        <td class="num mono text-muted">${fmt(row.feesShare)}</td>
        <td class="num mono" style="font-weight:700; font-size:14px;">${fmt(unitCost)}</td>
        <td class="num mono" style="font-weight:700; color:var(--success); font-size:14px;">${fmt(targetSell)}</td>
      `;
      body.appendChild(tr);
    });

    document.getElementById('footQty').textContent = tQty;
    document.getElementById('footValue').textContent = fmt(tVal);
    document.getElementById('footFreight').textContent = fmt(tFr);
    document.getElementById('footCharges').textContent = fmt(tFee);
  }

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
      document.getElementById('tab-' + tab.getAttribute('data-tab')).classList.add('active');
    };
  });

  document.getElementById('setApiKeyBtn').onclick = () => {
    document.getElementById('apiKeyInput').value = state.apiKey;
    document.getElementById('apiKeyPanel').classList.remove('hidden');
  };
  document.getElementById('cancelApiKeyBtn').onclick = () => {
    document.getElementById('apiKeyPanel').classList.add('hidden');
  };
  document.getElementById('saveApiKeyBtn').onclick = () => {
    state.apiKey = document.getElementById('apiKeyInput').value.trim();
    if(state.apiKey) localStorage.setItem('landed-cost-anthropic-key', state.apiKey);
    else localStorage.removeItem('landed-cost-anthropic-key');
    document.getElementById('apiKeyPanel').classList.add('hidden');
    refreshApiKeyStatus();
    showToast("API Key saved");
  };

  function refreshApiKeyStatus() {
    const setBtn = document.getElementById('setApiKeyBtn');
    if (setBtn) {
      setBtn.innerHTML = state.apiKey ? '⚙ Key Configured' : '⚙ Photo Scanner Key';
    }
  }
  refreshApiKeyStatus();

  // Dropzone & File parsing
  let workbookSheets = {};
  let currentRows = [];
  let currentHeaderRowIdx = 0;

  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const parseStatusText = document.getElementById('parseStatusText');
  const parseStatusDiv = document.getElementById('parseStatus');
  const parseSpinner = document.getElementById('parseSpinner');

  dropzone.onclick = () => fileInput.click();
  ['dragenter','dragover'].forEach(evt => dropzone.addEventListener(evt, e => { e.preventDefault(); dropzone.classList.add('dragover'); }));
  ['dragleave','drop'].forEach(evt => dropzone.addEventListener(evt, e => { e.preventDefault(); dropzone.classList.remove('dragover'); }));
  dropzone.addEventListener('drop', e => { const f = e.dataTransfer.files?.[0]; if(f) handleFile(f); });
  fileInput.onchange = e => { const f = e.target.files?.[0]; if(f) handleFile(f); };

  function showParseStatus(msg, loading = false, error = false) {
    parseStatusDiv.classList.remove('hidden');
    parseStatusText.textContent = msg;
    parseStatusText.style.color = error ? 'var(--danger)' : 'var(--primary)';
    if(loading) parseSpinner.classList.remove('hidden');
    else parseSpinner.classList.add('hidden');
  }

  function handleFile(file) {
    const isImg = /^image\//.test(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name);
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    if(isImg) { handleClaudeFile(file, 'image'); return; }
    if(isPdf) { handleClaudeFile(file, 'pdf'); return; }
    
    showParseStatus(`Reading ${file.name}...`, true);
    document.getElementById('mappingPanel').classList.add('hidden');
    
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
        showParseStatus(`Parsed ${file.name} - ${wb.SheetNames.length} sheet(s) found.`, false);
        loadSheet(wb.SheetNames[0]);
      } catch(err) {
        showParseStatus(`Error reading file: ${err.message}`, false, true);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function callClaude(base64, mediaType, isPdf) {
    if (!state.apiKey) throw new Error("To read photos or PDFs, please enter your Anthropic API key below.");
    
    const prompt = `This ${isPdf?'PDF':'image'} shows a packing list or commercial invoice for a shipment of goods from China. 
Extract every product line item (ignore header rows, packing-configuration sub-rows, and the Total summary row). 
For each item give: description (combine the item code and item name), qty (total quantity), unitPrice (unit price in numbers), and cbmTotal (TOTAL or combined volume for that whole line item in CBM - use a column labelled like T/CBM or Total CBM). 
Respond with ONLY valid JSON: {"items":[{"description":"","qty":0,"unitPrice":0,"cbmTotal":0}]}`;

    const source = isPdf 
      ? { type: 'base64', media_type: 'application/pdf', data: base64 }
      : { type: 'base64', media_type: mediaType, data: base64 };
      
    const block = isPdf ? { type: 'document', source } : { type: 'image', source };

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': state.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20240620', // Upgraded model for better results
        max_tokens: 2000,
        messages: [{ role: 'user', content: [block, { type: 'text', text: prompt }] }]
      })
    });
    
    if (!resp.ok) {
      if(resp.status === 401) throw new Error("API Key rejected. Please check it.");
      const err = await resp.json().catch(()=>({}));
      throw new Error(err?.error?.message || `Request failed (${resp.status})`);
    }
    return await resp.json();
  }

  function handleClaudeFile(file, type) {
    showParseStatus(`Analyzing with Claude Vision (this takes a few seconds)...`, true);
    document.getElementById('mappingPanel').classList.add('hidden');
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const base64 = e.target.result.split(',')[1];
        const data = await callClaude(base64, file.type || 'image/jpeg', type === 'pdf');
        
        const textBlock = (data.content || []).map(b => b.text || '').join('\n');
        const clean = textBlock.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(clean);
        const rows = (parsed.items || []).filter(it => it && (it.qty > 0 || it.unitPrice > 0));
        
        if (!rows.length) throw new Error("No line items found.");
        
        currentRows = [
          ['Description','Qty','Unit Price','CBM'],
          ...rows.map(it => [it.description || '', it.qty || 0, it.unitPrice || 0, it.cbmTotal || 0])
        ];
        currentHeaderRowIdx = 0;
        showParseStatus(`Read ${rows.length} items from ${file.name}. Check mapping below.`, false);
        buildMappingUI();
      } catch(err) {
        showParseStatus(err.message, false, true);
        if(err.message.includes("API Key")) {
          document.getElementById('apiKeyPanel').classList.remove('hidden');
        }
      }
    };
    reader.readAsDataURL(file);
  }

  // Auto-mapping Logic
  const KEYWORDS = {
    qty: ['qty','quantity','数量'],
    price: ['price','unit price','单价'],
    cbm: ['cbm total','cbm(total)','total cbm','cbm','材积'],
    desc: ['model no','model','item','description','product','part','goods','name','货名']
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
      if(!row) continue;
      const joined = row.join(' ').toLowerCase();
      if(/\btotal\b|\bsubtotal\b|合计|唛头/.test(joined)) break; // stop row
      
      const qty = qIdx >= 0 ? parseFloat(String(row[qIdx]).replace(/[^0-9.\-]/g,'')) : NaN;
      const price = pIdx >= 0 ? parseFloat(String(row[pIdx]).replace(/[^0-9.\-]/g,'')) : NaN;
      const cbm = cIdx >= 0 ? parseFloat(String(row[cIdx]).replace(/[^0-9.\-]/g,'')) : NaN;
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
    showToast(`Imported ${rows.length} items`);
    renderItems();
    debouncedSave();
  };

  document.getElementById('cancelImportBtn').onclick = () => {
    document.getElementById('mappingPanel').classList.add('hidden');
  };

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