import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Signature',
    },
  });
}

function corsResponse(body: any, status: number = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Signature',
    },
  });
}

export async function GET() {
  return corsResponse({ 
    status: 'active', 
    service: 'TrueLanded Lemon Squeezy Webhook',
    time: new Date().toISOString()
  });
}

export async function POST(req: Request) {
  try {
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    const rawBody = await req.text();
    const signature = req.headers.get('x-signature');

    if (secret) {
      const hmac = crypto.createHmac('sha256', secret);
      const digest = hmac.update(rawBody).digest('hex');
      // Lemon Squeezy sends the hex HMAC in `X-Signature`. Reject forgeries.
      if (!signature || signature !== digest) {
        console.warn('Webhook signature mismatch — rejecting');
        return corsResponse({ error: 'Invalid signature' }, 401);
      }
    }

    const payload = JSON.parse(rawBody);
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

    // Refunds / chargebacks revoke access; paid orders grant it.
    const revokeEvents = new Set(['order_refunded', 'order_partially_refunded', 'subscription_cancelled', 'subscription_expired']);
    const grantEvents = new Set(['order_created', 'order_updated', 'order_confirmed', 'order_paid', 'subscription_created', 'subscription_updated']);
    const shouldRevoke = (eventName && revokeEvents.has(eventName)) || status === 'refunded' || status === 'dispute';
    const shouldGrant = !shouldRevoke && (!eventName || grantEvents.has(eventName) || status === 'paid' || status === 'active' || status === 'on_trial');

    if (supabaseUrl && supabaseKey && email) {
      try {
        const response = await fetch(`${supabaseUrl}/rest/v1/profiles?on_conflict=email`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify({
            email: email,
            is_pro: shouldGrant,
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

    return corsResponse({
      success: true,
      event: eventName,
      email: email,
      orderId: orderId
    });

  } catch (error: any) {
    console.error('[Webhook Exception]:', error);
    return corsResponse({ error: error.message }, 500);
  }
}
