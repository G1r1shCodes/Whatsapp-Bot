-- Fix Supabase Row Level Security (RLS) Policies for Whatsapp-Bot backend
-- Run this script in your Supabase SQL Editor if using anon key or facing 401 RLS policy errors.

-- 1. Disable RLS or Allow full access for anon & authenticated roles on chat_history
ALTER TABLE IF EXISTS chat_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to chat_history" ON chat_history;
DROP POLICY IF EXISTS "Allow all access via service key" ON chat_history;
CREATE POLICY "Allow all access to chat_history" ON chat_history 
    FOR ALL 
    TO public 
    USING (true) 
    WITH CHECK (true);

-- 2. Allow full access on leads table
ALTER TABLE IF EXISTS leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to leads" ON leads;
DROP POLICY IF EXISTS "Allow all access via service key" ON leads;
CREATE POLICY "Allow all access to leads" ON leads 
    FOR ALL 
    TO public 
    USING (true) 
    WITH CHECK (true);

-- 3. Allow full access on sessions table
ALTER TABLE IF EXISTS sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to sessions" ON sessions;
DROP POLICY IF EXISTS "Allow all access via service key" ON sessions;
CREATE POLICY "Allow all access to sessions" ON sessions 
    FOR ALL 
    TO public 
    USING (true) 
    WITH CHECK (true);

-- 4. Allow full access on products table
ALTER TABLE IF EXISTS products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to products" ON products;
DROP POLICY IF EXISTS "Allow all access via service key" ON products;
CREATE POLICY "Allow all access to products" ON products 
    FOR ALL 
    TO public 
    USING (true) 
    WITH CHECK (true);
