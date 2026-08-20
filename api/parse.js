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

    const apiKey = (clientApiKey || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || '').trim();

    if (!apiKey) {
      return res.status(400).json({ 
        error: 'No AI API Key configured on server. Please enter a Google Gemini key (Free) or OpenAI/Claude key in the app settings.' 
      });
    }

    const prompt = `This ${isPdf ? 'PDF' : 'image'} is a packing list or commercial invoice from China/supplier.
Extract every product line item. Ignore headers, metadata (buyer, seller, dates, invoice numbers), and the TOTAL summary row.
For each line item give:
- desc: Full product description combining item code/style no and product name (e.g. "YH01-33017-2 For TY AE101 License plate (Red)")
- qty: Total quantity as a number
- price: Unit price as a number
- cbm: Total CBM volume for that line as a number (use total CBM / 总体积 / t/cbm column if available, else 0)

Respond with ONLY valid JSON:
{"items":[{"desc":"","qty":0,"price":0,"cbm":0}]}`;

    // 1. Google Gemini Flash (Preferred - Fast & Free tier)
    if (apiKey.startsWith('AIza') || process.env.GEMINI_API_KEY) {
      const geminiKey = apiKey.startsWith('AIza') ? apiKey : process.env.GEMINI_API_KEY;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
      const payload = {
        contents: [{
          parts: [
            { inlineData: { mimeType: isPdf ? 'application/pdf' : (mimeType || 'image/jpeg'), data: base64 } },
            { text: prompt }
          ]
        }]
      };

      const aiRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!aiRes.ok) {
        const err = await aiRes.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Gemini API error (${aiRes.status})`);
      }

      const data = await aiRes.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const clean = rawText.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      return res.status(200).json({ items: parsed.items || [] });
    }

    // 2. OpenAI GPT-4o-mini
    if (apiKey.startsWith('sk-') && !apiKey.startsWith('sk-ant')) {
      const openAiKey = apiKey.startsWith('sk-') ? apiKey : process.env.OPENAI_API_KEY;
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
      return res.status(200).json({ items: parsed.items || [] });
    }

    // 3. Anthropic Claude
    if (apiKey.startsWith('sk-ant') || process.env.ANTHROPIC_API_KEY) {
      const claudeKey = apiKey.startsWith('sk-ant') ? apiKey : process.env.ANTHROPIC_API_KEY;
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
      return res.status(200).json({ items: parsed.items || [] });
    }

    return res.status(400).json({ error: 'Unrecognized API Key format' });
  } catch (error) {
    console.error('API Parse error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
