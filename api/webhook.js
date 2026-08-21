import crypto from 'crypto';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Signature');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({ status: 'ok', message: 'Lemon Squeezy Webhook endpoint is live.' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || 'manifest_cargo__786_china';
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const signature = req.headers['x-signature'];

    if (signature && secret) {
      const hmac = crypto.createHmac('sha256', secret);
      const digest = hmac.update(rawBody).digest('hex');
      if (signature !== digest) {
        console.warn('Invalid signature for webhook call');
      }
    }

    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const eventName = payload?.meta?.event_name;
    const data = payload?.data;
    const customData = payload?.meta?.custom_data;

    console.log(`[Lemon Squeezy Webhook] Received event: ${eventName}`, {
      orderId: data?.id,
      email: data?.attributes?.user_email,
      total: data?.attributes?.total_formatted
    });

    const email = (data?.attributes?.user_email || customData?.user_email || '').toLowerCase().trim();
    const orderId = String(data?.id || data?.attributes?.order_number || '');

    // If Supabase environment variables are configured, save customer
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseKey && email) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { error } = await supabase
          .from('profiles')
          .upsert({
            email: email,
            is_pro: true,
            lemon_order_id: orderId,
            lemon_customer_id: String(data?.attributes?.customer_id || ''),
            updated_at: new Date().toISOString()
          }, { onConflict: 'email' });

        if (error) {
          console.error('[Supabase Webhook Error]:', error);
        } else {
          console.log(`[Supabase Webhook Success]: Activated Pro access for ${email}`);
        }
      } catch (err) {
        console.error('[Supabase Client Error]:', err);
      }
    }

    return res.status(200).json({
      received: true,
      event: eventName,
      email: email,
      orderId: orderId
    });

  } catch (error) {
    console.error('[Webhook Handler Error]:', error);
    return res.status(500).json({ error: error.message });
  }
}
