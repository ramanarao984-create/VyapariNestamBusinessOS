import { createClient } from '@supabase/supabase-js';

function getDb() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw Object.assign(new Error('Supabase server configuration is missing.'), {
      code: 'WHATSAPP_DATABASE_UNAVAILABLE',
    });
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ready: false, error: 'Method not allowed' });
  }

  try {
    const { error } = await getDb()
      .from('whatsapp_connections')
      .select('id')
      .limit(1);

    if (error) {
      const code = error.code === 'PGRST205'
        ? 'WHATSAPP_SCHEMA_NOT_READY'
        : 'WHATSAPP_DATABASE_UNAVAILABLE';
      return res.status(503).json({
        ready: false,
        code,
        error: 'WhatsApp persistence is not available.',
      });
    }

    return res.status(200).json({
      ready: true,
      schema: 'whatsapp_persistence',
    });
  } catch {
    return res.status(503).json({
      ready: false,
      code: 'WHATSAPP_DATABASE_UNAVAILABLE',
      error: 'WhatsApp persistence is not available.',
    });
  }
}
