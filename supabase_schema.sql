-- ============================================
-- FAIRWAY REWARDS — SUPABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================

-- Users table
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  token UUID DEFAULT gen_random_uuid(),
  subscription TEXT,
  subscription_date TIMESTAMPTZ,
  charity TEXT,
  charity_percentage INT DEFAULT 10,
  scores INT[] DEFAULT '{}',
  winnings DECIMAL DEFAULT 0,
  total_contributed DECIMAL DEFAULT 0,
  draws_entered INT DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

-- Charities table
CREATE TABLE charities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  total_raised DECIMAL DEFAULT 0
);

-- Draws table
CREATE TABLE draws (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numbers INT[] NOT NULL,
  date TIMESTAMPTZ DEFAULT NOW(),
  results JSONB DEFAULT '[]',
  prize_pool DECIMAL DEFAULT 0,
  eligible_players INT DEFAULT 0,
  total_winners INT DEFAULT 0
);

-- Claims table
CREATE TABLE claims (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  username TEXT,
  draw_id UUID REFERENCES draws(id),
  date TIMESTAMPTZ DEFAULT NOW(),
  matches INT,
  amount DECIMAL DEFAULT 0,
  status TEXT DEFAULT 'pending',
  proof_url TEXT
);

-- Platform stats (single row)
CREATE TABLE platform_stats (
  id INT PRIMARY KEY DEFAULT 1,
  total_prize_pool DECIMAL DEFAULT 50000,
  total_donated DECIMAL DEFAULT 0,
  total_draws INT DEFAULT 0,
  jackpot_pool DECIMAL DEFAULT 2500
);

-- ============================================
-- SEED DATA
-- ============================================

INSERT INTO charities (name, description, total_raised) VALUES
('Hope for Youth Foundation', 'Empowering underprivileged youth through sports and education programs worldwide.', 12450),
('Green Earth Initiative', 'Committed to reforestation and sustainability projects across communities.', 8700),
('Wellness Together', 'Providing mental health support and wellness resources to those in need.', 6200),
('Community Builders', 'Building affordable housing and community spaces for families.', 9300),
('Future Leaders Fund', 'Scholarships and mentorship for aspiring student athletes.', 5100);

INSERT INTO platform_stats (id, total_prize_pool, total_donated, total_draws, jackpot_pool)
VALUES (1, 50000, 41750, 24, 2500);

-- ============================================
-- RLS POLICIES (allow all via service key)
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE charities ENABLE ROW LEVEL SECURITY;
ALTER TABLE draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_all" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all" ON charities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all" ON draws FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all" ON claims FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all" ON platform_stats FOR ALL USING (true) WITH CHECK (true);
