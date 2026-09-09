import { NextResponse } from 'next/server';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

function corsResponse(body: any, status: number = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function POST(req: Request) {
  return handleVerify(req);
}

export async function GET(req: Request) {
  return handleVerify(req);
}

async function handleVerify(req: Request) {
  let emailParam = '';
  
  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}));
    emailParam = body.email || '';
  } else {
    const { searchParams } = new URL(req.url);
    emailParam = searchParams.get('email') || '';
  }

  const email = emailParam.toLowerCase().trim();
  if (!email) return corsResponse({ error: 'Email is required' }, 400);

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return corsResponse({ is_pro: true, note: 'permissive_dev_mode' });
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
      return corsResponse({ is_pro: true, order_id: data[0].lemon_order_id });
    }

    return corsResponse({ is_pro: false });
  } catch (e: any) {
    return corsResponse({ error: e.message }, 500);
  }
}
