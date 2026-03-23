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
  const user = authenticate(event);
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const slug = event.path.split('/').pop();

  if (event.httpMethod === 'GET') {
    if (slug && slug !== 'categories') {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('slug', slug)
        .single();
      return error
        ? { statusCode: 404, body: JSON.stringify({ error: 'Not found' }) }
        : { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) };
    }

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data || []) };
  }

  if (event.httpMethod === 'POST') {
    const body = JSON.parse(event.body);
    const slug = body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    const { data, error } = await supabase
      .from('categories')
      .insert({ ...body, slug })
      .select()
      .single();
    
    return error
      ? { statusCode: 500, body: JSON.stringify({ error: error.message }) }
      : { statusCode: 201, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) };
  }

  if (event.httpMethod === 'PUT') {
    const body = JSON.parse(event.body);
    const { data, error } = await supabase
      .from('categories')
      .update(body)
      .eq('id', body.id)
      .select()
      .single();
    
    return error
      ? { statusCode: 500, body: JSON.stringify({ error: error.message }) }
      : { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) };
  }

  if (event.httpMethod === 'DELETE') {
    const id = event.queryStringParameters.id;
    const { error } = await supabase.from('categories').delete().eq('id', id);
    return error
      ? { statusCode: 500, body: JSON.stringify({ error: error.message }) }
      : { statusCode: 200, body: JSON.stringify({ success: true }) };
  }

  return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
};
