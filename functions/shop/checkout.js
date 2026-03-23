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
  if (event.httpMethod === 'POST') {
    const userId = getUserId(event);
    const sessionId = event.headers['x-session-id'] || 'anonymous';
    const body = JSON.parse(event.body);

    try {
      let query = supabase
        .from('carts')
        .select('*, products(price, sale_price, name)')
        .eq('session_id', sessionId);

      if (userId) {
        query = supabase
          .from('carts')
          .select('*, products(price, sale_price, name)')
          .or(`session_id.eq.${sessionId},user_id.eq.${userId}`);
      }

      const { data: cartItems } = await query;

      if (!cartItems || cartItems.length === 0) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Cart is empty' }) };
      }

      const total = cartItems.reduce((sum, item) => {
        const price = item.products?.sale_price || item.products?.price || 0;
        return sum + (price * item.quantity);
      }, 0);

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: userId || null,
          name: body.name,
          email: body.email,
          phone: body.phone,
          address: body.address || '',
          city: body.city || '',
          postal_code: body.postal_code || '',
          payment_method: body.payment_method,
          total_amount: total,
          status: 'pending',
          notes: body.notes || ''
        })
        .select()
        .single();

      if (orderError) {
        return { statusCode: 500, body: JSON.stringify({ error: orderError.message }) };
      }

      const orderItems = cartItems.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        variant_id: item.variant_id,
        product_name: item.products?.name || 'Product',
        quantity: item.quantity,
        price: item.products?.sale_price || item.products?.price || 0
      }));

      await supabase.from('order_items').insert(orderItems);

      await supabase
        .from('carts')
        .delete()
        .in('id', cartItems.map(c => c.id));

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, order_id: order.id, order })
      };
    } catch (err) {
      return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
  }

  if (event.httpMethod === 'GET') {
    const orderId = event.queryStringParameters.id;
    const userId = getUserId(event);

    let query = supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId);

    const { data, error } = await query.single();

    if (error || !data) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Order not found' }) };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    };
  }

  return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
};
