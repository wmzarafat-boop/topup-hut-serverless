const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { email, password } = JSON.parse(event.body);

    if (!email || !password) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Email and password are required' }) };
    }

    const { data: user, error } = await supabase.from('users').select('*').eq('email', email).single();

    if (error || !user) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Invalid credentials' }) };
    }

    let validPassword = password === user.password;
    if (!validPassword && user.password.startsWith('$2')) {
      validPassword = await bcrypt.compare(password, user.password);
    }

    if (!validPassword) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Invalid credentials' }) };
    }

    if (user.role !== 'admin') {
      return { statusCode: 403, body: JSON.stringify({ error: 'Access denied. Admin only.' }) };
    }

    const token = Buffer.from(JSON.stringify({
      id: user.id, email: user.email, role: user.role, exp: Date.now() + 24 * 60 * 60 * 1000
    })).toString('base64');

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Set-Cookie': `auth_token=${token}; Path=/; HttpOnly; Max-Age=86400` },
      body: JSON.stringify({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role }, token })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error', details: err.message }) };
  }
};
