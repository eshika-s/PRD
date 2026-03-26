import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const res = await axios.post('/auth/login', { username, password });
        localStorage.setItem('token', res.data.token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
        const userRes = await axios.get('/auth/me');
        toast.success('Welcome back! 🎉');
        onLogin(userRes.data);
      } else {
        const res = await axios.post('/auth/register', { username, password, role });
        localStorage.setItem('token', res.data.token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
        const userRes = await axios.get('/auth/me');
        toast.success('Account created successfully! 🚀');
        onLogin(userRes.data);
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Authentication failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <motion.div 
        className="auth-hero"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="auth-hero-logo">⚡</div>
        <h1>
          <span className="text-gradient">Fairway Rewards</span>
        </h1>
        <p>
          Your gateway to winning prizes and making a difference through golf.
        </p>
      </motion.div>

      <motion.div 
        className="auth-card"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        <div className="auth-tabs">
          <button 
            className={`auth-tab ${isLogin ? 'active' : ''}`}
            onClick={() => { setIsLogin(true); setError(''); }}
          >
            Sign In
          </button>
          <button 
            className={`auth-tab ${!isLogin ? 'active' : ''}`}
            onClick={() => { setIsLogin(false); setError(''); }}
          >
            Sign Up
          </button>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              className="auth-error"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ marginBottom: '16px' }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="text"
              placeholder="you@example.com"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <AnimatePresence>
            {!isLogin && (
              <motion.div 
                className="form-group"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label className="form-label">Account Type</label>
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="user">Golfer (Member)</option>
                  <option value="admin">Administrator</option>
                </select>
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            type="submit" 
            className="btn btn-gold btn-lg" 
            disabled={loading}
            style={{ width: '100%', marginTop: '8px' }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="loading-spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} />
                Processing...
              </span>
            ) : (
              isLogin ? 'Sign In to Dashboard' : 'Create Account'
            )}
          </button>
        </form>
      </motion.div>

      <motion.div 
        className="auth-features"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <div className="auth-feature">
          <div className="auth-feature-icon">💰</div>
          <h4>Win Prizes</h4>
          <p>Monthly draws with cash rewards</p>
        </div>
        <div className="auth-feature">
          <div className="auth-feature-icon">⛳</div>
          <h4>Track Scores</h4>
          <p>Log your Stableford rounds</p>
        </div>
        <div className="auth-feature">
          <div className="auth-feature-icon">❤️</div>
          <h4>Give Back</h4>
          <p>10% goes to charity</p>
        </div>
      </motion.div>
    </div>
  );
}
