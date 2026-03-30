import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { Auth } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { Matches } from './pages/Matches';
import { MatchDetail } from './pages/MatchDetail';
import { Leaderboard } from './pages/Leaderboard';
import { db } from './lib/db';

// Minimal auth guard
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Auth />} />
      <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="matches" element={<Matches />} />
        <Route path="matches/:id" element={<MatchDetail />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="admin/users" element={<Dashboard />} /> {/* Reuse dashboard admin view */}
      </Route>
    </Routes>
  );
};

const App = () => {
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    db.syncFromCloud().then(() => setSynced(true)).catch((e: any) => {
       console.error("Sync failed", e);
       setSynced(true); // Fallback to local
    });
  }, []);

  if (!synced) return (
     <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--bg-body)'}}>
        <div className="title-medium" style={{color: 'var(--color-primary)'}}>Connecting to Global Database...</div>
     </div>
  );

  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
