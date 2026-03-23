const supabase = require('../supabase');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const category = event.queryStringParameters.category;
    const featured = event.queryStringParameters.featured;
    const search = event.queryStringParameters.search;
    const limit = parseInt(event.queryStringParameters.limit) || 20;

    let query = supabase
      .from('products')
      .select('*, categories(name), product_images(*)', { count: 'exact' })
      .eq('status', 'published');

    if (category) {
      const { data: cat } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', category)
        .single();
      
      if (cat) {
        query = query.eq('category_id', cat.id);
      }
    }

    if (featured === 'true') {
      query = query.eq('is_featured', true);
    }

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    query = query.order('created_at', { ascending: false }).limit(limit);

    const { data, error, count } = await query;

    if (error) {
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }

    const products = (data || []).map(p => ({
      ...p,
      current_price: p.sale_price || p.price,
      discount_percent: p.sale_price ? Math.round((1 - p.sale_price / p.price) * 100) : 0
    }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ products, total: count || 0 })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
