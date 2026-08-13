-- 1. Create chat_history table
CREATE TABLE IF NOT EXISTS chat_history (
    id BIGSERIAL PRIMARY KEY,
    phone TEXT NOT NULL,
    direction TEXT NOT NULL,
    body TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access via service key" ON chat_history FOR ALL USING (true) WITH CHECK (true);

-- 2. Create sessions table for managing conversational state
CREATE TABLE IF NOT EXISTS sessions (
    phone TEXT PRIMARY KEY,
    state TEXT,
    step INT,
    data JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access via service key" ON sessions FOR ALL USING (true) WITH CHECK (true);

-- 3. Create leads table to store customer inquiries
CREATE TABLE IF NOT EXISTS leads (
    id BIGSERIAL PRIMARY KEY,
    phone TEXT,
    name TEXT,
    company TEXT,
    email TEXT,
    location TEXT,
    product_interest TEXT,
    quantity TEXT,
    requirements TEXT,
    status TEXT DEFAULT 'New',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access via service key" ON leads FOR ALL USING (true) WITH CHECK (true);

-- 4. Create products table for the catalog
CREATE TABLE IF NOT EXISTS products (
    name TEXT PRIMARY KEY,
    category TEXT,
    conductor TEXT,
    size TEXT,
    core INT,
    insulation TEXT,
    price_per_meter FLOAT,
    stock_status TEXT,
    specifications TEXT
);
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access via service key" ON products FOR ALL USING (true) WITH CHECK (true);

-- Optional: Insert a couple of sample products so your catalog isn't empty!
INSERT INTO products (name, category, conductor, size, core, insulation, price_per_meter, stock_status)
VALUES 
('1.5 sq mm House Wire', 'House Wires', 'Copper', '1.5 sq mm', 1, 'PVC', 12.50, 'In Stock'),
('2.5 sq mm Power Cable', 'Power Cables', 'Aluminium', '2.5 sq mm', 3, 'XLPE', 45.00, 'In Stock')
ON CONFLICT (name) DO NOTHING;
