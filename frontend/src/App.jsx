import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import axios from 'axios';
import Auth from './components/Auth';
import UserDashboard from './components/UserDashboard';
import AdminDashboard from './components/AdminDashboard';
import LandingPage from './components/LandingPage';
import './App.css';

const API = import.meta.env.VITE_API_URL || '/api';
axios.defaults.baseURL = API;

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      axios.get('/auth/me')
        .then(res => {
          setUser(res.data);
          setLoading(false);
        })
        .catch(() => {
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <span className="loading-text">Loading Fairway Rewards...</span>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1a1a24',
            color: '#f0f0f5',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            fontSize: '0.9rem',
            fontFamily: 'Inter, sans-serif',
            padding: '14px 18px',
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: '#0a0a0f' },
          },
          error: {
            iconTheme: { primary: '#f43f5e', secondary: '#0a0a0f' },
          },
        }}
      />
      
      <div className="app-wrapper">
        {user && (
          <header className="main-header">
            <div className="header-brand">
              <div className="header-logo">⚡</div>
              <div>
                <div className="header-title text-gradient">Fairway Rewards</div>
              </div>
            </div>
            
            <div className="header-nav">
              <div className="user-info">
                <div className={`user-avatar user-avatar-${user.role}`}>
                  {user.username?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <div className="user-name">{user.username}</div>
                  <div className="user-role">{user.role}</div>
                </div>
              </div>
              <button className="btn-logout" onClick={handleLogout}>Logout</button>
            </div>
          </header>
        )}

        <main>
          <Routes>
            <Route path="/" element={
              !user ? <LandingPage onNavigateAuth={() => {}} /> :
              user.role === 'admin' ? <Navigate to="/admin" /> : <Navigate to="/dashboard" />
            } />
            <Route path="/login" element={
              !user ? <Auth onLogin={setUser} /> : <Navigate to="/" />
            } />
            <Route path="/dashboard" element={
              user && user.role === 'user' ? 
                <UserDashboard user={user} setUser={setUser} /> : 
                <Navigate to="/" />
            } />
            <Route path="/admin" element={
              user && user.role === 'admin' ? 
                <AdminDashboard user={user} /> : 
                <Navigate to="/" />
            } />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
