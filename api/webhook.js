import crypto from 'crypto';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Signature');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({ 
      status: 'active', 
      service: 'Landed Cost Manifest Lemon Squeezy Webhook',
      time: new Date().toISOString()
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const signature = req.headers['x-signature'];

    if (signature && secret) {
      const hmac = crypto.createHmac('sha256', secret);
      const digest = hmac.update(rawBody).digest('hex');
      if (signature !== digest) {
        console.warn('Webhook signature mismatch');
      }
    }

    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const eventName = payload?.meta?.event_name;
    const data = payload?.data;
    const customData = payload?.meta?.custom_data;

    const email = (data?.attributes?.user_email || customData?.user_email || '').toLowerCase().trim();
    const orderId = String(data?.id || data?.attributes?.order_number || '');
    const customerId = String(data?.attributes?.customer_id || '');
    const status = data?.attributes?.status || 'paid';

    console.log(`[LemonSqueezy Webhook] Event: ${eventName}, Order: ${orderId}, Email: ${email}, Status: ${status}`);

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseKey && email) {
      try {
        const response = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify({
            email: email,
            is_pro: true,
            lemon_order_id: orderId,
            lemon_customer_id: customerId,
            updated_at: new Date().toISOString()
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error('[Supabase REST Error]:', errText);
        } else {
          console.log(`[Supabase REST Success]: Pro license activated for ${email}`);
        }
      } catch (err) {
        console.error('[Supabase Sync Error]:', err);
      }
    }

    return res.status(200).json({
      success: true,
      event: eventName,
      email: email,
      orderId: orderId
    });

  } catch (error) {
    console.error('[Webhook Exception]:', error);
    return res.status(500).json({ error: error.message });
  }
}
