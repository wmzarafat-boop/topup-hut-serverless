const supabase = require('../supabase');

const getUserId = (event) => {
  const cookies = event.headers.cookie || '';
  const tokenCookie = cookies.split(';').find(c => c.trim().startsWith('auth_token='));
  if (!tokenCookie) return null;
  try {
    const token = tokenCookie.split('=')[1].trim();
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    if (decoded.exp < Date.now()) return null;
    return decoded.id;
  } catch { return null; }
};

exports.handler = async (event, context) => {
  const userId = getUserId(event);
  const sessionId = event.headers['x-session-id'] || 'anonymous';

  if (event.httpMethod === 'GET') {
    let query = supabase
      .from('carts')
      .select('*, products(name, price, sale_price, product_images(*))')
      .eq('session_id', sessionId);

    if (userId) {
      query = supabase
        .from('carts')
        .select('*, products(name, price, sale_price, product_images(*))')
        .or(`session_id.eq.${sessionId},user_id.eq.${userId}`);
    }

    const { data, error } = await query;

    if (error) {
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }

    const cartItems = (data || []).map(item => ({
      ...item,
      product: item.products ? {
        ...item.products,
        current_price: item.products.sale_price || item.products.price
      } : null
    }));

    const total = cartItems.reduce((sum, item) => {
      const price = item.product?.current_price || 0;
      return sum + (price * item.quantity);
    }, 0);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cart: cartItems, total, count: cartItems.length })
    };
  }

  if (event.httpMethod === 'POST') {
    const { product_id, quantity = 1, variant_id } = JSON.parse(event.body);

    const { data: existing } = await supabase
      .from('carts')
      .select('id, quantity')
      .eq('product_id', product_id)
      .eq('session_id', sessionId)
      .single();

    if (existing) {
      await supabase
        .from('carts')
        .update({ quantity: existing.quantity + quantity })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('carts')
        .insert({
          product_id,
          variant_id: variant_id || null,
          quantity,
          session_id: sessionId,
          user_id: userId || null
        });
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  }

  if (event.httpMethod === 'PUT') {
    const { id, quantity } = JSON.parse(event.body);
    
    if (quantity <= 0) {
      await supabase.from('carts').delete().eq('id', id);
    } else {
      await supabase.from('carts').update({ quantity }).eq('id', id);
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  }

  if (event.httpMethod === 'DELETE') {
    const id = event.queryStringParameters.id;
    await supabase.from('carts').delete().eq('id', id);
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  }

  return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
};
