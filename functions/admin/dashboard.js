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
  } catch {
    return null;
  }
};

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const user = authenticate(event);
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  try {
    const [
      { count: totalUsers },
      { count: totalOrders },
      { count: totalProducts },
      { count: totalCategories }
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      supabase.from('products').select('*', { count: 'exact', head: true }),
      supabase.from('categories').select('*', { count: 'exact', head: true })
    ]);

    const { data: recentOrders } = await supabase
      .from('orders')
      .select('*, users(name, email)')
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: lowStockProducts } = await supabase
      .from('products')
      .select('id, name, stock')
      .lt('stock', 10)
      .limit(5);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stats: {
          totalUsers,
          totalOrders,
          totalProducts,
          totalCategories,
          pendingOrders: 0
        },
        recentOrders: recentOrders || [],
        lowStockProducts: lowStockProducts || []
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server error', details: err.message })
    };
  }
};
