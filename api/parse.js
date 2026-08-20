// Vercel Serverless Function: /api/parse
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { base64, mimeType, isPdf, apiKey: clientApiKey } = req.body || {};

    if (!base64) {
      return res.status(400).json({ error: 'Missing base64 document data' });
    }

    const geminiKey = (process.env.GEMINI_API_KEY || (clientApiKey && clientApiKey.startsWith('AIza') ? clientApiKey : '')).trim();
    const openAiKey = (process.env.OPENAI_API_KEY || (clientApiKey && clientApiKey.startsWith('sk-') && !clientApiKey.startsWith('sk-ant') ? clientApiKey : '')).trim();
    const claudeKey = (process.env.ANTHROPIC_API_KEY || (clientApiKey && clientApiKey.startsWith('sk-ant') ? clientApiKey : '')).trim();

    if (!geminiKey && !openAiKey && !claudeKey) {
      return res.status(400).json({ 
        error: 'No AI API Key configured on server. Please ensure GEMINI_API_KEY is set in Vercel Environment Variables.' 
      });
    }

    const prompt = `Analyze this ${isPdf ? 'PDF' : 'image'}.

1. If this is a commercial invoice, proforma invoice, packing list, purchase order, freight manifest, or price list:
   Extract all product line items.
   For each item provide:
   - desc: Full description combining item code/style/model number and product name (e.g. "YH01-33017-2 For TY AE101 License plate (Red)")
   - qty: Total quantity as a number
   - price: Unit price as a number
   - cbm: Total CBM volume for that line as a number (use total CBM / 总体积 / t/cbm column if available, else 0)
   Return JSON with:
   "isDocument": true,
   "documentType": "e.g. Proforma Invoice / Packing List",
   "items": [{ "desc": "...", "qty": 20, "price": 75, "cbm": 0 }]

2. If this image is NOT a commercial invoice, packing list, or business document (for example: a photo of a person, selfie, food, animal, car, landscape, receipt without items, meme, or random object):
   Return JSON with:
   "isDocument": false,
   "documentType": "Invalid Image",
   "message": "This image appears to be a [detailed description of what is in the photo, e.g. photo of a car/scenery/person], not a commercial invoice or packing list. Please upload a supplier invoice or packing list.",
   "items": []

Respond with ONLY valid JSON without markdown formatting:
{
  "isDocument": true,
  "documentType": "string",
  "message": "string",
  "items": []
}`;

    // 1. Google Gemini Flash (Preferred - Fast & Free tier)
    if (geminiKey) {
      const geminiModels = ['gemini-3.6-flash', 'gemini-3.6-pro', 'gemini-2.0-flash-001', 'gemini-2.5-flash'];
      const errors = [];

      for (const model of geminiModels) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
          const payload = {
            contents: [{
              parts: [
                { text: prompt },
                { inlineData: { mimeType: isPdf ? 'application/pdf' : (mimeType || 'image/jpeg'), data: base64 } }
              ]
            }]
          };

          const aiRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          const data = await aiRes.json();
          if (!aiRes.ok) {
            errors.push(`${model}: ${data?.error?.message || aiRes.status}`);
            continue;
          }

          const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const clean = rawText.replace(/```json|```/g, '').trim();
          const parsed = JSON.parse(clean);
          return res.status(200).json(parsed);
        } catch (e) {
          errors.push(`${model} exception: ${e.message}`);
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
      const parsed = JSON.parse(rawText);
      return res.status(200).json(parsed);
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
      const text = (data.content || []).map(b => b.text || '').join('\n');
      const clean = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      return res.status(200).json(parsed);
    }

    return res.status(400).json({ error: 'Unrecognized API Key format' });
  } catch (error) {
    console.error('API Parse error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
