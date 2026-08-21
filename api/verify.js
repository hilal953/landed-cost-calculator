export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const email = (req.query.email || req.body?.email || '').toLowerCase().trim();
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(200).json({ is_pro: true, note: 'permissive_dev_mode' });
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=email,is_pro,lemon_order_id`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    const data = await response.json();
    if (data && data.length > 0 && data[0].is_pro) {
      return res.status(200).json({ is_pro: true, order_id: data[0].lemon_order_id });
    }

    return res.status(200).json({ is_pro: false });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
