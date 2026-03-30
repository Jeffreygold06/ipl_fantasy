import React, { useState } from 'react';
import { useAuth } from '../lib/auth';
import { db } from '../lib/db';
import { useNavigate } from 'react-router-dom';

export const Auth = () => {
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [subPlayers, setSubPlayers] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      const u = db.login(mobile, password);
      if (u) {
        login(mobile, password);
        navigate('/');
      } else {
        setError('Invalid mobile number or password.');
      }
    } else {
      if (db.getUsers().find(u => u.mobile === mobile)) {
        setError('Mobile number already exists');
        return;
      }
      
      const managerId = crypto.randomUUID();
      db.saveUser({
        id: managerId,
        name,
        mobile,
        password,
        role: 'USER',
        points: 0,
        status: 'PENDING'
      });

      if (subPlayers.trim()) {
        const list = subPlayers.split(',').map(s => s.trim()).filter(s => s);
        list.forEach(playerName => {
          const subPlayerId = crypto.randomUUID();
          db.saveUser({
            id: subPlayerId,
            name: playerName,
            mobile: `sub_${subPlayerId}`, // Unique placeholder to satisfy DB constraints
            managerId,
            role: 'USER',
            points: 0,
            status: 'PENDING'
          });
        });
      }

      setIsLogin(true);
      setError('Registration successful! Please login.');
      setMobile('');
      setName('');
      setPassword('');
      setSubPlayers('');
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      backgroundImage: 'linear-gradient(rgba(241, 245, 249, 0.6), rgba(241, 245, 249, 0.8)), url(/stadium_bg.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      padding: '24px'
    }}>
      <form onSubmit={handleSubmit} style={{ 
        width: '400px', 
        padding: '40px', 
        backgroundColor: 'rgba(255, 255, 255, 0.85)', 
        backdropFilter: 'blur(12px)',
        borderRadius: '16px', 
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        border: '1px solid rgba(255,255,255,0.5)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
           <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: '8px' }}>IPL FANTASY</h2>
           <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Welcome to the arena</p>
        </div>
        {error && <div style={{ color: 'red', marginBottom: '16px', fontSize: '13px' }}>{error}</div>}
        
        {!isLogin && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>Name</label>
            <input className="input-base" style={{ width: '100%' }} value={name} onChange={e => setName(e.target.value)} required />
          </div>
        )}
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>Mobile Number</label>
          <input className="input-base" type="tel" style={{ width: '100%' }} value={mobile} onChange={e => setMobile(e.target.value)} required />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>Password</label>
          <input className="input-base" type="password" style={{ width: '100%' }} value={password} onChange={e => setPassword(e.target.value)} required />
        </div>

        {!isLogin && (
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>
              Group Players (Comma Separated) - <span style={{color: 'var(--text-muted)'}}>Optional</span>
            </label>
            <textarea 
              className="input-base" 
              style={{ width: '100%', minHeight: '60px', resize: 'vertical' }} 
              value={subPlayers} 
              onChange={e => setSubPlayers(e.target.value)} 
              placeholder="e.g. Lucky, John, Issac"
            />
          </div>
        )}

        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginBottom: '16px' }}>
          {isLogin ? 'Login' : 'Register'}
        </button>

        <div style={{ textAlign: 'center', fontSize: '13px' }}>
          <span style={{ color: 'var(--text-secondary)' }}>
            {isLogin ? "Don't have an account? " : "Already registered? "}
          </span>
          <button type="button" style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 500 }} onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? 'Register' : 'Login'}
          </button>
        </div>
      </form>
    </div>
  );
};
