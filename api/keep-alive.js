export default async function handler(req, res) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || 'https://vubbzlwdnhrbbpdegnhx.supabase.co';
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    const headers = { 'User-Agent': 'Erodium-KeepAlive/1.0' };
    if (supabaseKey) {
      headers['apikey'] = supabaseKey;
      headers['Authorization'] = `Bearer ${supabaseKey}`;
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/`, { headers });
    return res.status(200).json({
      success: true,
      message: 'Supabase keep-alive ping successful',
      status: response.status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return res.status(200).json({
      success: false,
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
