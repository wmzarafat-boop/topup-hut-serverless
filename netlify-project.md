# TopUp Hut - Netlify + Supabase Serverless Project

A fully serverless e-commerce platform built with Netlify Functions and Supabase.

## Quick Start

### 1. Deploy to Netlify

1. Push this folder to GitHub
2. Go to [Netlify](https://netlify.com)
3. Connect your GitHub repository
4. Add Environment Variables:
   ```
   SUPABASE_URL=https://lezysesxexpmawhvfley.supabase.co
   SUPABASE_ANON_KEY=sb_publishable_zGjwbFCxSQbX_-9zq0KlNA_b9BSq1RR
   SUPABASE_SERVICE_ROLE_KEY=sb_secret_IY0OWQyExeDKFOos-nkaDA_f2wjDs9l
   ```
5. Deploy!

### 2. Create Admin Account

After deployment, visit:
```
https://your-site.netlify.app/admin/index.html
```

Login with email/password or create via API.

---

## Project Structure

```
netlify-project/
├── netlify.toml           # Netlify configuration
├── package.json           # Node.js dependencies
├── .env.example           # Environment variables template
├── functions/            # Netlify Functions (Backend)
│   ├── supabase.js       # Supabase client
│   ├── auth/             # Authentication
│   │   ├── login.js
│   │   └── register.js
│   ├── admin/            # Admin APIs
│   │   ├── dashboard.js
│   │   ├── categories.js
│   │   ├── products.js
│   │   ├── orders.js
│   │   ├── users.js
│   │   ├── pages.js
│   │   └── settings.js
│   └── shop/             # Shop APIs
│       ├── products.js
│       ├── cart.js
│       └── checkout.js
└── public/               # Frontend (Static HTML)
    └── admin/            # Admin Dashboard
        ├── index.html    # Login
        ├── dashboard/    # Dashboard pages
        ├── categories/
        ├── products/
        ├── orders/
        ├── users/
        ├── pages/
        └── settings/
```

---

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/.netlify/functions/auth/login` | Admin login |
| POST | `/.netlify/functions/auth/register` | User registration |

### Admin APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/.netlify/functions/admin/dashboard` | Dashboard stats |
| GET/POST/PUT/DELETE | `/.netlify/functions/admin/categories` | Categories CRUD |
| GET/POST/PUT/DELETE | `/.netlify/functions/admin/products` | Products CRUD |
| GET/PUT/DELETE | `/.netlify/functions/admin/orders` | Orders management |
| GET/PUT/DELETE | `/.netlify/functions/admin/users` | Users management |
| GET/PUT | `/.netlify/functions/admin/pages` | Pages management |
| GET/POST | `/.netlify/functions/admin/settings` | Site settings |

### Shop APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/.netlify/functions/shop/products` | List products |
| GET/POST/PUT/DELETE | `/.netlify/functions/shop/cart` | Cart operations |
| POST | `/.netlify/functions/shop/checkout` | Create order |

---

## Environment Variables

Create these in Netlify Dashboard → Site Settings → Environment Variables:

```env
SUPABASE_URL=https://lezysesxexpmawhvfley.supabase.co
SUPABASE_ANON_KEY=sb_publishable_zGjwbFCxSQbX_-9zq0KlNA_b9BSq1RR
SUPABASE_SERVICE_ROLE_KEY=sb_secret_IY0OWQyExeDKFOos-nkaDA_f2wjDs9l
```

---

## Database Tables

Create these tables in Supabase PostgreSQL:

### users
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    role TEXT DEFAULT 'customer',
    status BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### categories
```sql
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER REFERENCES categories(id),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    icon TEXT,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### products
```sql
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    short_description TEXT,
    description TEXT,
    price DECIMAL(10,2) DEFAULT 0,
    sale_price DECIMAL(10,2),
    stock INTEGER DEFAULT 0,
    sku TEXT UNIQUE,
    has_variants BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    is_trending BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'draft',
    meta_title TEXT,
    meta_description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### product_images
```sql
CREATE TABLE product_images (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    image TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### product_variants
```sql
CREATE TABLE product_variants (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sku TEXT,
    price DECIMAL(10,2),
    stock INTEGER DEFAULT 999,
    status BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### orders
```sql
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    name TEXT,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT,
    city TEXT,
    postal_code TEXT,
    payment_method TEXT,
    total_amount DECIMAL(10,2) DEFAULT 0,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### order_items
```sql
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    variant_id INTEGER,
    product_name TEXT,
    quantity INTEGER DEFAULT 1,
    price DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT NOW()
);
```

### carts
```sql
CREATE TABLE carts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    session_id TEXT,
    product_id INTEGER REFERENCES products(id),
    variant_id INTEGER,
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### pages
```sql
CREATE TABLE pages (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    content TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### settings
```sql
CREATE TABLE settings (
    id SERIAL PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    type TEXT DEFAULT 'text',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Deployment Steps

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

2. **Connect to Netlify**
   - Go to https://app.netlify.com
   - Click "Add new site" → "Import an existing project"
   - Connect GitHub and select repository

3. **Configure Build**
   - Build command: (leave empty)
   - Publish directory: `public`
   - Functions directory: `functions`

4. **Add Environment Variables**
   - Go to Site Settings → Environment Variables
   - Add the three Supabase variables

5. **Deploy**
   - Click "Deploy site"

---

## Admin URLs

After deployment:
- **Admin Login:** `https://your-site.netlify.app/admin/index.html`
- **Dashboard:** `https://your-site.netlify.app/admin/dashboard/index.html`

---

## Features

- [x] Admin Authentication
- [x] Dashboard with Stats
- [x] Categories Management
- [x] Products Management
- [x] Orders Management
- [x] Users Management
- [x] Pages Management
- [x] Settings Management
- [x] Customer Registration
- [x] Shopping Cart
- [x] Checkout Process

---

## Support

For issues or questions, create an issue on GitHub.
