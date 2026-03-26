import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { FaLock, FaCreditCard, FaCheckCircle } from 'react-icons/fa';

export default function StripeCheckout({ plan, charity, onComplete, onCancel }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState('pay'); // pay, success

  const price = plan === 'monthly' ? 10 : 100;

  const handlePay = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    // Simulate real Stripe processing suspense
    await new Promise(r => setTimeout(r, 2000));
    setIsProcessing(false);
    setStep('success');
    await new Promise(r => setTimeout(r, 1500));
    onComplete();
  };

  return (
    <div className="stripe-overlay">
      <motion.div 
        className="stripe-modal"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
      >
        <AnimatePresence mode="wait">
          {step === 'pay' ? (
            <motion.div 
              key="pay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="stripe-header">
                <div className="stripe-logo">
                  <div className="stripe-avatar">⚡</div>
                  <div>
                    <h3>Fairway Rewards</h3>
                    <p>Subscribe to {plan === 'monthly' ? 'Monthly' : 'Yearly'} Plan</p>
                  </div>
                </div>
                <div className="stripe-price">${price}.00</div>
              </div>

              <form onSubmit={handlePay} className="stripe-form">
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value="user@example.com" disabled />
                </div>

                <div className="form-group">
                  <label>Card Information</label>
                  <div className="stripe-card-input">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e6e6e6', padding: '12px' }}>
                      <FaCreditCard color="#aab7c4" />
                      <input type="text" placeholder="4242 4242 4242 4242" required style={{ border: 'none', background: 'none', outline: 'none', width: '100%', fontSize: '0.95rem' }} />
                    </div>
                    <div style={{ display: 'flex' }}>
                      <input type="text" placeholder="MM / YY" required style={{ border: 'none', background: 'none', outline: 'none', borderRight: '1px solid #e6e6e6', padding: '12px', width: '50%', fontSize: '0.95rem' }} />
                      <input type="text" placeholder="CVC" required style={{ border: 'none', background: 'none', outline: 'none', padding: '12px', width: '50%', fontSize: '0.95rem' }} />
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label>Name on Card</label>
                  <input type="text" placeholder="Jane Doe" required />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', fontSize: '0.85rem', color: '#6b7c93' }}>
                  <FaLock size={12} />
                  <span>Secure payment processed by Stripe</span>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button type="button" className="btn btn-ghost" onClick={onCancel} style={{ flex: 1, color: '#6b7c93' }}>Cancel</button>
                  <button type="submit" className="btn btn-gold" disabled={isProcessing} style={{ flex: 2, background: '#635bff', color: 'white' }}>
                    {isProcessing ? (
                      <div className="loading-spinner" style={{ width: '18px', height: '18px', borderTopColor: 'white' }} />
                    ) : (
                      `Pay $${price}.00`
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          ) : (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ textAlign: 'center', padding: '40px 20px' }}
            >
              <div style={{ color: '#24b47e', fontSize: '4rem', marginBottom: '20px' }}>
                <FaCheckCircle />
              </div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '8px', color: '#1a1f36' }}>Payment Complete!</h2>
              <p style={{ color: '#6b7c93' }}>You are now a member of Fairway Rewards. Supporting {charity} ❤️</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
