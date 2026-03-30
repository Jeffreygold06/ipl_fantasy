import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Trophy, LogOut, Ticket } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { StatusBadge } from '../ui/StatusBadge';

export const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null; // Let router handle redirect to login

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-hide-mobile" style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex items-center gap-2">
            <Trophy size={24} color="#FACC15" /> {/* Trophy Gold */}
            <h1 style={{ fontWeight: 800, fontSize: '20px', color: 'var(--text-sidebar)', letterSpacing: '-0.5px' }}>
              IPL FANTASY
            </h1>
          </div>
        </div>

        <div className="sidebar-links" style={{ padding: '20px 0', flex: 1 }}>
          <div className="text-xs-caps sidebar-hide-mobile" style={{ padding: '0 20px', marginBottom: '8px', color: 'rgba(255,255,255,0.5)' }}>
            Navigation
          </div>
          
          <NavLink to="/" className={({isActive}) => `sidebar-item ${isActive ? 'active' : ''}`} end>
            <LayoutDashboard className="sidebar-icon" /> Dashboard
          </NavLink>
          
          <NavLink to="/matches" className={({isActive}) => `sidebar-item ${isActive ? 'active' : ''}`}>
             <Ticket className="sidebar-icon" /> Matches
          </NavLink>
          
          {user.role === 'ADMIN' && (
            <NavLink to="/admin/users" className={({isActive}) => `sidebar-item ${isActive ? 'active' : ''}`}>
              <Users className="sidebar-icon" /> Users
            </NavLink>
          )}

          <NavLink to="/leaderboard" className={({isActive}) => `sidebar-item ${isActive ? 'active' : ''}`}>
             <Trophy className="sidebar-icon" /> Leaderboard
          </NavLink>
        </div>

        {/* User Card at bottom of sidebar */}
        <div className="sidebar-hide-mobile" style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex flex-col gap-2">
            <div className="text-small" style={{color: 'var(--text-sidebar)'}}>{user.name}</div>
            <button className="btn btn-outline" style={{width:'100%', borderColor: 'rgba(255,255,255,0.2)', color: 'var(--text-sidebar)'}} onClick={handleLogout}>
              <LogOut size={16} style={{marginRight: '8px'}} /> Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        overflowY: 'auto',
        backgroundImage: 'linear-gradient(rgba(241, 245, 249, 0.85), rgba(241, 245, 249, 0.98)), url(/stadium_bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}>
        {/* Top Header */}
        <header className="header" style={{backgroundColor: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(12px)'}}>
          <div className="flex items-center gap-4">
            <StatusBadge variant={user.role === 'ADMIN' ? 'error' : 'blue'}>
              {user.role}
            </StatusBadge>
            {user.status === 'PENDING' && (
              <StatusBadge variant="warning">AWAITING APPROVAL</StatusBadge>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center" style={{ gap: '12px', padding: '6px 16px', backgroundColor: 'white', border: '1px solid var(--border-light)', borderRadius: '30px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <Trophy size={16} color="#FACC15" />
              <span className="text-small" style={{fontWeight:600}}>BALANCE</span>
              <span style={{ fontSize: '16px', fontWeight: 800, color: '#1D4ED8' }}>
                {user.points.toLocaleString()}
              </span>
            </div>
            <button className="btn btn-outline mobile-only hover-bg" onClick={handleLogout} style={{padding: '8px', border: 'none', backgroundColor: 'transparent'}}>
              <LogOut size={20} color="var(--color-danger)" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div style={{ padding: '32px', flex: 1 }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};
