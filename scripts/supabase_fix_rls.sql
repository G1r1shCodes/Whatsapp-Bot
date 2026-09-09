-- Fix Supabase Row Level Security (RLS) Policies for Whatsapp-Bot backend
-- Run this script in your Supabase SQL Editor to instantly fix 401 RLS policy errors.

-- OPTION A: Disable RLS completely for backend bot tables (RECOMMENDED FOR BACKEND BOTS)
ALTER TABLE IF EXISTS chat_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS products DISABLE ROW LEVEL SECURITY;

-- OPTION B: Alternatively, if you want RLS enabled, grant full access to public/anon role:
-- DROP POLICY IF EXISTS "Allow all access to chat_history" ON chat_history;
-- CREATE POLICY "Allow all access to chat_history" ON chat_history FOR ALL TO public USING (true) WITH CHECK (true);
-- DROP POLICY IF EXISTS "Allow all access to leads" ON leads;
-- CREATE POLICY "Allow all access to leads" ON leads FOR ALL TO public USING (true) WITH CHECK (true);

