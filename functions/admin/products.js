const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

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
  if (!user) return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };

  if (event.httpMethod === 'GET') {
    const page = parseInt(event.queryStringParameters.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    const { data, count, error } = await supabase.from('products').select('*, categories(name), product_images(*)', { count: 'exact' }).order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ products: data || [], total: count || 0, page, limit }) };
  }

  if (event.httpMethod === 'POST') {
    const body = JSON.parse(event.body);
    const slug = body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const { data: product, error: productError } = await supabase.from('products').insert({ ...body, slug }).select().single();
    if (productError) return { statusCode: 500, body: JSON.stringify({ error: productError.message }) };
    if (body.images && body.images.length > 0) {
      await supabase.from('product_images').insert(body.images.map((url, i) => ({ product_id: product.id, image: url, is_primary: i === 0, sort_order: i })));
    }
    return { statusCode: 201, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(product) };
  }

  if (event.httpMethod === 'PUT') {
    const body = JSON.parse(event.body);
    const { id, images, variants, ...updateData } = body;
    if (updateData.name) updateData.slug = updateData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const { data, error } = await supabase.from('products').update(updateData).eq('id', id).select().single();
    return error ? { statusCode: 500, body: JSON.stringify({ error: error.message }) } : { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) };
  }

  if (event.httpMethod === 'DELETE') {
    const id = event.queryStringParameters.id;
    await supabase.from('product_images').delete().eq('product_id', id);
    await supabase.from('product_variants').delete().eq('product_id', id);
    const { error } = await supabase.from('products').delete().eq('id', id);
    return error ? { statusCode: 500, body: JSON.stringify({ error: error.message }) } : { statusCode: 200, body: JSON.stringify({ success: true }) };
  }

  return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
};
