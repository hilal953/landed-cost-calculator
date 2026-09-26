import { describe, it, expect } from 'vitest';
import { calculateLandedCost, type ShipmentData, type Item, type Fee } from './calculations';

const createBaseItem = (overrides: Partial<Item> = {}): Item => ({
  id: 'it1',
  desc: 'Test Item',
  qty: 10,
  price: 100,
  cbm: 0.5,
  ...overrides
});

const createBaseFee = (overrides: Partial<Fee> = {}): Fee => ({
  id: 'fe1',
  name: 'Test Fee',
  type: 'flat',
  amount: 1000,
  method: 'cbm',
  base: 'cif',
  ...overrides
});

const createBaseShipment = (overrides: Partial<ShipmentData> = {}): ShipmentData => ({
  items: [createBaseItem()],
  fees: [],
  baseCurrency: 'USD',
  exRate: 300,
  cbmRate: 100,
  freightCurrency: 'LKR',
  cargoMode: 'sea',
  usdToLkr: 300,
  markupPct: 30,
  ...overrides
});

describe('calculateLandedCost', () => {
  describe('Basic sea freight calculation', () => {
    it('calculates correctly with single item, no fees', () => {
      const data = createBaseShipment({
        items: [createBaseItem({ qty: 10, price: 100, cbm: 1 })],
        cbmRate: 100,
        exRate: 300,
      });

      const result = calculateLandedCost(data);

      expect(result.totals.totalMeasure).toBe(1);
      expect(result.totals.billableMeasure).toBe(1);
      expect(result.totals.totalValueLKR).toBe(300000); // 10 * 100 * 300
      expect(result.totals.freightTotal).toBe(100); // 1 * 100
      expect(result.totals.grandTotal).toBe(300100);
      expect(result.perItem[0].unitCost).toBe(30010); // 300100 / 10
      expect(result.perItem[0].targetSell).toBe(39013); // 30010 * 1.3
    });
  });

  describe('Air cargo Kg rounding', () => {
    it('rounds up fractional Kg for air cargo', () => {
      const data = createBaseShipment({
        items: [
          createBaseItem({ qty: 5, price: 100, cbm: 2.1 }), // 2.1 Kg
          createBaseItem({ qty: 3, price: 200, cbm: 1.3 }), // 1.3 Kg
        ],
        cargoMode: 'air',
        cbmRate: 500,
        exRate: 300,
      });

      const result = calculateLandedCost(data);

      // Total = 3.4 Kg, billable = ceil(3.4) = 4 Kg
      expect(result.totals.totalMeasure).toBeCloseTo(3.4);
      expect(result.totals.billableMeasure).toBe(4);
      expect(result.totals.freightTotal).toBe(2000); // 4 * 500
    });

    it('does not round for sea cargo', () => {
      const data = createBaseShipment({
        items: [createBaseItem({ qty: 10, price: 100, cbm: 2.7 })],
        cargoMode: 'sea',
        cbmRate: 100,
        exRate: 300,
      });

      const result = calculateLandedCost(data);

      expect(result.totals.totalMeasure).toBe(2.7);
      expect(result.totals.billableMeasure).toBe(2.7);
      expect(result.totals.freightTotal).toBe(270); // 2.7 * 100
    });
  });

  describe('Freight currency conversion', () => {
    it('converts USD freight to LKR using exRate when base is USD', () => {
      const data = createBaseShipment({
        items: [createBaseItem({ qty: 10, price: 100, cbm: 1 })],
        baseCurrency: 'USD',
        freightCurrency: 'USD',
        cbmRate: 2, // $2 per CBM
        exRate: 300,
        usdToLkr: 300,
      });

      const result = calculateLandedCost(data);

      // $2 * 300 = 600 LKR per CBM
      expect(result.totals.freightTotal).toBe(600);
    });

    it('converts USD freight to LKR using usdToLkr when base is not USD', () => {
      const data = createBaseShipment({
        items: [createBaseItem({ qty: 10, price: 100, cbm: 1 })],
        baseCurrency: 'RMB',
        freightCurrency: 'USD',
        cbmRate: 2, // $2 per CBM
        exRate: 45,
        usdToLkr: 300,
      });

      const result = calculateLandedCost(data);

      // $2 * 300 = 600 LKR per CBM (uses usdToLkr, not exRate)
      expect(result.totals.freightTotal).toBe(600);
    });
  });

  describe('Percent fees - CIF base', () => {
    it('applies percent fee on value + freight (CIF)', () => {
      const data = createBaseShipment({
        items: [createBaseItem({ qty: 10, price: 100, cbm: 1 })],
        fees: [createBaseFee({ type: 'percent', amount: 10, base: 'cif' })],
        cbmRate: 100,
        exRate: 300,
      });

      const result = calculateLandedCost(data);

      // Value = 300,000, Freight = 100, CIF = 300,100
      // Fee = 300,100 * 10% = 30,010
      expect(result.perItem[0].feesShare).toBe(30010);
      expect(result.totals.grandFees).toBe(30010);
      expect(result.totals.grandTotal).toBe(330110);
    });
  });

  describe('Percent fees - Value base', () => {
    it('applies percent fee on goods value only', () => {
      const data = createBaseShipment({
        items: [createBaseItem({ qty: 10, price: 100, cbm: 1 })],
        fees: [createBaseFee({ type: 'percent', amount: 10, base: 'value' })],
        cbmRate: 100,
        exRate: 300,
      });

      const result = calculateLandedCost(data);

      // Value = 300,000
      // Fee = 300,000 * 10% = 30,000
      expect(result.perItem[0].feesShare).toBe(30000);
      expect(result.totals.grandFees).toBe(30000);
    });
  });

  describe('Percent fees - Running (compounding) base', () => {
    it('applies percent fee on running total (compounds)', () => {
      const data = createBaseShipment({
        items: [createBaseItem({ qty: 10, price: 100, cbm: 1 })],
        fees: [
          createBaseFee({ id: 'fe1', type: 'percent', amount: 10, base: 'cif' }), // 10% on CIF
          createBaseFee({ id: 'fe2', type: 'percent', amount: 10, base: 'running' }), // 10% on running
        ],
        cbmRate: 100,
        exRate: 300,
      });

      const result = calculateLandedCost(data);

      // First fee: 10% on CIF (300,100) = 30,010
      // Running after first: 330,110
      // Second fee: 10% on running (330,110) = 33,011
      // Total fees = 63,021
      expect(result.totals.grandFees).toBe(63021);
      expect(result.totals.grandTotal).toBe(363121);
    });
  });

  describe('Flat fees - By CBM', () => {
    it('distributes flat fee proportionally by CBM', () => {
      const data = createBaseShipment({
        items: [
          createBaseItem({ id: 'it1', qty: 10, price: 100, cbm: 1 }),
          createBaseItem({ id: 'it2', qty: 5, price: 200, cbm: 2 }),
        ],
        fees: [createBaseFee({ type: 'flat', amount: 3000, method: 'cbm' })],
        cbmRate: 100,
        exRate: 300,
      });

      const result = calculateLandedCost(data);

      // Total CBM = 3, Item1 = 1/3, Item2 = 2/3
      // Fee = 3000
      // Item1 share = 1000, Item2 share = 2000
      expect(result.perItem[0].feesShare).toBe(1000);
      expect(result.perItem[1].feesShare).toBe(2000);
    });
  });

  describe('Flat fees - By Value', () => {
    it('distributes flat fee proportionally by item value', () => {
      const data = createBaseShipment({
        items: [
          createBaseItem({ id: 'it1', qty: 10, price: 100, cbm: 1 }), // value = 1000
          createBaseItem({ id: 'it2', qty: 5, price: 200, cbm: 2 }), // value = 1000
        ],
        fees: [createBaseFee({ type: 'flat', amount: 2000, method: 'value' })],
        cbmRate: 100,
        exRate: 300,
      });

      const result = calculateLandedCost(data);

      // Total value = 2000, each item = 1000 (50%)
      // Fee = 2000, each gets 1000
      expect(result.perItem[0].feesShare).toBe(1000);
      expect(result.perItem[1].feesShare).toBe(1000);
    });
  });

  describe('Flat fees - Equal per item', () => {
    it('distributes flat fee equally per item', () => {
      const data = createBaseShipment({
        items: [
          createBaseItem({ id: 'it1', qty: 10, price: 100, cbm: 1 }),
          createBaseItem({ id: 'it2', qty: 5, price: 200, cbm: 2 }),
          createBaseItem({ id: 'it3', qty: 1, price: 1000, cbm: 0.5 }),
        ],
        fees: [createBaseFee({ type: 'flat', amount: 3000, method: 'equal' })],
        cbmRate: 100,
        exRate: 300,
      });

      const result = calculateLandedCost(data);

      // 3 items, 3000 / 3 = 1000 each
      expect(result.perItem[0].feesShare).toBe(1000);
      expect(result.perItem[1].feesShare).toBe(1000);
      expect(result.perItem[2].feesShare).toBe(1000);
    });
  });

  describe('Multiple items with mixed fees', () => {
    it('calculates correctly with multiple items and mixed fee types', () => {
      const data = createBaseShipment({
        items: [
          createBaseItem({ id: 'it1', desc: 'Item A', qty: 10, price: 100, cbm: 1 }),
          createBaseItem({ id: 'it2', desc: 'Item B', qty: 5, price: 200, cbm: 2 }),
        ],
        fees: [
          createBaseFee({ id: 'fe1', name: 'Customs Duty', type: 'percent', amount: 15, method: 'cbm', base: 'cif' }),
          createBaseFee({ id: 'fe2', name: 'Transport', type: 'flat', amount: 5000, method: 'cbm', base: 'cif' }),
        ],
        cbmRate: 100,
        exRate: 300,
      });

      const result = calculateLandedCost(data);

      // Total CBM = 3, Total Value = 300,000 + 300,000 = 600,000
      // Freight = 3 * 100 = 300
      // Item A: value=300k, cbm=1; Item B: value=300k, cbm=2
      // CIF total = 600,300
      // Duty = 600,300 * 15% = 90,045
      // Transport split by CBM: A=1666.67, B=3333.33
      expect(result.totals.grandTotal).toBeGreaterThan(600000);
      expect(result.perItem.length).toBe(2);
    });
  });

  describe('Input validation', () => {
    it('handles NaN exRate gracefully', () => {
      const data = createBaseShipment({
        exRate: NaN,
        items: [createBaseItem({ qty: 10, price: 100, cbm: 1 })],
        cbmRate: 100,
      });

      const result = calculateLandedCost(data);

      // Should default to 0, not crash
      expect(result.totals.totalValueLKR).toBe(0);
      expect(result.totals.grandTotal).toBe(100); // Just freight
    });

    it('handles Infinity exRate gracefully', () => {
      const data = createBaseShipment({
        exRate: Infinity,
        items: [createBaseItem({ qty: 10, price: 100, cbm: 1 })],
        cbmRate: 100,
      });

      const result = calculateLandedCost(data);

      expect(result.totals.totalValueLKR).toBe(0);
    });

    it('clamps exRate to max 10000', () => {
      const data = createBaseShipment({
        exRate: 50000,
        items: [createBaseItem({ qty: 1, price: 100, cbm: 1 })],
        cbmRate: 100,
      });

      const result = calculateLandedCost(data);

      expect(result.totals.totalValueLKR).toBe(100 * 10000); // Clamped to 10000
    });

    it('clamps negative values to 0', () => {
      const data = createBaseShipment({
        exRate: -100,
        cbmRate: -50,
        markupPct: -20,
        items: [createBaseItem({ qty: 10, price: 100, cbm: 1 })],
      });

      const result = calculateLandedCost(data);

      expect(result.totals.totalValueLKR).toBe(0);
      expect(result.totals.freightTotal).toBe(0);
      expect(result.perItem[0].targetSell).toBe(0); // markup clamped to 0
    });
  });

  describe('Edge cases', () => {
    it('handles zero items', () => {
      const data = createBaseShipment({
        items: [],
        cbmRate: 100,
        exRate: 300,
      });

      const result = calculateLandedCost(data);

      expect(result.totals.totalMeasure).toBe(0);
      expect(result.totals.totalValueLKR).toBe(0);
      expect(result.totals.grandTotal).toBe(0);
      expect(result.perItem).toHaveLength(0);
    });

    it('handles zero CBM items', () => {
      const data = createBaseShipment({
        items: [createBaseItem({ qty: 10, price: 100, cbm: 0 })],
        cbmRate: 100,
        exRate: 300,
      });

      const result = calculateLandedCost(data);

      expect(result.totals.totalMeasure).toBe(0);
      expect(result.totals.freightTotal).toBe(0);
      expect(result.perItem[0].freightShare).toBe(0);
    });

    it('handles items with zero qty', () => {
      const data = createBaseShipment({
        items: [createBaseItem({ qty: 0, price: 100, cbm: 1 })],
        cbmRate: 100,
        exRate: 300,
      });

      const result = calculateLandedCost(data);

      expect(result.totals.sumQty).toBe(0);
      expect(result.perItem[0].unitCost).toBe(0);
      expect(result.perItem[0].targetSell).toBe(0);
    });
  });

  describe('Sri Lanka tax bundle simulation', () => {
    it('calculates correctly with Duty 15% (CIF), PAL 10% (CIF), VAT 18% (Running)', () => {
      const data = createBaseShipment({
        items: [createBaseItem({ qty: 100, price: 50, cbm: 2 })], // 100 units, 2 CBM total (cbm is per-line total)
        fees: [
          createBaseFee({ id: 'fe1', name: 'Customs Duty', type: 'percent', amount: 15, method: 'cbm', base: 'cif' }),
          createBaseFee({ id: 'fe2', name: 'PAL', type: 'percent', amount: 10, method: 'cbm', base: 'cif' }),
          createBaseFee({ id: 'fe3', name: 'VAT', type: 'percent', amount: 18, method: 'cbm', base: 'running' }),
        ],
        cbmRate: 50000,
        exRate: 300,
      });

      const result = calculateLandedCost(data);

      // Value = 100 * 50 * 300 = 1,500,000
      // Freight = 2 * 50000 = 100,000
      // CIF = 1,600,000
      // Duty = 1,600,000 * 15% = 240,000
      // Running after Duty = 1,840,000
      // PAL = 1,600,000 * 10% = 160,000 (on CIF, not running)
      // Running after PAL = 2,000,000
      // VAT = 2,000,000 * 18% = 360,000 (on running)
      // Total = 1,500,000 + 100,000 + 240,000 + 160,000 + 360,000 = 2,360,000
      
      expect(result.totals.totalValueLKR).toBe(1500000);
      expect(result.totals.freightTotal).toBe(100000);
      expect(result.totals.grandTotal).toBe(2360000);
    });
  });

  describe('Cost composition percentages', () => {
    it('calculates correct percentage breakdown', () => {
      const data = createBaseShipment({
        items: [createBaseItem({ qty: 10, price: 100, cbm: 10 })], // Higher CBM for meaningful freight
        fees: [createBaseFee({ type: 'percent', amount: 10, base: 'cif' })],
        cbmRate: 1000, // Higher freight rate
        exRate: 300,
      });

      const result = calculateLandedCost(data);

      const item = result.perItem[0];
      expect(item.goodsPct + item.freightPct + item.feesPct).toBe(100);
      expect(item.goodsPct).toBeGreaterThan(0);
      expect(item.freightPct).toBeGreaterThan(0);
      expect(item.feesPct).toBeGreaterThan(0);
    });
  });
});