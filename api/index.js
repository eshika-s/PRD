const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

// Supabase client (service_role key bypasses RLS)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ==================== MIDDLEWARE ====================

const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('token', token)
    .single();
  if (error || !user) return res.status(401).json({ error: 'Unauthorized' });
  req.user = user;
  next();
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  next();
};

// ==================== AUTH ====================

app.post('/api/auth/register', async (req, res) => {
  const { username, password, role } = req.body;

  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('username', username)
    .single();
  if (existing) return res.status(400).json({ error: 'User already exists' });

  const token = uuidv4();
  const { data: newUser, error } = await supabase
    .from('users')
    .insert({
      username,
      password,
      role: role || 'user',
      token,
      scores: [],
      winnings: 0,
      total_contributed: 0,
      draws_entered: 0
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ token: newUser.token, role: newUser.role });
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .eq('password', password)
    .single();
  if (error || !user) return res.status(401).json({ error: 'Invalid credentials' });
  res.json({ token: user.token, role: user.role });
});

app.get('/api/auth/me', authenticate, async (req, res) => {
  const { password, token, ...userData } = req.user;
  res.json(userData);
});

// ==================== CHARITIES ====================

app.get('/api/charities', async (req, res) => {
  const { data, error } = await supabase.from('charities').select('*').order('total_raised', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/admin/charities', authenticate, adminOnly, async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Charity name required' });
  const { data, error } = await supabase
    .from('charities')
    .insert({ name, description: description || '', total_raised: 0 })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete('/api/admin/charities/:id', authenticate, adminOnly, async (req, res) => {
  await supabase.from('charities').delete().eq('id', req.params.id);
  res.json({ success: true });
});

// ==================== SUBSCRIPTION ====================

app.post('/api/subscription', authenticate, async (req, res) => {
  const { plan, charityId } = req.body;

  const updates = {
    subscription: plan,
    subscription_date: new Date().toISOString()
  };

  if (charityId) {
    const { data: charity } = await supabase
      .from('charities')
      .select('*')
      .eq('id', charityId)
      .single();

    if (charity) {
      updates.charity = charity.name;
      const contribution = plan === 'monthly' ? 1 : 10;
      updates.total_contributed = (req.user.total_contributed || 0) + contribution;

      await supabase
        .from('charities')
        .update({ total_raised: (charity.total_raised || 0) + contribution })
        .eq('id', charityId);
    }
  }

  const { data: updatedUser, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  const { password, token, ...userData } = updatedUser;
  res.json({ success: true, user: userData });
});

// ==================== SCORES ====================

app.post('/api/user/scores', authenticate, async (req, res) => {
  const { score } = req.body;
  if (!req.user.subscription) return res.status(403).json({ error: 'Subscription required' });
  if (score < 1 || score > 45) return res.status(400).json({ error: 'Score must be between 1 and 45' });

  const currentScores = req.user.scores || [];
  if (currentScores.includes(score)) {
    return res.status(400).json({ error: 'Duplicate score! Each score must be unique.' });
  }

  const newScores = [score, ...currentScores];
  if (newScores.length > 5) newScores.pop();

  const { error } = await supabase
    .from('users')
    .update({ scores: newScores })
    .eq('id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json(newScores);
});

app.delete('/api/user/scores/:index', authenticate, async (req, res) => {
  const idx = parseInt(req.params.index);
  const scores = [...(req.user.scores || [])];
  if (idx >= 0 && idx < scores.length) {
    scores.splice(idx, 1);
    await supabase.from('users').update({ scores }).eq('id', req.user.id);
    res.json(scores);
  } else {
    res.status(400).json({ error: 'Invalid score index' });
  }
});

// ==================== DRAWS ====================

app.post('/api/admin/draws', authenticate, adminOnly, async (req, res) => {
  // Draw 5 unique numbers 1-45
  const drawnNumbers = [];
  while (drawnNumbers.length < 5) {
    const num = Math.floor(Math.random() * 45) + 1;
    if (!drawnNumbers.includes(num)) drawnNumbers.push(num);
  }
  drawnNumbers.sort((a, b) => a - b);

  // Get all eligible users
  const { data: allUsers } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'user')
    .not('subscription', 'is', null);

  const eligibleUsers = (allUsers || []).filter(u => (u.scores || []).length >= 5);

  // Get platform stats
  const { data: statsRow } = await supabase
    .from('platform_stats')
    .select('*')
    .eq('id', 1)
    .single();
  const currentJackpot = statsRow?.jackpot_pool || 0;
  let prizePool = 1000 + currentJackpot;
  let nextJackpot = 0;

  const c5 = prizePool * 0.40;
  const c4 = prizePool * 0.35;
  const c3 = prizePool * 0.25;

  const results = [];
  let t5 = 0, t4 = 0, t3 = 0;

  // Count matches
  eligibleUsers.forEach(user => {
    const matches = (user.scores || []).filter(s => drawnNumbers.includes(s)).length;
    if (matches >= 3) {
      if (matches === 5) t5++;
      if (matches === 4) t4++;
      if (matches === 3) t3++;
      results.push({ userId: user.id, username: user.username, matches, scores: [...user.scores] });
    }
  });

  if (t5 === 0) nextJackpot = c5;

  // Assign payouts & create claims
  for (const r of results) {
    let won = 0;
    if (r.matches === 5 && t5 > 0) won = c5 / t5;
    if (r.matches === 4 && t4 > 0) won = c4 / t4;
    if (r.matches === 3 && t3 > 0) won = c3 / t3;
    won = Math.round(won * 100) / 100;

    // Update user winnings
    const user = eligibleUsers.find(u => u.id === r.userId);
    await supabase
      .from('users')
      .update({ winnings: (user.winnings || 0) + won, draws_entered: (user.draws_entered || 0) + 1 })
      .eq('id', r.userId);

    // Create claim
    const drawId = undefined; // will be set after draw insert
    r.amount = won;
  }

  // Update draws_entered for all eligible users without wins
  for (const user of eligibleUsers) {
    if (!results.find(r => r.userId === user.id)) {
      await supabase
        .from('users')
        .update({ draws_entered: (user.draws_entered || 0) + 1 })
        .eq('id', user.id);
    }
  }

  // Insert draw record
  const { data: drawRecord, error: drawError } = await supabase
    .from('draws')
    .insert({
      numbers: drawnNumbers,
      results: results,
      prize_pool: Math.round(prizePool * 100) / 100,
      eligible_players: eligibleUsers.length,
      total_winners: results.length
    })
    .select()
    .single();

  if (drawError) return res.status(500).json({ error: drawError.message });

  // Insert claims
  for (const r of results) {
    await supabase.from('claims').insert({
      user_id: r.userId,
      username: r.username,
      draw_id: drawRecord.id,
      matches: r.matches,
      amount: r.amount || 0,
      status: 'pending'
    });
  }

  // Update platform stats
  await supabase
    .from('platform_stats')
    .update({
      jackpot_pool: nextJackpot,
      total_draws: (statsRow?.total_draws || 0) + 1,
      total_prize_pool: (statsRow?.total_prize_pool || 0) + prizePool
    })
    .eq('id', 1);

  res.json({
    id: drawRecord.id,
    date: drawRecord.date,
    numbers: drawnNumbers,
    results,
    prizePool: Math.round(prizePool * 100) / 100,
    eligiblePlayers: eligibleUsers.length,
    totalWinners: results.length
  });
});

app.get('/api/draws', async (req, res) => {
  const { data, error } = await supabase
    .from('draws')
    .select('*')
    .order('date', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get('/api/user/draw-history', authenticate, async (req, res) => {
  const { data: draws } = await supabase
    .from('draws')
    .select('*')
    .order('date', { ascending: false });

  const userDraws = (draws || [])
    .filter(d => d.results && d.results.some(r => r.userId === req.user.id))
    .map(d => ({
      ...d,
      userResult: d.results.find(r => r.userId === req.user.id)
    }));
  res.json(userDraws);
});

// ==================== CLAIMS ====================

app.get('/api/user/claims', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('claims')
    .select('*')
    .eq('user_id', req.user.id)
    .order('date', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/user/claims/:id/upload', authenticate, async (req, res) => {
  const { data: claim } = await supabase
    .from('claims')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single();

  if (!claim) return res.status(404).json({ error: 'Claim not found' });

  const { data: updated, error } = await supabase
    .from('claims')
    .update({ proof_url: 'Scorecard_Proof_' + Date.now() + '.pdf' })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, claim: updated });
});

// ==================== ADMIN ====================

app.get('/api/admin/claims', authenticate, adminOnly, async (req, res) => {
  const { data, error } = await supabase
    .from('claims')
    .select('*')
    .order('date', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/admin/claims/:id/verify', authenticate, adminOnly, async (req, res) => {
  const { error } = await supabase
    .from('claims')
    .update({ status: 'verified' })
    .eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.get('/api/admin/users', authenticate, adminOnly, async (req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'user')
    .order('joined_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  const users = data.map(u => {
    const { password, token, ...userData } = u;
    return userData;
  });
  res.json(users);
});

// ==================== STATS ====================

app.get('/api/stats', async (req, res) => {
  const { data: users } = await supabase.from('users').select('subscription, role');
  const { data: charities } = await supabase.from('charities').select('total_raised');
  const { data: statsRow } = await supabase.from('platform_stats').select('*').eq('id', 1).single();

  const activeMembers = (users || []).filter(u => u.role === 'user' && u.subscription).length;
  const totalMembers = (users || []).filter(u => u.role === 'user').length;
  const totalDonated = (charities || []).reduce((s, c) => s + Number(c.total_raised || 0), 0);

  res.json({
    activeMembers,
    totalMembers,
    totalDraws: statsRow?.total_draws || 0,
    totalPrizePool: statsRow?.total_prize_pool || 50000,
    totalDonated,
    jackpotPool: statsRow?.jackpot_pool || 2500,
    charityCount: (charities || []).length
  });
});

app.get('/api/admin/stats', authenticate, adminOnly, async (req, res) => {
  const { data: users } = await supabase.from('users').select('*').eq('role', 'user');
  const { data: charities } = await supabase.from('charities').select('total_raised');
  const { data: claimsData } = await supabase.from('claims').select('status, amount');
  const { data: statsRow } = await supabase.from('platform_stats').select('*').eq('id', 1).single();

  const activeMembers = (users || []).filter(u => u.subscription).length;
  const totalMembers = (users || []).length;
  const monthlyRevenue = (users || []).filter(u => u.subscription === 'monthly').length * 10;
  const yearlyRevenue = (users || []).filter(u => u.subscription === 'yearly').length * 100;
  const totalDonated = (charities || []).reduce((s, c) => s + Number(c.total_raised || 0), 0);
  const pendingClaims = (claimsData || []).filter(c => c.status === 'pending').length;
  const verifiedClaims = (claimsData || []).filter(c => c.status === 'verified').length;

  res.json({
    activeMembers,
    totalMembers,
    monthlyRevenue,
    yearlyRevenue,
    totalRevenue: monthlyRevenue + yearlyRevenue,
    totalDraws: statsRow?.total_draws || 0,
    totalDonated,
    jackpotPool: statsRow?.jackpot_pool || 2500,
    pendingClaims,
    verifiedClaims,
    totalWinnersPaid: (claimsData || []).filter(c => c.status === 'verified').reduce((s, c) => s + Number(c.amount), 0)
  });
});

// Export for Vercel serverless
module.exports = app;
