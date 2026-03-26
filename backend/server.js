const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { readDB, writeDB } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// Helper to authenticate
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const db = readDB();
  const user = db.users.find(u => u.token === token);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  req.user = user;
  next();
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  next();
};

// ==================== AUTH ====================

app.post('/api/auth/register', (req, res) => {
  const { username, password, role } = req.body;
  const db = readDB();
  if (db.users.find(u => u.username === username)) {
    return res.status(400).json({ error: 'User already exists' });
  }
  const token = uuidv4();
  const newUser = {
    id: uuidv4(),
    username,
    password,
    role: role || 'user',
    token,
    subscription: null,
    subscriptionDate: null,
    charity: null,
    charityPercentage: 10,
    scores: [],
    winnings: 0,
    totalContributed: 0,
    drawsEntered: 0,
    joinedAt: new Date().toISOString()
  };
  db.users.push(newUser);
  writeDB(db);
  res.json({ token, role: newUser.role });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const db = readDB();
  const user = db.users.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  res.json({ token: user.token, role: user.role });
});

app.get('/api/auth/me', authenticate, (req, res) => {
  const { password, token, ...userData } = req.user;
  res.json(userData);
});

// ==================== CHARITIES ====================

app.get('/api/charities', (req, res) => {
  const db = readDB();
  res.json(db.charities);
});

// Admin: Add Charity
app.post('/api/admin/charities', authenticate, adminOnly, (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Charity name required' });
  const db = readDB();
  const newCharity = {
    id: uuidv4(),
    name,
    description: description || '',
    totalRaised: 0
  };
  db.charities.push(newCharity);
  writeDB(db);
  res.json(newCharity);
});

// Admin: Delete Charity
app.delete('/api/admin/charities/:id', authenticate, adminOnly, (req, res) => {
  const db = readDB();
  db.charities = db.charities.filter(c => c.id !== req.params.id);
  writeDB(db);
  res.json({ success: true });
});

// ==================== SUBSCRIPTION ====================

app.post('/api/subscription', authenticate, (req, res) => {
  const { plan, charityId } = req.body;
  const db = readDB();
  const user = db.users.find(u => u.id === req.user.id);
  user.subscription = plan;
  user.subscriptionDate = new Date().toISOString();
  
  if (charityId) {
    const charity = db.charities.find(c => c.id === charityId);
    if (charity) {
      user.charity = charity.name;
      const contribution = plan === 'monthly' ? 1 : 10; // 10% of subscription
      charity.totalRaised += contribution;
      user.totalContributed += contribution;
    }
  }
  
  writeDB(db);
  const { password, token, ...userData } = user;
  res.json({ success: true, user: userData });
});

// ==================== SCORES ====================

app.post('/api/user/scores', authenticate, (req, res) => {
  const { score } = req.body;
  if (!req.user.subscription) return res.status(403).json({ error: 'Subscription required' });
  if (score < 1 || score > 45) return res.status(400).json({ error: 'Score must be between 1 and 45' });

  const db = readDB();
  const user = db.users.find(u => u.id === req.user.id);
  
  // Check for duplicate score
  if (user.scores.includes(score)) {
    return res.status(400).json({ error: 'Duplicate score! Each score must be unique.' });
  }
  
  // PRD: Max 5 scores, new score removes oldest, reverse chronological
  user.scores.unshift(score);
  if (user.scores.length > 5) {
    user.scores.pop(); // Remove oldest
  }
  writeDB(db);
  res.json(user.scores);
});

// Delete a score
app.delete('/api/user/scores/:index', authenticate, (req, res) => {
  const db = readDB();
  const user = db.users.find(u => u.id === req.user.id);
  const idx = parseInt(req.params.index);
  if (idx >= 0 && idx < user.scores.length) {
    user.scores.splice(idx, 1);
    writeDB(db);
    res.json(user.scores);
  } else {
    res.status(400).json({ error: 'Invalid score index' });
  }
});

// ==================== DRAWS ====================

app.post('/api/admin/draws', authenticate, adminOnly, (req, res) => {
  const db = readDB();
  
  // Draw 5 unique numbers between 1-45
  const drawnNumbers = [];
  while (drawnNumbers.length < 5) {
    const num = Math.floor(Math.random() * 45) + 1;
    if (!drawnNumbers.includes(num)) drawnNumbers.push(num);
  }
  drawnNumbers.sort((a, b) => a - b);

  const drawId = uuidv4();
  const date = new Date().toISOString();
  
  const results = [];
  let t5 = 0, t4 = 0, t3 = 0;

  // Prize pool calculation
  const currentJackpot = db.platformStats?.jackpotPool || 0;
  let prizePool = 1000 + currentJackpot;
  let nextJackpot = 0;
  
  const c5 = prizePool * 0.40;
  const c4 = prizePool * 0.35;
  const c3 = prizePool * 0.25;

  // Count winners first
  db.users.forEach(user => {
    if (user.role === 'admin' || !user.subscription || user.scores.length < 5) return;
    const matches = user.scores.filter(s => drawnNumbers.includes(s)).length;
    if (matches >= 3) {
      if (matches === 5) t5++;
      if (matches === 4) t4++;
      if (matches === 3) t3++;
      results.push({ userId: user.id, username: user.username, matches, scores: [...user.scores] });
    }
    user.drawsEntered = (user.drawsEntered || 0) + 1;
  });

  if (t5 === 0) {
    nextJackpot = c5;
  }

  // Assign payouts
  results.forEach(r => {
    const u = db.users.find(u => u.id === r.userId);
    let won = 0;
    if (r.matches === 5 && t5 > 0) won = c5 / t5;
    if (r.matches === 4 && t4 > 0) won = c4 / t4;
    if (r.matches === 3 && t3 > 0) won = c3 / t3;
    
    won = Math.round(won * 100) / 100;
    u.winnings = (u.winnings || 0) + won;
    
    db.claims.push({
      id: uuidv4(),
      userId: u.id,
      username: u.username,
      drawId,
      date,
      matches: r.matches,
      amount: won,
      status: 'pending',
      proofUrl: null
    });
  });

  // Update platform stats
  if (!db.platformStats) {
    db.platformStats = { totalPrizePool: 0, totalDonated: 0, totalDraws: 0, jackpotPool: 0 };
  }
  db.platformStats.jackpotPool = nextJackpot;
  db.platformStats.totalDraws = (db.platformStats.totalDraws || 0) + 1;
  db.platformStats.totalPrizePool = (db.platformStats.totalPrizePool || 0) + prizePool;

  const eligibleCount = db.users.filter(u => u.role !== 'admin' && u.subscription && u.scores.length >= 5).length;

  const drawRecord = { 
    id: drawId, 
    date, 
    numbers: drawnNumbers, 
    results,
    prizePool: Math.round(prizePool * 100) / 100,
    eligiblePlayers: eligibleCount,
    totalWinners: results.length
  };
  db.draws.push(drawRecord);
  writeDB(db);

  res.json(drawRecord);
});

// Get all draws
app.get('/api/draws', (req, res) => {
  const db = readDB();
  res.json(db.draws.slice().reverse()); // Latest first
});

// Get draw history for user
app.get('/api/user/draw-history', authenticate, (req, res) => {
  const db = readDB();
  const userDraws = db.draws
    .filter(d => d.results.some(r => r.userId === req.user.id))
    .map(d => ({
      ...d,
      userResult: d.results.find(r => r.userId === req.user.id)
    }))
    .reverse();
  res.json(userDraws);
});

// ==================== CLAIMS ====================

app.get('/api/user/claims', authenticate, (req, res) => {
  const db = readDB();
  const userClaims = db.claims.filter(c => c.userId === req.user.id);
  res.json(userClaims);
});

app.post('/api/user/claims/:id/upload', authenticate, (req, res) => {
  const db = readDB();
  const claim = db.claims.find(c => c.id === req.params.id && c.userId === req.user.id);
  if (claim) {
    claim.proofUrl = "Scorecard_Proof_" + Date.now() + ".pdf";
    writeDB(db);
    res.json({ success: true, claim });
  } else {
    res.status(404).json({ error: 'Claim not found' });
  }
});

// ==================== ADMIN ENDPOINTS ====================

app.get('/api/admin/claims', authenticate, adminOnly, (req, res) => {
  const db = readDB();
  res.json(db.claims);
});

app.post('/api/admin/claims/:id/verify', authenticate, adminOnly, (req, res) => {
  const db = readDB();
  const claim = db.claims.find(c => c.id === req.params.id);
  if (claim) {
    claim.status = 'verified';
    writeDB(db);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Claim not found' });
  }
});

app.get('/api/admin/users', authenticate, adminOnly, (req, res) => {
  const db = readDB();
  const users = db.users.filter(u => u.role === 'user').map(u => {
    const { password, token, ...userData } = u;
    return userData;
  });
  res.json(users);
});

// Platform Stats
app.get('/api/stats', (req, res) => {
  const db = readDB();
  const activeMembers = db.users.filter(u => u.role === 'user' && u.subscription).length;
  const totalMembers = db.users.filter(u => u.role === 'user').length;
  const totalDonated = db.charities.reduce((sum, c) => sum + (c.totalRaised || 0), 0);
  
  res.json({
    activeMembers,
    totalMembers,
    totalDraws: db.platformStats?.totalDraws || 0,
    totalPrizePool: db.platformStats?.totalPrizePool || 50000,
    totalDonated,
    jackpotPool: db.platformStats?.jackpotPool || 2500,
    charityCount: db.charities.length
  });
});

// Admin Stats
app.get('/api/admin/stats', authenticate, adminOnly, (req, res) => {
  const db = readDB();
  const activeMembers = db.users.filter(u => u.role === 'user' && u.subscription).length;
  const totalMembers = db.users.filter(u => u.role === 'user').length;
  const monthlyRevenue = db.users.filter(u => u.subscription === 'monthly').length * 10;
  const yearlyRevenue = db.users.filter(u => u.subscription === 'yearly').length * 100;
  const totalDonated = db.charities.reduce((sum, c) => sum + (c.totalRaised || 0), 0);
  const pendingClaims = db.claims.filter(c => c.status === 'pending').length;
  const verifiedClaims = db.claims.filter(c => c.status === 'verified').length;

  res.json({
    activeMembers,
    totalMembers,
    monthlyRevenue,
    yearlyRevenue,
    totalRevenue: monthlyRevenue + yearlyRevenue,
    totalDraws: db.platformStats?.totalDraws || 0,
    totalDonated,
    jackpotPool: db.platformStats?.jackpotPool || 2500,
    pendingClaims,
    verifiedClaims,
    totalWinnersPaid: db.claims.filter(c => c.status === 'verified').reduce((s, c) => s + c.amount, 0)
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
