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

    const prompt = `This ${isPdf ? 'PDF' : 'image'} is a packing list or commercial invoice from China/supplier.
Extract every product line item (ignore headers, metadata like invoice numbers, dates, buyer/seller info, and the TOTAL summary row).
For each line item give:
- desc: Full product description combining item code/style no and product name (e.g. "YH01-33017-2 For TY AE101 License plate (Red)")
- qty: Total quantity as a number
- price: Unit price as a number
- cbm: Total CBM volume for that whole line item as a number (use total CBM / 总体积 / t/cbm column if available, else 0)

Respond with ONLY valid JSON:
{"items":[{"desc":"","qty":0,"price":0,"cbm":0}]}`;

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
          return res.status(200).json({ items: parsed.items || [] });
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
      return res.status(200).json({ items: parsed.items || [] });
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
      return res.status(200).json({ items: parsed.items || [] });
    }

    return res.status(400).json({ error: 'Unrecognized API Key format' });
  } catch (error) {
    console.error('API Parse error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
