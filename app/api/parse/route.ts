import { NextResponse } from 'next/server';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

function corsResponse(body: any, status: number = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// ---- Sanitization & validation of AI-extracted line items ----
// This is the defense-in-depth layer that stops hallucinated/misparsed
// rows (wrong qty/price, merged rows, garbage tokens) from ever reaching
// a user's landed-cost calculation silently.
const MAX_QTY = 1_000_000;
const MAX_PRICE = 100_000_000;

function toNum(v: any, max: number = Number.MAX_SAFE_INTEGER): number {
  const n = Number(v);
  if (!isFinite(n) || n < 0) return 0;
  return Math.min(max, n);
}

interface CleanItem {
  desc: string;
  qty: number;
  price: number;
  cbm: number;
  amount?: number;
}

function sanitizeResult(raw: any) {
  const warnings: string[] = [];

  if (!raw || typeof raw !== 'object') {
    return {
      isDocument: false,
      documentType: 'Invalid Image',
      message: 'Could not read the uploaded document.',
      items: [],
      extraCharges: [],
      warnings: ['Could not read the uploaded document.'],
      confidence: 'low',
    };
  }

  const isDocument = raw.isDocument === true || raw.isDocument === 'true';

  if (!isDocument) {
    return {
      isDocument: false,
      documentType: String(raw.documentType || 'Invalid Image'),
      message: String(raw.message || 'This image does not appear to be a commercial invoice or packing list.'),
      items: [],
      extraCharges: [],
      warnings: [],
      confidence: 'high',
    };
  }

  const invoiceCurrency = String(raw.invoiceCurrency || raw.currency || 'UNKNOWN').toUpperCase().replace('CNY', 'RMB');
  const items: CleanItem[] = [];
  const seen = new Set<string>();

  (Array.isArray(raw.items) ? raw.items : []).forEach((it: any) => {
    if (!it || typeof it !== 'object') return;

    const qty = toNum(it.qty, MAX_QTY);
    const price = toNum(it.price, MAX_PRICE);
    const cbm = toNum(it.cbm, MAX_QTY);
    const amountRaw = it.amount;
    const amount = amountRaw !== undefined && amountRaw !== null ? toNum(amountRaw, 1e13) : NaN;
    const desc = String(it.desc || it.description || it.name || '')
      .replace(/\s+/g, ' ')
      .trim();

    // Drop empty rows and rows with neither qty nor price (headers, notes, blank lines)
    if (!desc || (qty <= 0 && price <= 0)) return;

    // Cross-check the "Amount" column against qty * price whenever the model gave us both
    if (isFinite(amount) && amount > 0 && qty > 0 && price * qty > 0) {
      const expected = qty * price;
      if (Math.abs(expected - amount) / Math.max(amount, 1) > 0.05) {
        warnings.push(`"${desc}": listed amount (${amount}) does not match qty × price (${qty} × ${price} = ${expected}).`);
      }
    }

    // De-duplicate identical rows the model may have repeated
    const key = `${desc}|${qty}|${price}|${cbm}`;
    if (seen.has(key)) return;
    seen.add(key);

    items.push({ desc, qty, price, cbm, amount: isFinite(amount) ? amount : undefined });
  });

  if (items.length === 0) {
    warnings.push('No product line items could be extracted from this document.');
  }

  // If the model was able to count the "No." column on the document, surface a row-count mismatch.
  const expectedRows = Number(raw.expectedRows);
  if (Number.isFinite(expectedRows) && expectedRows > 0 && expectedRows !== items.length) {
    warnings.push(`The document appears to have ${expectedRows} line item(s), but only ${items.length} could be extracted. Review them below before importing.`);
  }

  // Grand-total reconciliation check
  const documentTotal = Number(raw.documentTotal);
  if (Number.isFinite(documentTotal) && documentTotal > 0 && items.length > 0) {
    const sumAmounts = items.reduce((s, i) => s + (i.amount !== undefined ? i.amount : i.qty * i.price), 0);
    if (sumAmounts > 0 && Math.abs(sumAmounts - documentTotal) / documentTotal > 0.05) {
      warnings.push(`Extracted line total (${sumAmounts.toFixed(2)}) does not match the document total (${documentTotal.toFixed(2)}).`);
    }
  }

  const extraCharges = (Array.isArray(raw.extraCharges) ? raw.extraCharges : [])
    .map((c: any) => ({
      name: String((c && c.name) || '').replace(/\s+/g, ' ').trim(),
      amount: c && c.amount !== undefined && c.amount !== null ? toNum(c.amount, 1e13) : 0,
      currency: String((c && c.currency) || invoiceCurrency || 'UNKNOWN').toUpperCase().replace('CNY', 'RMB'),
    }))
    .filter((c: any) => c.name && c.amount > 0);

  const confidence: 'high' | 'medium' | 'low' =
    warnings.length === 0 ? 'high' : warnings.length <= 2 ? 'medium' : 'low';

  return {
    isDocument: true,
    documentType: String(raw.documentType || 'Invoice / Packing List'),
    invoiceCurrency,
    expectedRows: Number.isFinite(expectedRows) ? expectedRows : 0,
    items,
    extraCharges,
    documentTotal: Number.isFinite(documentTotal) ? documentTotal : 0,
    warnings,
    confidence,
  };
}

// ---- Stable JSON Schema for Gemini structured output ----
// Using the schema makes the model return type-safe JSON and dramatically
// reduces merged rows, string numbers, and hallucinated columns.
const INVOICE_SCHEMA = {
  type: 'object',
  properties: {
    isDocument: { type: 'boolean' },
    documentType: { type: 'string' },
    message: { type: 'string' },
    invoiceCurrency: { type: 'string' },
    expectedRows: { type: 'integer' },
    documentTotal: { type: 'number' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          desc: { type: 'string' },
          qty: { type: 'number' },
          price: { type: 'number' },
          cbm: { type: 'number' },
          amount: { type: 'number' },
          unit: { type: 'string' },
        },
        required: ['desc'],
      },
    },
    extraCharges: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          amount: { type: 'number' },
          currency: { type: 'string' },
        },
        required: ['name'],
      },
    },
  },
  required: ['isDocument', 'items', 'extraCharges'],
};

// Models that support responseSchema in generateContent (per Google docs).
// Models NOT in this set still get responseMimeType: application/json as a strong JSON hint.
// NOTE: gemini-3.x names are NOT real (no such public model as of 2026) — using
// them first only guarantees a 404 "model not found" on every request, which is
// exactly what pushed Aadhil's upload into the silent OCR fallback. Keep only
// models that actually exist.
const SCHEMA_MODELS = new Set(['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.5-flash-lite', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro']);

const EXTRACTION_PROMPT = (isPdf: boolean) => `Extract this ${isPdf ? 'PDF' : 'image'} into structured JSON.

It is probably a commercial invoice, proforma invoice, packing list, purchase order, freight manifest, or price list.

STRICT RULES:
1. Find the table header row (columns like No., Model/Style No., Description of goods, Unit, QTY, Unit Price, Amount, CBM, Remark).
2. Count the product line items from the document's numbering column (e.g. "No." values like 2, 3, 4, 5...) and put that count in expectedRows.
3. For EACH line item output exactly ONE entry:
   - desc: full description = model/style number + product name (e.g. "AE101.99 COROLLA JPN 01 4DOOR - BLACK SPORT GRILLE")
   - qty: the quantity from the QTY column. NEVER read the Remark column (e.g. "4L+4R", "5L+5R", "20L+20R" is a remark, NOT a quantity).
   - price: the UNIT PRICE in the invoice currency (not the line Amount).
   - amount: the line Amount if there is one, i.e. qty x unit price.
   - cbm: the CBM/总CBM/体积 column value, or 0 when the document has no CBM column.
   - unit: the Unit column (PC, SET...), or "".
4. Do NOT merge rows. Do NOT invent rows. Do NOT treat the header row, the numbering column, totals rows, "FREIGHT" rows, or the Remark column as line items.
5. Set invoiceCurrency from the column header currency sign (e.g. "Unit Price (RMB)" -> "RMB", "USD" -> "USD"). If ambiguous use "UNKNOWN".
6. extraCharges: delivery/shipping/packaging/insurance/other charges printed separately on the document (e.g. a "FREIGHT 250.00" line). Use the same invoice currency.
7. documentTotal: the grand total printed on the document, or 0 if no total is shown.
8. If this is NOT a commercial document (e.g. a selfie, food, animal, car, landscape, or random object photo): set isDocument to false, describe the image briefly in message, and return empty items and extraCharges.

Respond ONLY with the JSON object.`;

export async function POST(req: Request) {
  try {
    const { base64, mimeType, isPdf, apiKey: clientApiKey } = await req.json().catch(() => ({}));

    if (!base64) {
      return corsResponse({ error: 'Missing base64 document data' }, 400);
    }

    // Reject oversized payloads before calling paid AI APIs (~10MB decoded limit).
    if (base64.length > 14_000_000) {
      return corsResponse({ error: 'Document too large. Please upload a file under 10MB.' }, 413);
    }

    const geminiKey = (process.env.GEMINI_API_KEY || (clientApiKey && clientApiKey.startsWith('AIza') ? clientApiKey : '')).trim();
    const openAiKey = (process.env.OPENAI_API_KEY || (clientApiKey && clientApiKey.startsWith('sk-') && !clientApiKey.startsWith('sk-ant') ? clientApiKey : '')).trim();
    const claudeKey = (process.env.ANTHROPIC_API_KEY || (clientApiKey && clientApiKey.startsWith('sk-ant') ? clientApiKey : '')).trim();

    if (!geminiKey && !openAiKey && !claudeKey) {
      return corsResponse({ 
        error: 'No AI API Key configured on server. Please ensure GEMINI_API_KEY is set in Vercel Environment Variables.' 
      }, 400);
    }

    const prompt = EXTRACTION_PROMPT(!!isPdf);

    // 1. Google Gemini (Structured output preferred - ordered most capable first)
    if (geminiKey) {
      // Only models that actually exist. gemini-2.5-flash is the current
      // stable workhorse; 2.0/1.5 kept purely as fallbacks for quota spikes.
      const geminiModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
      const errors = [];

      for (const model of geminiModels) {
        // Overload (429 / "high demand") is transient — retry the SAME model with
        // backoff before giving up, rather than skipping to dead fallback models.
        // Capped at 2 retries: Vercel Hobby functions time out at ~10s, so
        // 4 retries (≈15s of pure sleep) would always time out instead of recovering.
        const MAX_RETRIES = model === geminiModels[0] ? 2 : 1;
        // Only hard-fail a model on genuine "model not found / invalid key / not
        // available to this account" errors. Capacity errors are retried.
        const OVERLOAD_RE = /high demand|overloaded|congested|RESOURCE_EXHAUSTED|429|temporarily|too many requests|try again later/i;

        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
            const payload: Record<string, any> = {
              contents: [{
                parts: [
                  { text: prompt },
                  { inlineData: { mimeType: isPdf ? 'application/pdf' : (mimeType || 'image/jpeg'), data: base64 } }
                ]
              }],
              // Structured JSON output where supported; plain JSON hint otherwise.
              // (Sampling params like temperature are intentionally omitted.)
              generationConfig: SCHEMA_MODELS.has(model)
                ? { responseMimeType: 'application/json', responseSchema: INVOICE_SCHEMA }
                : { responseMimeType: 'application/json' }
            };

            const aiRes = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });

            const data = await aiRes.json();
            if (!aiRes.ok) {
              const msg = data?.error?.message || String(aiRes.status);
              if (OVERLOAD_RE.test(msg) && attempt < MAX_RETRIES) {
                errors.push(`${model}: overload (attempt ${attempt + 1}/${MAX_RETRIES + 1}) - backing off`);
                await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
                continue; // retry the same (working) model — capacity spikes are transient
              }
              errors.push(`${model}: ${msg}`);
              break; // real error -> try the next model
            }

            const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const clean = rawText.replace(/```json|```/g, '').trim();
            const parsed = JSON.parse(clean);
            return corsResponse(sanitizeResult(parsed));
          } catch (e: any) {
            const em = e?.message || String(e);
            if (OVERLOAD_RE.test(em) && attempt < MAX_RETRIES) {
              errors.push(`${model}: overload (attempt ${attempt + 1}/${MAX_RETRIES + 1}) - backing off`);
              await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
              continue;
            }
            errors.push(`${model} exception: ${em}`);
            break;
          }
        }
      }

      throw new Error(`Gemini failed on all models: ${errors.join(' | ')}`);
    }

    // 2. OpenAI GPT-4o-mini
    if (openAiKey) {
      const imageUrl = `data:${mimeType || 'image/jpeg'};base64,${base64}`;
      const payload = {
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageUrl } }
          ]
        }],
        response_format: { type: "json_object" }
      };

      const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openAiKey}`
        },
        body: JSON.stringify(payload)
      });

      if (!aiRes.ok) {
        const err = await aiRes.json().catch(() => ({}));
        throw new Error(err?.error?.message || `OpenAI API error (${aiRes.status})`);
      }

      const data = await aiRes.json();
      const rawText = data?.choices?.[0]?.message?.content || '';
      const clean = rawText.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      return corsResponse(sanitizeResult(parsed));
    }

    // 3. Anthropic Claude
    if (claudeKey) {
      const source = isPdf 
        ? { type: 'base64', media_type: 'application/pdf', data: base64 }
        : { type: 'base64', media_type: mimeType || 'image/jpeg', data: base64 };
      const block = isPdf ? { type: 'document', source } : { type: 'image', source };

      const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': claudeKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20240620',
          max_tokens: 2000,
          messages: [{ role: 'user', content: [block, { type: 'text', text: prompt }] }]
        })
      });

      if (!aiRes.ok) {
        const err = await aiRes.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Anthropic API error (${aiRes.status})`);
      }

      const data = await aiRes.json();
      const text = (data.content || []).map((b: any) => b.text || '').join('\n');
      const clean = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      return corsResponse(sanitizeResult(parsed));
    }

    return corsResponse({ error: 'Unrecognized API Key format' }, 400);
  } catch (error: any) {
    console.error('API Parse error:', error);
    return corsResponse({ error: error.message || 'Internal server error' }, 500);
  }
}