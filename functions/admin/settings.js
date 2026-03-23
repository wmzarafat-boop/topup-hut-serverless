const supabase = require('../supabase');

const authenticate = (event) => {
  const cookies = event.headers.cookie || '';
  const tokenCookie = cookies.split(';').find(c => c.trim().startsWith('auth_token='));
  if (!tokenCookie) return null;
  try {
    const token = tokenCookie.split('=')[1].trim();
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    if (decoded.exp < Date.now()) return null;
    if (decoded.role !== 'admin') return null;
    return decoded;
  } catch { return null; }
};

exports.handler = async (event, context) => {
  if (event.httpMethod === 'GET') {
    const { data, error } = await supabase
      .from('settings')
      .select('key, value');

    if (error) {
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }

    const settings = {};
    (data || []).forEach(s => {
      settings[s.key] = s.value;
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    };
  }

  const user = authenticate(event);
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  if (event.httpMethod === 'POST') {
    const body = JSON.parse(event.body);

    for (const [key, value] of Object.entries(body)) {
      await supabase
        .from('settings')
        .upsert({ key, value, type: typeof value === 'number' ? 'number' : 'text' }, { onConflict: 'key' });
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  }

  return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
};
