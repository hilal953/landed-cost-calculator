export interface Item {
  id: string;
  desc: string;
  qty: number;
  price: number;
  cbm: number;
}

export interface Fee {
  id: string;
  name: string;
  type: 'flat' | 'percent';
  amount: number;
  method: 'cbm' | 'value' | 'equal';
  base: 'cif' | 'value' | 'running';
}

export interface ShipmentData {
  items: Item[];
  fees: Fee[];
  baseCurrency: string;
  exRate: number;
  cbmRate: number;
  freightCurrency: string;
  cargoMode: 'sea' | 'air';
  usdToLkr: number;
  markupPct: number;
}

export interface CalculationResult {
  perItem: PerItemResult[];
  totals: Totals;
  billableMeasure: number;
  totalMeasure: number;
}

export interface PerItemResult {
  item: Item;
  valueLKR: number;
  freightShare: number;
  feesShare: number;
  running: number;
  unitCost: number;
  targetSell: number;
  profitPerUnit: number;
  batchTotalLanded: number;
  batchTotalRevenue: number;
  batchTotalProfit: number;
  unitGoodsLKR: number;
  unitFreightLKR: number;
  unitFeesLKR: number;
  goodsPct: number;
  freightPct: number;
  feesPct: number;
}

export interface Totals {
  totalMeasure: number;
  billableMeasure: number;
  totalValueLKR: number;
  freightTotal: number;
  grandFees: number;
  grandTotal: number;
  sumQty: number;
  markupTotal: number;
}

/**
 * Pure calculation function - no side effects, no DOM dependencies
 * All inputs validated, all outputs deterministic
 */
export function calculateLandedCost(data: ShipmentData): CalculationResult {
  // Input validation with guards against NaN/Infinity
  const exRate = validateNumber(data.exRate, 0, 10000);
  const cbmRate = validateNumber(data.cbmRate, 0, 10000000);
  const markupPct = validateNumber(data.markupPct, 0, 1000);
  const usdToLkr = validateNumber(data.usdToLkr, 0, 10000);

  const cargoMode = data.cargoMode || 'sea';
  const fCurr = data.freightCurrency || 'LKR';

  // Calculate total measure (CBM or Kg) with rounding for air
  let totalMeasure = 0;
  const itemMeasures = data.items.map(item => {
    const m = validateNumber(item.cbm, 0, 1000000);
    totalMeasure += m;
    return m;
  });

  const billableMeasure = cargoMode === 'air' ? Math.ceil(totalMeasure) : totalMeasure;

  const totalValueBase = data.items.reduce((sum, item) => sum + (validateNumber(item.qty, 0, 1000000) * validateNumber(item.price, 0, 100000000)), 0);
  const totalValueLKR = totalValueBase * exRate;

  // Convert freight if quoted in USD
  let effFreightLkrPerUnit = cbmRate;
  if (fCurr === 'USD') {
    const convRate = data.baseCurrency === 'USD' ? (exRate || usdToLkr) : usdToLkr;
    effFreightLkrPerUnit = cbmRate * convRate;
  }
  const freightTotal = billableMeasure * effFreightLkrPerUnit;

  const perItem: PerItemResult[] = data.items.map((item, idx) => {
    const qty = validateNumber(item.qty, 0, 1000000);
    const price = validateNumber(item.price, 0, 100000000);
    const valueLKR = qty * price * exRate;
    const measure = itemMeasures[idx];
    const freightShare = totalMeasure > 0 ? (measure / totalMeasure) * freightTotal : 0;
    return { 
      item, 
      valueLKR, 
      freightShare, 
      feesShare: 0, 
      running: valueLKR + freightShare,
      unitCost: 0,
      targetSell: 0,
      profitPerUnit: 0,
      batchTotalLanded: 0,
      batchTotalRevenue: 0,
      batchTotalProfit: 0,
      unitGoodsLKR: 0,
      unitFreightLKR: 0,
      unitFeesLKR: 0,
      goodsPct: 0,
      freightPct: 0,
      feesPct: 0
    };
  });

  // Apply fees
  data.fees.forEach(fee => {
    if (fee.type === 'flat') {
      perItem.forEach((row, idx) => {
        let share = 0;
        if (fee.method === 'cbm') {
          const measure = itemMeasures[idx];
          share = totalMeasure > 0 ? (measure / totalMeasure) * fee.amount : 0;
        } else if (fee.method === 'value') {
          share = totalValueLKR > 0 ? (row.valueLKR / totalValueLKR) * fee.amount : 0;
        } else {
          share = perItem.length > 0 ? fee.amount / perItem.length : 0;
        }
        row.feesShare += share;
        row.running += share;
      });
    } else {
      perItem.forEach(row => {
        let base = row.valueLKR;
        if (fee.base === 'cif') base = row.valueLKR + row.freightShare;
        else if (fee.base === 'running') base = row.running;
        
        const amt = base * (fee.amount / 100);
        row.feesShare += amt;
        row.running += amt;
      });
    }
  });

  // Calculate derived values
  let grandTotal = 0, grandFees = 0, sumQty = 0;
  perItem.forEach(row => {
    grandTotal += row.running;
    grandFees += row.feesShare;
    sumQty += row.item.qty;
  });

  // Calculate per-item derived values
  perItem.forEach(row => {
    const qty = row.item.qty;
    row.unitCost = qty > 0 ? row.running / qty : 0;
    row.targetSell = row.unitCost * (1 + markupPct / 100);
    row.profitPerUnit = row.targetSell - row.unitCost;
    row.batchTotalLanded = row.running;
    row.batchTotalRevenue = row.targetSell * qty;
    row.batchTotalProfit = row.profitPerUnit * qty;
    row.unitGoodsLKR = qty > 0 ? row.valueLKR / qty : 0;
    row.unitFreightLKR = qty > 0 ? row.freightShare / qty : 0;
    row.unitFeesLKR = qty > 0 ? row.feesShare / qty : 0;

    // Cost composition percentages
    const batchTotal = row.batchTotalLanded;
    if (batchTotal > 0) {
      row.goodsPct = Math.round((row.valueLKR / batchTotal) * 100);
      row.freightPct = Math.round((row.freightShare / batchTotal) * 100);
      row.feesPct = Math.max(0, 100 - row.goodsPct - row.freightPct);
      if (row.goodsPct + row.freightPct + row.feesPct === 0) row.goodsPct = 100;
    } else {
      row.goodsPct = 100;
      row.freightPct = 0;
      row.feesPct = 0;
    }
  });

  return {
    perItem,
    totals: {
      totalMeasure,
      billableMeasure,
      totalValueLKR,
      freightTotal,
      grandFees,
      grandTotal,
      sumQty,
      markupTotal: grandTotal * (1 + markupPct / 100)
    },
    billableMeasure,
    totalMeasure
  };
}

function validateNumber(value: number, min: number, max: number): number {
  if (!isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * Format number for display
 */
export function fmt(n: number): string {
  return isFinite(n) ? Math.round(n).toLocaleString('en-US') : '0';
}

export function fmt2(n: number): string {
  return isFinite(n) ? Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';
}

export function fmtCbm(n: number): string {
  return isFinite(n) ? Number(n).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) : '0.000';
}