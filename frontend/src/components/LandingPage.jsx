import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';

export default function LandingPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    axios.get('/stats').then(res => setStats(res.data)).catch(() => {});
  }, []);

  const fadeUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  const staggerContainer = {
    animate: {
      transition: { staggerChildren: 0.1 }
    }
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Header */}
      <header className="main-header">
        <div className="header-brand">
          <div className="header-logo">⚡</div>
          <div className="header-title text-gradient">Fairway Rewards</div>
        </div>
        <div className="header-nav">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/login')}>
            Sign In
          </button>
          <button className="btn btn-gold btn-sm" onClick={() => navigate('/login')}>
            Get Started
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <motion.section 
        style={{ textAlign: 'center', padding: '80px 20px 60px', maxWidth: '800px', margin: '0 auto' }}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <motion.div 
          style={{ marginBottom: '24px' }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        >
          <span className="badge badge-gold" style={{ fontSize: '0.85rem', padding: '8px 20px' }}>
            🏆 Season 2026 Now Live
          </span>
        </motion.div>
        
        <h1 style={{ fontSize: '3.5rem', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: '20px' }}>
          Play Golf.{' '}
          <span className="text-gradient">Win Rewards.</span><br />
          Make an Impact.
        </h1>
        
        <p style={{ fontSize: '1.15rem', color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: '600px', margin: '0 auto 40px' }}>
          Submit your scores, enter monthly draws, win cash prizes, and contribute to meaningful charities — all in one platform.
        </p>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-gold btn-lg" onClick={() => navigate('/login')}>
            Start Winning Today →
          </button>
          <button className="btn btn-ghost btn-lg" onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>
            How It Works
          </button>
        </div>
      </motion.section>

      {/* Live Stats Bar */}
      {stats && (
        <motion.section 
          style={{ maxWidth: '900px', margin: '0 auto 80px', padding: '0 20px' }}
          {...fadeUp}
          transition={{ delay: 0.4 }}
        >
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {[
              { label: 'Total Prize Pool', value: `$${(stats.totalPrizePool || 50000).toLocaleString()}`, color: 'gold' },
              { label: 'Active Members', value: stats.activeMembers || '0', color: 'emerald' },
              { label: 'Donated to Charity', value: `$${(stats.totalDonated || 41750).toLocaleString()}`, color: 'violet' },
              { label: 'Draws Completed', value: stats.totalDraws || '24', color: 'sky' },
            ].map((stat, i) => (
              <motion.div 
                key={i} 
                className={`stat-card stat-card-${stat.color}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
              >
                <span className="stat-label">{stat.label}</span>
                <span className={`stat-value text-gradient-${stat.color === 'sky' ? 'gold' : stat.color}`}>
                  {stat.value}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}

      {/* How It Works */}
      <motion.section 
        id="how-it-works"
        style={{ maxWidth: '1000px', margin: '0 auto 80px', padding: '0 20px' }}
        variants={staggerContainer}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
      >
        <motion.h2 
          style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 800, marginBottom: '48px', letterSpacing: '-0.03em' }}
          {...fadeUp}
        >
          How <span className="text-gradient">Fairway Rewards</span> Works
        </motion.h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
          {[
            { icon: '📝', title: 'Subscribe', desc: 'Choose monthly ($10) or yearly ($100) plan with 10% going to your chosen charity.' },
            { icon: '⛳', title: 'Log Scores', desc: 'Enter your Stableford scores (1-45). We keep your latest 5 rounds automatically.' },
            { icon: '🎰', title: 'Monthly Draw', desc: '5 random numbers are drawn each month. Your scores are your lottery numbers!' },
            { icon: '💰', title: 'Win Prizes', desc: 'Match 3, 4, or all 5 numbers to win from the prize pool. Unmatched jackpot rolls over.' },
            { icon: '❤️', title: 'Give Back', desc: '10% of every subscription directly supports the charity you believe in.' },
          ].map((step, i) => (
            <motion.div 
              key={i} 
              className="card" 
              style={{ textAlign: 'center', padding: '32px 20px' }}
              {...fadeUp}
              transition={{ delay: i * 0.1 }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>{step.icon}</div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>{step.title}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Prize Tiers */}
      <motion.section 
        style={{ maxWidth: '700px', margin: '0 auto 80px', padding: '0 20px' }}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        <h2 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 800, marginBottom: '36px' }}>
          Prize <span className="text-gradient-gold">Tiers</span>
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { matches: '5/5', tier: 'JACKPOT', share: '40%', color: 'gold', icon: '🏆' },
            { matches: '4/5', tier: 'RUNNER UP', share: '35%', color: 'violet', icon: '🥈' },
            { matches: '3/5', tier: 'THIRD TIER', share: '25%', color: 'emerald', icon: '🥉' },
          ].map((tier, i) => (
            <motion.div 
              key={i}
              className="card"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px' }}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '1.5rem' }}>{tier.icon}</span>
                <div>
                  <div className={`badge badge-${tier.color}`}>{tier.tier}</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Match {tier.matches} numbers
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800 }} className={`text-gradient-${tier.color === 'violet' ? 'gold' : tier.color}`}>
                  {tier.share}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>of prize pool</div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* CTA */}
      <motion.section 
        style={{ textAlign: 'center', padding: '60px 20px 80px', maxWidth: '600px', margin: '0 auto' }}
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '16px' }}>
          Ready to <span className="text-gradient-gold">Win</span>?
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '32px', fontSize: '1rem' }}>
          Join hundreds of golfers who are winning prizes and giving back to the community.
        </p>
        <button className="btn btn-gold btn-lg" onClick={() => navigate('/login')}>
          Create Your Account →
        </button>
      </motion.section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--glass-border)', padding: '24px 0', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          © 2026 Fairway Rewards. Play responsibly. 10% of subscriptions go to charity.
        </p>
      </footer>
    </div>
  );
}
