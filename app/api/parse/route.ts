import { NextResponse } from 'next/server';

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://www.truelanded.dev';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders() });
}

function corsResponse(body: any, status: number = 200) {
  return NextResponse.json(body, { status, headers: corsHeaders() });
}

// ---- Rate Limiting (in-memory, per IP, 10 req/min) ----
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) {
    return false;
  }
  entry.count++;
  return true;
}

// ---- Sanitization & validation of AI-extracted line items ----
// This is the defense-in-depth layer that stops hallucinated/misparsed
// rows (wrong qty/price, merged rows, garbage tokens) from ever reaching
// a user's landed-cost calculation silently.
const MAX_QTY = 1_000_000;
const MAX_PRICE = 100_000_000;

function toNum(v: any, max: number = Number.MAX_SAFE_INTEGER): number {
  // Robust: models often return formatted strings ("¥55.00", "1,100.00",
  // "55 RMB") despite the numeric schema. Raw Number() turns ALL of those
  // into NaN → silently stored as 0 ("doesn't pick the price"). Strip
  // currency symbols, commas, spaces and letter suffixes first.
  let s: string;
  if (typeof v === 'number') {
    if (!isFinite(v) || v < 0) return 0;
    return Math.min(max, v);
  }
  if (v === null || v === undefined) return 0;
  s = String(v).trim();
  if (!s) return 0;
  // Keep only digits, decimal point and minus (drops ¥ $ , spaces RMB/USD/CNY).
  s = s.replace(/[^0-9.\-]/g, '');
  // Guard against ".." / "--" / trailing-dot artefacts producing NaN.
  if (!s || s === '.' || s === '-' || s === '-.') return 0;
  const n = Number(s);
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
  let dropped = 0;

  (Array.isArray(raw.items) ? raw.items : []).forEach((it: any) => {
    if (!it || typeof it !== 'object') return;

    let qty = toNum(it.qty, MAX_QTY);
    let price = toNum(it.price, MAX_PRICE);
    const cbm = toNum(it.cbm, MAX_QTY);
    const amountRaw = it.amount;
    const amount = amountRaw !== undefined && amountRaw !== null ? toNum(amountRaw, 1e13) : NaN;
    const desc = String(it.desc || it.description || it.name || '')
      .replace(/\s+/g, ' ')
      .trim();

    // Price recovery: model sometimes returns qty + line amount but leaves the
    // unit price empty/formatted ("doesn't pick the price"). amount ÷ qty is
    // exact on clean invoices, so recover instead of importing price 0.
    if (desc && !(qty <= 0 && price <= 0)) {
      if (!(price > 0) && qty > 0 && isFinite(amount) && amount > 0) {
        const recovered = Math.round((amount / qty) * 100) / 100;
        if (isFinite(recovered) && recovered > 0 && recovered <= MAX_PRICE) {
          price = recovered;
          warnings.push(`"${desc}": unit price was unreadable, recovered as amount ÷ qty (${amount} ÷ ${qty} = ${recovered}). Verify it below.`);
        }
      }
      if (!(qty > 0) && isFinite(amount) && amount > 0) {
        warnings.push(`"${desc}": quantity unreadable but line amount is ${amount} — check the QTY column below.`);
      }
      if (!(price > 0) && !(qty > 0 && isFinite(amount) && amount > 0)) {
        warnings.push(`"${desc}": unit price unreadable — check the Unit Price column below.`);
      }
    }

    // Drop empty rows and rows with neither qty nor price (headers, notes, blank lines).
    // Count them: silent drops are exactly how "uploaded 7 rows, only 1 came"
    // happens — the user must be told rows went missing.
    if (!desc || (qty <= 0 && price <= 0)) {
      dropped++;
      return;
    }

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
  if (dropped > 0 && items.length > 0) {
    warnings.push(`${dropped} row(s) had no readable qty/price and were skipped — the document shows more rows than imported. Fix them below or re-upload a clearer photo/Excel.`);
  }
  if (items.length > 0 && items.every(i => !(i.cbm > 0))) {
    warnings.push('No CBM column was detected (all CBM = 0) — this supplier sheet has no volume column. Enter Total CBM per line manually so sea freight allocates, or add freight as a flat fee spread By Value.');
  }

  // If the model was able to count the "No." column on the document, surface a row-count mismatch.
  const expectedRows = Number(raw.expectedRows);
  if (Number.isFinite(expectedRows) && expectedRows > 0 && expectedRows !== items.length) {
    warnings.push(`The document appears to have ${expectedRows} line item(s), but only ${items.length} could be extracted. Review them below before importing.`);
  }

  // Grand-total reconciliation check
  const documentTotal = toNum((raw as any).documentTotal, 1e13);
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
// Configurable via GEMINI_MODELS env var (comma-separated).
const DEFAULT_GEMINI_MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.7-flash', 'gemini-3.8-flash'];
const GEMINI_MODELS = new Set(
  (process.env.GEMINI_MODELS?.split(',').map(m => m.trim()).filter(Boolean) || DEFAULT_GEMINI_MODELS)
);

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
4. Do NOT merge rows. Do NOT invent rows. Do NOT treat the header row, the numbering column, totals rows, "FREIGHT" rows, or the Remark column as line items. Return one entry per numbered row so a 7-row table yields 7 entries.
5. Return qty/price/cbm/amount/documentTotal as bare numbers only — no currency symbols, no units, no commas (e.g. 55 not ¥55.00, 1100 not ¥1,100.00).
6. Set invoiceCurrency from the column header currency sign (e.g. "Unit Price (RMB)" -> "RMB", "USD" -> "USD"). If ambiguous use "UNKNOWN".
7. extraCharges: delivery/shipping/packaging/insurance/other charges printed separately on the document (e.g. a "FREIGHT 250.00" line). Use the same invoice currency.
8. documentTotal: the grand total printed on the document, or 0 if no total is shown.
9. If this is NOT a commercial document (e.g. a selfie, food, animal, car, landscape, or random object photo): set isDocument to false, describe the image briefly in message, and return empty items and extraCharges.

Respond ONLY with the JSON object.`;

export async function POST(req: Request) {
  try {
    // Rate limiting
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               req.headers.get('x-real-ip') || 
               'unknown';
    if (!checkRateLimit(ip)) {
      return corsResponse({ error: 'Rate limited. Max 10 requests per minute.' }, 429);
    }

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
      // Model priority order (most capable first). Configurable via GEMINI_MODELS env var.
      // Falls back to DEFAULT_GEMINI_MODELS if not set.
      const geminiModels = Array.from(GEMINI_MODELS).sort((a, b) => {
        // Priority: 3.8-flash > 3.7-flash > 3.6-flash > 3.5-flash > 3.5-flash-lite
        const priority: Record<string, number> = {
          'gemini-3.8-flash': 5,
          'gemini-3.7-flash': 4,
          'gemini-3.6-flash': 3,
          'gemini-3.5-flash': 2,
          'gemini-3.5-flash-lite': 1,
        };
        return (priority[b] || 0) - (priority[a] || 0);
      });
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
              generationConfig: GEMINI_MODELS.has(model)
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

      // Short banner-safe message (NEVER dump model names or the raw chain
      // into the UI — err.jpeg proved it fills the screen). Full chain goes
      // to `details` (console + server logs) only.
      const detail = errors.join(' | ');
      console.error('Gemini all-models failed:', detail);
      return corsResponse(
        {
          error: 'AI extraction failed. No items were imported. Please retry, or use Excel/paste.',
          details: detail.slice(0, 2000),
        },
        502,
      );
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