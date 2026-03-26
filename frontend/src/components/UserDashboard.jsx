import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';
import StripeCheckout from './StripeCheckout';

export default function UserDashboard({ user, setUser }) {
  const [charities, setCharities] = useState([]);
  const [newScore, setNewScore] = useState('');
  const [claims, setClaims] = useState([]);
  const [drawHistory, setDrawHistory] = useState([]);
  const [plan, setPlan] = useState('monthly');
  const [selectedCharity, setSelectedCharity] = useState('');
  const [loadingAction, setLoadingAction] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [charitiesRes, claimsRes, drawsRes] = await Promise.all([
        axios.get('/charities'),
        axios.get('/user/claims'),
        axios.get('/user/draw-history').catch(() => ({ data: [] }))
      ]);
      setCharities(charitiesRes.data);
      setClaims(claimsRes.data);
      setDrawHistory(drawsRes.data);
      if (charitiesRes.data.length > 0) setSelectedCharity(charitiesRes.data[0].id);
    } catch (e) {
      console.error(e);
    }
  };

  const [showPayment, setShowPayment] = useState(false);

  const handleSubscribe = async () => {
    setShowPayment(true);
  };

  const finalizeSubscription = async () => {
    setLoadingAction('subscribe');
    try {
      const res = await axios.post('/subscription', { plan, charityId: selectedCharity });
      const userRes = await axios.get('/auth/me');
      setUser(userRes.data);
      toast.success(`Subscribed to ${plan} plan! Welcome aboard! 🎉`);
      setShowPayment(false);
    } catch (e) {
      toast.error('Failed to subscribe. Please try again.');
    } finally {
      setLoadingAction('');
    }
  };

  const handleSubmitScore = async () => {
    if (!user.subscription) {
      toast.error('You need an active subscription first!');
      return;
    }
    const score = parseInt(newScore);
    if (!score || score < 1 || score > 45) {
      toast.error('Score must be between 1 and 45');
      return;
    }

    setLoadingAction('score');
    try {
      const res = await axios.post('/user/scores', { score });
      setUser({ ...user, scores: res.data });
      setNewScore('');
      toast.success(`Score ${score} submitted! ⛳`);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to submit score');
    } finally {
      setLoadingAction('');
    }
  };

  const handleUploadProof = async (claimId) => {
    try {
      await axios.post(`/user/claims/${claimId}/upload`);
      toast.success('Scorecard proof uploaded! ✅');
      const claimsRes = await axios.get('/user/claims');
      setClaims(claimsRes.data);
    } catch (e) {
      toast.error('Upload failed');
    }
  };

  const renderScoreSlots = () => {
    const slots = [];
    for (let i = 0; i < 5; i++) {
      if (user.scores && i < user.scores.length) {
        slots.push(
          <motion.div
            key={i}
            className="score-pill"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.08, type: 'spring' }}
            title={`Score #${i + 1} (newest first)`}
          >
            {user.scores[i]}
          </motion.div>
        );
      } else {
        slots.push(
          <div key={i} className="score-slot-empty" title="Empty slot">
            —
          </div>
        );
      }
    }
    return slots;
  };

  const tabs = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'scores', label: '⛳ Scores' },
    { id: 'rewards', label: '🏆 Rewards' },
    { id: 'charity', label: '❤️ Charity' },
  ];

  if (!user.subscription) {
    return (
      <>
        <SubscriptionFlow 
          plan={plan} 
          setPlan={setPlan} 
          charities={charities} 
          selectedCharity={selectedCharity} 
          setSelectedCharity={setSelectedCharity} 
          handleSubscribe={handleSubscribe} 
          loading={loadingAction === 'subscribe'}
        />
        {showPayment && (
          <StripeCheckout 
            plan={plan}
            charity={charities.find(c => c.id === selectedCharity)?.name}
            onComplete={finalizeSubscription}
            onCancel={() => setShowPayment(false)}
          />
        )}
      </>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Tab Navigation */}
      <div className="admin-tabs" style={{ marginTop: '16px' }}>
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
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {/* Stats Row */}
            <div className="stats-grid">
              <div className="stat-card stat-card-gold">
                <span className="stat-label">Total Winnings</span>
                <span className="stat-value text-gradient-gold">${(user.winnings || 0).toFixed(2)}</span>
                <span className="stat-sub">Lifetime earnings</span>
              </div>
              <div className="stat-card stat-card-emerald">
                <span className="stat-label">Subscription</span>
                <span className="stat-value text-gradient-emerald" style={{ fontSize: '1.5rem' }}>
                  {user.subscription?.toUpperCase()}
                </span>
                <span className="stat-sub">
                  {user.subscription === 'monthly' ? '$10/month' : '$100/year'}
                </span>
              </div>
              <div className="stat-card stat-card-violet">
                <span className="stat-label">Scores Logged</span>
                <span className="stat-value" style={{ color: 'var(--accent-violet)' }}>
                  {user.scores?.length || 0}/5
                </span>
                <span className="stat-sub">
                  {(user.scores?.length || 0) >= 5 ? '✅ Draw eligible' : 'Need 5 to enter draw'}
                </span>
              </div>
              <div className="stat-card stat-card-rose">
                <span className="stat-label">Charity Impact</span>
                <span className="stat-value" style={{ color: 'var(--accent-emerald)', fontSize: '1.5rem' }}>
                  ${(user.totalContributed || 0).toFixed(2)}
                </span>
                <span className="stat-sub">Supporting: {user.charity || 'None'}</span>
              </div>
            </div>

            {/* Quick Score + Winnings */}
            <div className="dashboard-grid">
              <div className="card">
                <div className="card-header">
                  <h2>
                    <span className="card-icon card-icon-gold">⛳</span>
                    Your Score Numbers
                  </h2>
                  <span className="badge badge-gold">{user.scores?.length || 0}/5 slots</span>
                </div>
                <div className="scores-display" style={{ marginBottom: '16px' }}>
                  {renderScoreSlots()}
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  These are your draw numbers. Match them against monthly draws to win!
                </p>
                <div className="score-input-row">
                  <input
                    type="number"
                    placeholder="Enter score (1-45)"
                    value={newScore}
                    onChange={(e) => setNewScore(e.target.value)}
                    min="1"
                    max="45"
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmitScore()}
                  />
                  <button 
                    className="btn btn-gold btn-sm" 
                    onClick={handleSubmitScore}
                    disabled={loadingAction === 'score'}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {loadingAction === 'score' ? '...' : 'Add'}
                  </button>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h2>
                    <span className="card-icon card-icon-emerald">💰</span>
                    Winnings Summary
                  </h2>
                </div>
                <div className="winnings-display">
                  <div className="winnings-amount text-gradient-gold">
                    ${(user.winnings || 0).toFixed(2)}
                  </div>
                  <div className="winnings-label">Total Earnings</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
                  <div style={{ textAlign: 'center', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{claims.length}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Claims</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                      {claims.filter(c => c.status === 'verified').length}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Verified</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'scores' && (
          <motion.div
            key="scores"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="card" style={{ maxWidth: '700px' }}>
              <div className="card-header">
                <h2>
                  <span className="card-icon card-icon-gold">⛳</span>
                  Stableford Score Tracker
                </h2>
                <span className="badge badge-gold">{user.scores?.length || 0}/5 max</span>
              </div>

              <div style={{ 
                padding: '20px', 
                background: 'rgba(245,166,35,0.05)', 
                borderRadius: 'var(--radius-md)', 
                border: '1px solid rgba(245,166,35,0.1)',
                marginBottom: '24px'
              }}>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  <strong>How it works:</strong> Enter your Stableford scores (1-45). Your latest 5 scores become your draw numbers.
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  When you add a 6th score, the oldest is automatically removed. Each score must be unique.
                </p>
              </div>

              <div className="score-input-row" style={{ marginBottom: '24px' }}>
                <input
                  type="number"
                  placeholder="Enter your Stableford score (1-45)"
                  value={newScore}
                  onChange={(e) => setNewScore(e.target.value)}
                  min="1"
                  max="45"
                  style={{ flex: 1 }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmitScore()}
                />
                <button 
                  className="btn btn-gold" 
                  onClick={handleSubmitScore}
                  disabled={loadingAction === 'score'}
                >
                  {loadingAction === 'score' ? 'Submitting...' : 'Submit Score'}
                </button>
              </div>

              <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Your Draw Numbers (Newest First)
              </h3>

              <div className="scores-display" style={{ marginBottom: '20px' }}>
                {renderScoreSlots()}
              </div>

              {user.scores && user.scores.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {user.scores.map((s, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 18px',
                        background: 'var(--bg-tertiary)',
                        borderRadius: 'var(--radius-md)',
                        borderLeft: '3px solid var(--accent-gold)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <span style={{ 
                          width: '32px', height: '32px', borderRadius: 'var(--radius-full)', 
                          background: 'rgba(245,166,35,0.1)', display: 'flex', alignItems: 'center', 
                          justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent-gold)' 
                        }}>
                          #{idx + 1}
                        </span>
                        <span style={{ fontWeight: 600 }}>Score: <strong style={{ color: 'var(--accent-gold)', fontSize: '1.1rem' }}>{s}</strong></span>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {idx === 0 ? 'Most Recent' : `${idx + 1}${idx === 1 ? 'nd' : idx === 2 ? 'rd' : 'th'} Recent`}
                      </span>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">⛳</div>
                  <h3>No Scores Yet</h3>
                  <p>Enter your first Stableford score to start building your draw numbers.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'rewards' && (
          <motion.div
            key="rewards"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="card">
              <div className="card-header">
                <h2>
                  <span className="card-icon card-icon-gold">🏆</span>
                  Reward Claims & Draw History
                </h2>
              </div>

              {claims.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Matches</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {claims.map(c => (
                        <tr key={c.id}>
                          <td>{new Date(c.date).toLocaleDateString()}</td>
                          <td>
                            <span className={`badge badge-${c.matches === 5 ? 'gold' : c.matches === 4 ? 'violet' : 'emerald'}`}>
                              {c.matches}/5
                            </span>
                          </td>
                          <td style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>
                            ${c.amount.toFixed(2)}
                          </td>
                          <td>
                            <span className={`badge ${c.status === 'verified' ? 'badge-emerald' : 'badge-gold'}`}>
                              {c.status === 'verified' ? '✅ Paid' : '⏳ Pending'}
                            </span>
                          </td>
                          <td>
                            {c.status === 'pending' && !c.proofUrl && (
                              <button 
                                className="btn btn-violet btn-sm" 
                                onClick={() => handleUploadProof(c.id)}
                              >
                                Upload Scorecard
                              </button>
                            )}
                            {c.status === 'pending' && c.proofUrl && (
                              <span style={{ color: 'var(--accent-gold)', fontSize: '0.85rem' }}>
                                Awaiting Verification
                              </span>
                            )}
                            {c.status === 'verified' && (
                              <span style={{ color: 'var(--accent-emerald)', fontSize: '0.85rem' }}>
                                ✅ Complete
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">🎰</div>
                  <h3>No Wins Yet</h3>
                  <p>Make sure you have 5 scores logged. Draws happen monthly — keep playing!</p>
                </div>
              )}
            </div>

            {/* Draw History */}
            {drawHistory.length > 0 && (
              <div className="card" style={{ marginTop: '20px' }}>
                <div className="card-header">
                  <h2>
                    <span className="card-icon card-icon-violet">📜</span>
                    Your Draw Participation
                  </h2>
                </div>
                {drawHistory.map(d => (
                  <div key={d.id} style={{
                    padding: '16px',
                    background: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '10px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {new Date(d.date).toLocaleDateString()}
                      </span>
                      <span className={`badge badge-${d.userResult?.matches === 5 ? 'gold' : d.userResult?.matches === 4 ? 'violet' : 'emerald'}`}>
                        {d.userResult?.matches || 0} Matches
                      </span>
                    </div>
                    <div className="draw-numbers" style={{ justifyContent: 'flex-start' }}>
                      {d.numbers.map((n, i) => (
                        <div
                          key={i}
                          className={`score-pill ${user.scores?.includes(n) ? 'matched' : ''}`}
                          style={{ width: '40px', height: '40px', fontSize: '0.9rem' }}
                        >
                          {n}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'charity' && (
          <motion.div
            key="charity"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="dashboard-grid">
              <div className="card">
                <div className="card-header">
                  <h2>
                    <span className="card-icon card-icon-emerald">❤️</span>
                    Your Charity Impact
                  </h2>
                </div>
                <div className="winnings-display" style={{ 
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(139, 92, 246, 0.05))',
                  borderColor: 'rgba(16, 185, 129, 0.1)' 
                }}>
                  <div className="winnings-amount text-gradient-emerald">
                    ${(user.totalContributed || 0).toFixed(2)}
                  </div>
                  <div className="winnings-label">Total Contributed</div>
                </div>
                <div style={{ marginTop: '20px', padding: '16px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Currently Supporting</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                    {user.charity || 'No charity selected'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    10% of your subscription goes directly to this cause
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h2>
                    <span className="card-icon card-icon-violet">🌍</span>
                    All Supported Charities
                  </h2>
                </div>
                <div className="charity-list">
                  {charities.map(c => {
                    const maxRaised = Math.max(...charities.map(ch => ch.totalRaised || 0), 1);
                    return (
                      <div key={c.id} className={`charity-item ${user.charity === c.name ? 'selected' : ''}`}>
                        <div className="charity-radio">
                          <div className="charity-radio-inner" />
                        </div>
                        <div className="charity-info" style={{ flex: 1 }}>
                          <h4>{c.name}</h4>
                          <p>{c.description}</p>
                          <div className="charity-impact-bar">
                            <div 
                              className="charity-impact-fill" 
                              style={{ width: `${((c.totalRaised || 0) / maxRaised) * 100}%` }}
                            />
                          </div>
                        </div>
                        <span className="charity-raised">${(c.totalRaised || 0).toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ===== SUBSCRIPTION FLOW (shown when user has no subscription) =====
function SubscriptionFlow({ plan, setPlan, charities, selectedCharity, setSelectedCharity, handleSubscribe, loading }) {
  const [step, setStep] = useState(1);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ maxWidth: '700px', margin: '40px auto' }}
    >
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '12px' }}>
          Welcome to <span className="text-gradient">Fairway Rewards</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
          Choose your plan and start winning today
        </p>

        {/* Progress Steps */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', marginTop: '32px' }}>
          {['Choose Plan', 'Select Charity', 'Confirm'].map((label, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: 'var(--radius-full)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '0.9rem',
                background: step > i + 1 ? 'var(--accent-emerald)' : step === i + 1 ? 'var(--accent-gold)' : 'var(--bg-tertiary)',
                color: step >= i + 1 ? '#0a0a0f' : 'var(--text-muted)',
                transition: 'all 0.3s ease'
              }}>
                {step > i + 1 ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: '0.75rem', color: step === i + 1 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="card"
          >
            <div className="card-header">
              <h2>Choose Your Membership Plan</h2>
            </div>
            <div className="plan-options">
              <div 
                className={`plan-option ${plan === 'monthly' ? 'selected' : ''}`}
                onClick={() => setPlan('monthly')}
              >
                <div className="plan-name">Monthly</div>
                <div className="plan-price">$10</div>
                <div className="plan-period">per month</div>
              </div>
              <div 
                className={`plan-option ${plan === 'yearly' ? 'selected' : ''}`}
                onClick={() => setPlan('yearly')}
              >
                <div className="plan-name">Yearly</div>
                <div className="plan-price">$100</div>
                <div className="plan-period">per year</div>
                <div className="plan-save">Save $20!</div>
              </div>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px', textAlign: 'center' }}>
              10% of your subscription goes directly to charity 💚
            </p>
            <button className="btn btn-gold" style={{ width: '100%' }} onClick={() => setStep(2)}>
              Continue to Charity Selection →
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="card"
          >
            <div className="card-header">
              <h2>Support a Charity</h2>
              <span className="badge badge-emerald">10% of subscription</span>
            </div>
            <div className="charity-list">
              {charities.map(c => (
                <div
                  key={c.id}
                  className={`charity-item ${selectedCharity === c.id ? 'selected' : ''}`}
                  onClick={() => setSelectedCharity(c.id)}
                >
                  <div className="charity-radio">
                    <div className="charity-radio-inner" />
                  </div>
                  <div className="charity-info">
                    <h4>{c.name}</h4>
                    <p>{c.description}</p>
                  </div>
                  <span className="charity-raised">${(c.totalRaised || 0).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setStep(1)}>← Back</button>
              <button className="btn btn-gold" style={{ flex: 2 }} onClick={() => setStep(3)}>
                Review & Subscribe →
              </button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="card"
          >
            <div className="card-header">
              <h2>Confirm Subscription</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ 
                padding: '20px', 
                background: 'var(--bg-tertiary)', 
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Plan</div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', marginTop: '4px' }}>{plan.charAt(0).toUpperCase() + plan.slice(1)}</div>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-gold)' }}>
                  ${plan === 'monthly' ? '10' : '100'}
                </div>
              </div>
              <div style={{ 
                padding: '20px', 
                background: 'var(--bg-tertiary)', 
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Charity (10%)</div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', marginTop: '4px', color: 'var(--accent-emerald)' }}>
                    {charities.find(c => c.id === selectedCharity)?.name || 'Not selected'}
                  </div>
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                  ${plan === 'monthly' ? '1.00' : '10.00'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setStep(2)}>← Back</button>
              <button 
                className="btn btn-gold" 
                style={{ flex: 2 }} 
                onClick={handleSubscribe}
                disabled={loading}
              >
                {loading ? 'Processing...' : `Subscribe — $${plan === 'monthly' ? '10.00' : '100.00'}`}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
