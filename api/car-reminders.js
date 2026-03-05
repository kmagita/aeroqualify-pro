// Vercel Cron — runs daily at 6am to check CAR due dates and send reminders
export default async function handler(req, res) {
  const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'https://lsgawxzpilototfsummm.supabase.co';
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/car-reminders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();
    console.log('[car-reminders cron]', data);
    return res.status(200).json({ ok: true, ...data });
  } catch(err) {
    console.error('[car-reminders cron] error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
