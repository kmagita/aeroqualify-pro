// Vercel Cron Job — runs every 3 days to keep Supabase project active
// Configured in vercel.json

export default async function handler(req, res) {
  const SUPABASE_URL  = process.env.REACT_APP_SUPABASE_URL;
  const SUPABASE_ANON = process.env.REACT_APP_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON) {
    return res.status(500).json({ error: 'Missing Supabase env vars' });
  }

  try {
    // Ping the change_log table — lightweight query, always has data
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/change_log?select=id&limit=1`,
      {
        headers: {
          'apikey': SUPABASE_ANON,
          'Authorization': `Bearer ${SUPABASE_ANON}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Supabase responded with ${response.status}`);
    }

    const timestamp = new Date().toISOString();
    console.log(`[keep-alive] Supabase pinged successfully at ${timestamp}`);

    return res.status(200).json({
      ok: true,
      message: 'Supabase keep-alive ping successful',
      timestamp,
    });

  } catch (err) {
    console.error('[keep-alive] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
