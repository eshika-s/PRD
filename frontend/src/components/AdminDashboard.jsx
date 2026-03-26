import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function AdminDashboard({ user }) {
  const [users, setUsers] = useState([]);
  const [claims, setClaims] = useState([]);
  const [draws, setDraws] = useState([]);
  const [charities, setCharities] = useState([]);
  const [stats, setStats] = useState(null);
  const [drawResult, setDrawResult] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isDrawing, setIsDrawing] = useState(false);
  const [newCharity, setNewCharity] = useState({ name: '', description: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [uRes, cRes, dRes, chRes, sRes] = await Promise.all([
        axios.get('/admin/users'),
        axios.get('/admin/claims'),
        axios.get('/draws'),
        axios.get('/charities'),
        axios.get('/admin/stats')
      ]);
      setUsers(uRes.data);
      setClaims(cRes.data);
      setDraws(dRes.data);
      setCharities(chRes.data);
      setStats(sRes.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDraw = async () => {
    setIsDrawing(true);
    setDrawResult(null);
    
    // Simulate suspense
    await new Promise(r => setTimeout(r, 1500));
    
    try {
      const res = await axios.post('/admin/draws');
      setDrawResult(res.data);
      toast.success(`Draw complete! ${res.data.totalWinners} winner(s) found! 🎉`);
      fetchData();
    } catch (e) {
      toast.error('Draw failed. Please try again.');
    } finally {
      setIsDrawing(false);
    }
  };

  const verifyClaim = async (id) => {
    try {
      await axios.post(`/admin/claims/${id}/verify`);
      toast.success('Claim verified & payout marked! ✅');
      fetchData();
    } catch (e) {
      toast.error('Verification failed');
    }
  };

  const addCharity = async () => {
    if (!newCharity.name) {
      toast.error('Charity name is required');
      return;
    }
    try {
      await axios.post('/admin/charities', newCharity);
      toast.success('Charity added! ❤️');
      setNewCharity({ name: '', description: '' });
      fetchData();
    } catch (e) {
      toast.error('Failed to add charity');
    }
  };

  const deleteCharity = async (id) => {
    if (!window.confirm('Remove this charity?')) return;
    try {
      await axios.delete(`/admin/charities/${id}`);
      toast.success('Charity removed');
      fetchData();
    } catch (e) {
      toast.error('Failed to remove charity');
    }
  };

  const tabs = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'draw', label: '🎰 Run Draw' },
    { id: 'users', label: '👥 Users' },
    { id: 'claims', label: '🏆 Claims' },
    { id: 'charities', label: '❤️ Charities' },
    { id: 'history', label: '📜 Draw History' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin <span className="text-gradient">Control Panel</span></h1>
          <p className="page-subtitle">Manage platform operations, draws, and users</p>
        </div>
      </div>

      <div className="admin-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`admin-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ===== OVERVIEW ===== */}
        {activeTab === 'overview' && stats && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="stats-grid">
              <div className="stat-card stat-card-gold">
                <span className="stat-label">Total Revenue</span>
                <span className="stat-value text-gradient-gold">${stats.totalRevenue}</span>
                <span className="stat-sub">Monthly: ${stats.monthlyRevenue} · Yearly: ${stats.yearlyRevenue}</span>
              </div>
              <div className="stat-card stat-card-emerald">
                <span className="stat-label">Active Members</span>
                <span className="stat-value text-gradient-emerald">{stats.activeMembers}</span>
                <span className="stat-sub">of {stats.totalMembers} total</span>
              </div>
              <div className="stat-card stat-card-violet">
                <span className="stat-label">Draws Completed</span>
                <span className="stat-value" style={{ color: 'var(--accent-violet)' }}>{stats.totalDraws}</span>
                <span className="stat-sub">Jackpot Pool: ${stats.jackpotPool?.toFixed(2)}</span>
              </div>
              <div className="stat-card stat-card-rose">
                <span className="stat-label">Pending Claims</span>
                <span className="stat-value" style={{ color: 'var(--accent-rose)' }}>{stats.pendingClaims}</span>
                <span className="stat-sub">Verified: {stats.verifiedClaims}</span>
              </div>
            </div>

            <div className="dashboard-grid">
              <div className="card">
                <div className="card-header">
                  <h2><span className="card-icon card-icon-emerald">💰</span> Revenue Breakdown</h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Monthly Subscribers</span>
                    <strong style={{ color: 'var(--accent-gold)' }}>${stats.monthlyRevenue}/mo</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Yearly Subscribers</span>
                    <strong style={{ color: 'var(--accent-gold)' }}>${stats.yearlyRevenue}/yr</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Total Donated to Charities</span>
                    <strong style={{ color: 'var(--accent-emerald)' }}>${stats.totalDonated?.toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Total Paid to Winners</span>
                    <strong style={{ color: 'var(--accent-violet)' }}>${stats.totalWinnersPaid?.toFixed(2)}</strong>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h2><span className="card-icon card-icon-gold">🏆</span> Quick Actions</h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <button className="btn btn-gold" style={{ width: '100%' }} onClick={() => setActiveTab('draw')}>
                    🎰 Run New Draw
                  </button>
                  <button className="btn btn-violet" style={{ width: '100%' }} onClick={() => setActiveTab('claims')}>
                    🏆 Review Claims ({stats.pendingClaims} pending)
                  </button>
                  <button className="btn btn-emerald" style={{ width: '100%' }} onClick={() => setActiveTab('charities')}>
                    ❤️ Manage Charities
                  </button>
                  <button className="btn btn-ghost" style={{ width: '100%' }} onClick={() => setActiveTab('users')}>
                    👥 View All Users
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ===== DRAW ===== */}
        {activeTab === 'draw' && (
          <motion.div
            key="draw"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="card" style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto' }}>
              <div style={{ padding: '40px 20px' }}>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '12px' }}>
                  <span className="text-gradient-gold">Monthly Draw</span>
                </h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Draw 5 random numbers between 1–45 and match against all eligible users.
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '32px' }}>
                  Eligible: Users with active subscription and 5 logged scores
                </p>

                <button
                  className="btn btn-gold btn-lg"
                  onClick={handleDraw}
                  disabled={isDrawing}
                  style={{ padding: '20px 48px', fontSize: '1.2rem' }}
                >
                  {isDrawing ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="loading-spinner" style={{ width: '24px', height: '24px', borderWidth: '3px' }} />
                      Drawing Numbers...
                    </span>
                  ) : (
                    '🎲 Execute Draw'
                  )}
                </button>
              </div>

              {drawResult && (
                <motion.div
                  className="draw-result-card"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{ marginTop: '24px' }}
                >
                  <h3 style={{ marginBottom: '20px', color: 'var(--accent-gold)' }}>
                    🏆 Draw Results
                  </h3>
                  <div className="draw-numbers" style={{ marginBottom: '24px' }}>
                    {drawResult.numbers.map((n, i) => (
                      <motion.div
                        key={i}
                        className="draw-ball"
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: i * 0.2, type: 'spring' }}
                      >
                        {n}
                      </motion.div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
                    <div style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{drawResult.eligiblePlayers}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Eligible Players</div>
                    </div>
                    <div style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>{drawResult.totalWinners}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Winners</div>
                    </div>
                    <div style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-gold)' }}>${drawResult.prizePool}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Prize Pool</div>
                    </div>
                  </div>

                  {drawResult.results.length > 0 && (
                    <div style={{ textAlign: 'left' }}>
                      <h4 style={{ marginBottom: '12px', color: 'var(--text-secondary)' }}>Winners:</h4>
                      {drawResult.results.map((r, i) => (
                        <div key={i} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)',
                          marginBottom: '8px'
                        }}>
                          <span>{r.username}</span>
                          <span className={`badge badge-${r.matches === 5 ? 'gold' : r.matches === 4 ? 'violet' : 'emerald'}`}>
                            {r.matches}/5 Matches
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {drawResult.results.length === 0 && (
                    <p style={{ color: 'var(--text-muted)' }}>No winners this draw. Jackpot rolls over!</p>
                  )}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* ===== USERS ===== */}
        {activeTab === 'users' && (
          <motion.div
            key="users"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="card">
              <div className="card-header">
                <h2><span className="card-icon card-icon-sky">👥</span> Platform Users</h2>
                <span className="badge badge-sky">{users.length} users</span>
              </div>

              {users.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Username</th>
                        <th>Subscription</th>
                        <th>Charity</th>
                        <th>Scores</th>
                        <th>Winnings</th>
                        <th>Contributed</th>
                        <th>Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id}>
                          <td style={{ fontWeight: 600 }}>{u.username}</td>
                          <td>
                            {u.subscription ? (
                              <span className="badge badge-emerald">{u.subscription}</span>
                            ) : (
                              <span className="badge badge-rose">Inactive</span>
                            )}
                          </td>
                          <td style={{ color: u.charity ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                            {u.charity || '—'}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              {u.scores && u.scores.length > 0 ? (
                                u.scores.map((s, i) => (
                                  <span key={i} style={{
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                    width: '28px', height: '28px', borderRadius: 'var(--radius-full)',
                                    background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)',
                                    fontSize: '0.75rem', fontWeight: 600
                                  }}>
                                    {s}
                                  </span>
                                ))
                              ) : (
                                <span style={{ color: 'var(--text-muted)' }}>—</span>
                              )}
                            </div>
                          </td>
                          <td style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>
                            ${(u.winnings || 0).toFixed(2)}
                          </td>
                          <td style={{ color: 'var(--accent-emerald)' }}>
                            ${(u.totalContributed || 0).toFixed(2)}
                          </td>
                          <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {u.joinedAt ? new Date(u.joinedAt).toLocaleDateString() : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">👥</div>
                  <h3>No Users Yet</h3>
                  <p>Users will appear here when they register on the platform.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ===== CLAIMS ===== */}
        {activeTab === 'claims' && (
          <motion.div
            key="claims"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="card">
              <div className="card-header">
                <h2><span className="card-icon card-icon-gold">🏆</span> Reward Verifications</h2>
                <span className="badge badge-gold">{claims.filter(c => c.status === 'pending').length} pending</span>
              </div>

              {claims.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Draw Date</th>
                        <th>Match</th>
                        <th>Amount</th>
                        <th>Proof</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {claims.map(c => (
                        <tr key={c.id}>
                          <td style={{ fontWeight: 600 }}>{c.username}</td>
                          <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {new Date(c.date).toLocaleDateString()}
                          </td>
                          <td>
                            <span className={`badge badge-${c.matches === 5 ? 'gold' : c.matches === 4 ? 'violet' : 'emerald'}`}>
                              {c.matches}/5
                            </span>
                          </td>
                          <td style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>
                            ${c.amount.toFixed(2)}
                          </td>
                          <td>
                            {c.proofUrl ? (
                              <span className="badge badge-emerald">📄 Uploaded</span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>Awaiting</span>
                            )}
                          </td>
                          <td>
                            <span className={`badge ${c.status === 'verified' ? 'badge-emerald' : 'badge-gold'}`}>
                              {c.status}
                            </span>
                          </td>
                          <td>
                            {c.status === 'pending' && c.proofUrl && (
                              <button className="btn btn-emerald btn-sm" onClick={() => verifyClaim(c.id)}>
                                Verify & Pay
                              </button>
                            )}
                            {c.status === 'pending' && !c.proofUrl && (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Waiting for User</span>
                            )}
                            {c.status === 'verified' && (
                              <span style={{ color: 'var(--accent-emerald)' }}>✅ Paid</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">🏆</div>
                  <h3>No Claims Yet</h3>
                  <p>Claims will appear here after running draws.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ===== CHARITIES ===== */}
        {activeTab === 'charities' && (
          <motion.div
            key="charities"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="dashboard-grid">
              <div className="card">
                <div className="card-header">
                  <h2><span className="card-icon card-icon-emerald">❤️</span> Manage Charities</h2>
                  <span className="badge badge-emerald">{charities.length} charities</span>
                </div>

                {charities.map(c => {
                  const maxRaised = Math.max(...charities.map(ch => ch.totalRaised || 0), 1);
                  return (
                    <div key={c.id} style={{
                      display: 'flex', alignItems: 'center', gap: '16px',
                      padding: '16px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)',
                      marginBottom: '10px'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, marginBottom: '2px' }}>{c.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{c.description}</div>
                        <div className="charity-impact-bar" style={{ marginTop: '8px' }}>
                          <div className="charity-impact-fill" style={{ width: `${((c.totalRaised || 0) / maxRaised) * 100}%` }} />
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontWeight: 700, color: 'var(--accent-emerald)' }}>
                          ${(c.totalRaised || 0).toLocaleString()}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>raised</div>
                      </div>
                      <button 
                        className="btn btn-ghost btn-sm" 
                        onClick={() => deleteCharity(c.id)}
                        style={{ color: 'var(--accent-rose)', borderColor: 'rgba(244,63,94,0.2)' }}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="card">
                <div className="card-header">
                  <h2><span className="card-icon card-icon-violet">➕</span> Add New Charity</h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Charity Name</label>
                    <input
                      type="text"
                      placeholder="e.g., Children's Sports Fund"
                      value={newCharity.name}
                      onChange={(e) => setNewCharity({ ...newCharity, name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <input
                      type="text"
                      placeholder="Brief description of the charity"
                      value={newCharity.description}
                      onChange={(e) => setNewCharity({ ...newCharity, description: e.target.value })}
                    />
                  </div>
                  <button className="btn btn-emerald" onClick={addCharity} style={{ width: '100%' }}>
                    ❤️ Add Charity
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ===== DRAW HISTORY ===== */}
        {activeTab === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="card">
              <div className="card-header">
                <h2><span className="card-icon card-icon-violet">📜</span> Draw History</h2>
                <span className="badge badge-violet">{draws.length} draws</span>
              </div>

              {draws.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {draws.map((d, idx) => (
                    <motion.div
                      key={d.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      style={{
                        padding: '20px',
                        background: 'var(--bg-tertiary)',
                        borderRadius: 'var(--radius-md)',
                        borderLeft: '3px solid var(--accent-gold)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <div>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {new Date(d.date).toLocaleDateString()} · {new Date(d.date).toLocaleTimeString()}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <span className="badge badge-gold">{d.eligiblePlayers || '?'} players</span>
                          <span className="badge badge-emerald">{d.totalWinners || d.results?.length || 0} winners</span>
                        </div>
                      </div>
                      <div className="draw-numbers" style={{ justifyContent: 'flex-start', marginBottom: '12px' }}>
                        {d.numbers.map((n, i) => (
                          <div key={i} className="draw-ball" style={{ width: '44px', height: '44px', fontSize: '1rem' }}>
                            {n}
                          </div>
                        ))}
                      </div>
                      {d.results && d.results.length > 0 && (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {d.results.map((r, ri) => (
                            <span key={ri} style={{
                              padding: '6px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)',
                              fontSize: '0.8rem'
                            }}>
                              {r.username}: <strong>{r.matches}/5</strong>
                            </span>
                          ))}
                        </div>
                      )}
                      {(!d.results || d.results.length === 0) && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No winners — jackpot rolled over</p>
                      )}
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">📜</div>
                  <h3>No Draws Yet</h3>
                  <p>Run your first draw to see results here.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
