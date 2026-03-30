import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { db, Transaction, User, Bet, Match } from '../lib/db';
import { StatusBadge } from '../components/ui/StatusBadge';

export const Dashboard = () => {
  const { user } = useAuth();
  
  if (user?.role === 'ADMIN') return <AdminDashboard />;
  return <UserDashboard />;
};

const UserDashboard = () => {
  const { user, refreshUser } = useAuth();
  const [bets, setBets] = useState<Bet[]>([]);
  const managedUsers = user ? db.getManagedUsers(user.id) : [];

  useEffect(() => {
    if (user) {
      const allBets = [
        ...db.getBetsForUser(user.id),
        ...db.getManagedUsers(user.id).flatMap(u => db.getBetsForUser(u.id))
      ].sort((a,b) => b.id.localeCompare(a.id)); 
      setBets(allBets);
    }
  }, [user]);

  const requestReEntry = () => {
    if (user?.points === 0) {
      db.requestReEntry(user.id);
      alert('Request sent to admin.');
      refreshUser();
    }
  }

  return (
    <div>
      <h1 className="title-large" style={{ marginBottom: '24px' }}>Overview</h1>
      
      {user?.status === 'PENDING' && (
        <div style={{ padding: '16px', backgroundColor: 'var(--color-warning)', color: 'white', borderRadius: '8px', marginBottom: '24px' }}>
          Your account is waiting for admin approval. Please transfer funds offline.
        </div>
      )}

      {user?.points === 0 && user?.status === 'APPROVED' && (
        <div style={{ padding: '16px', backgroundColor: 'var(--color-error-bg)', borderRadius: '8px', marginBottom: '24px', border: '1px solid var(--color-error)'}}>
          <h3 style={{ color: 'var(--color-error)', fontWeight: 600 }}>Zero Balance</h3>
          <p style={{ fontSize: '13px', margin: '8px 0'}}>You have lost all your points.</p>
          <button className="btn btn-primary" onClick={requestReEntry}>Request Re-entry (10k points)</button>
        </div>
      )}

      {managedUsers.length > 0 && (
        <div style={{ padding: '16px', backgroundColor: 'white', border: '1px solid var(--border-light)', borderRadius: '8px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Group Balances</h2>
          <div className="flex" style={{ gap: '16px', flexWrap: 'wrap' }}>
            {managedUsers.map(mu => (
              <div key={mu.id} style={{ padding: '8px 16px', backgroundColor: 'var(--bg-hover)', borderRadius: '6px' }}>
                <span className="text-small" style={{marginRight: '8px'}}>{mu.name}:</span>
                <span style={{ fontWeight: 600 }}>{mu.points.toLocaleString()} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid var(--border-light)', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', backgroundColor: 'var(--bg-app)' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>My Betting Tickets</h2>
        </div>
        <div className="table-responsive">
          <table className="clean-table">
            <thead>
              <tr>
                <th>Match</th>
                <th>Event</th>
                <th>Wager</th>
                <th>Potential Payout</th>
                <th style={{textAlign: 'right'}}>Status</th>
              </tr>
            </thead>
            <tbody>
              {bets.map(bet => {
                const m = db.getMatch(bet.matchId);
                const eventLabel = `${bet.type.replace(/_/g, ' ')} -> ${bet.selectedTeam || bet.selectedPlayer}`;
                const payout = bet.amount + (bet.amount * bet.ratio);
                return (
                  <tr key={bet.id} className="hover-bg">
                    <td>
                      <div style={{fontWeight: 600}}>{m ? `${m.team1} vs ${m.team2}` : 'Unknown Match'}</div>
                      <div className="text-xs-caps" style={{ marginTop: '4px', color: 'var(--text-muted)' }}>Ticket Holder: {db.getUser(bet.userId)?.name}</div>
                    </td>
                    <td style={{ fontWeight: 500 }}>{eventLabel}</td>
                    <td style={{ fontWeight: 600 }}>{bet.amount.toLocaleString()} pts</td>
                    <td style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{payout.toLocaleString()} pts (1:{bet.ratio})</td>
                    <td style={{textAlign: 'right'}}>
                      {bet.status === 'WON' && <StatusBadge variant="success">WON (+{payout.toLocaleString()})</StatusBadge>}
                      {bet.status === 'LOST' && <StatusBadge variant="error">LOST (-{bet.amount.toLocaleString()})</StatusBadge>}
                      {bet.status === 'PENDING' && <StatusBadge variant="warning">PENDING</StatusBadge>}
                    </td>
                  </tr>
                )
              })}
              {bets.length === 0 && (
                <tr><td colSpan={5} style={{textAlign: 'center', padding: '40px', color: 'var(--text-muted)'}}>No betting tickets issued yet. Place a bet to see it here!</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [matchesAwaiting, setMatchesAwaiting] = useState<Match[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setUsers([...db.getUsers()]);
    setTxs([...db.getTransactions()]);
    
    // Find all active matches that have 'PENDING' bets
    const pendingBets = db.getBets().filter(b => b.status === 'PENDING');
    const matchIdsWithBets = new Set(pendingBets.map(b => b.matchId));
    const activeMatches = db.getMatches().filter(m => matchIdsWithBets.has(m.id) && m.status !== 'COMPLETED');
    setMatchesAwaiting(activeMatches);
  }

  const pendingUsers = users.filter(u => u.status === 'PENDING');
  const pendingTxs = txs.filter(t => t.type === 'RE_ENTRY_REQUEST');

  const approveUser = (id: string) => {
    db.approveUser(id);
    refreshData();
  };
  
  const approveReEntry = (id: string) => {
    db.approveReEntry(id);
    refreshData();
  };

  const addSubPlayer = (managerId: string) => {
    const name = window.prompt("Enter Member Name:");
    if (name && name.trim()) {
      db.createSubPlayer(managerId, name.trim());
      alert("Member added successfully!");
      refreshData();
    }
  }

  return (
    <div style={{ paddingBottom: '40px' }}>
      <h1 className="title-large" style={{ marginBottom: '24px' }}>Admin Dashboard</h1>
      
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '32px' }}>
        {/* Pending Approvals Table */}
        <div style={{ flex: '1 1 300px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid var(--border-light)', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-light)', backgroundColor: '#FFFBEB' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#92400E' }}>Pending Approvals</h2>
          </div>
          <div className="table-responsive">
            <table className="clean-table">
              <thead><tr><th>User</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {pendingUsers.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{fontWeight: 600}}>{u.name}</div>
                      {u.managerId && <span className="text-small" style={{display: 'block', color: 'var(--text-muted)'}}>(Sub-player of {db.getUser(u.managerId)?.name})</span>}
                    </td>
                    <td><StatusBadge variant="warning">PENDING</StatusBadge></td>
                    <td><button className="btn btn-outline text-xs-caps" onClick={() => approveUser(u.id)}>Approve (Give 15k)</button></td>
                  </tr>
                ))}
                {pendingUsers.length === 0 && <tr><td colSpan={3} style={{textAlign: 'center', padding: '24px', color: 'var(--text-muted)'}}>No pending approvals.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Re-entries Table */}
        <div style={{ flex: '1 1 300px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid var(--border-light)', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-light)', backgroundColor: '#F0F9FF' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#075985' }}>Pending Re-entries</h2>
          </div>
          <div className="table-responsive">
            <table className="clean-table">
              <thead><tr><th>User</th><th>Type</th><th>Action</th></tr></thead>
              <tbody>
                {pendingTxs.map(t => (
                  <tr key={t.id}>
                    <td><div style={{fontWeight: 600}}>{db.getUser(t.userId)?.name}</div></td>
                    <td><StatusBadge variant="warning">RE-ENTRY</StatusBadge></td>
                    <td><button className="btn btn-primary text-xs-caps" onClick={() => approveReEntry(t.id)}>Approve</button></td>
                  </tr>
                ))}
                {pendingTxs.length === 0 && <tr><td colSpan={3} style={{textAlign: 'center', padding: '24px', color: 'var(--text-muted)'}}>No pending re-entries.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Settlement Section */}
      {matchesAwaiting.length > 0 && (
         <div style={{ marginBottom: '32px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid var(--color-primary)', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
           <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-light)', backgroundColor: 'var(--bg-app)' }}>
             <h2 style={{ fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary)' }}>
               ⚠️ Action Required: Matches Awaiting Settlement
             </h2>
           </div>
           <div className="table-responsive">
             <table className="clean-table">
                <thead><tr><th>Match</th><th>Date</th><th>Bettors Count</th><th>Action</th></tr></thead>
                <tbody>
                  {matchesAwaiting.map(m => {
                     const bettors = db.getBetsForMatch(m.id).filter(b => b.status === 'PENDING').length;
                     return (
                        <tr key={m.id}>
                          <td style={{fontWeight: 600}}>{m.team1} vs {m.team2}</td>
                          <td>{new Date(m.date).toLocaleDateString()}</td>
                          <td>{bettors} Bets Pending</td>
                          <td>
                             <button className="btn btn-primary text-xs-caps" onClick={() => navigate(`/matches/${m.id}`)}>
                                Go to Settlement Engine ➔
                             </button>
                          </td>
                        </tr>
                     );
                  })}
                </tbody>
             </table>
           </div>
         </div>
      )}

      {/* ALL REGISTERED USERS SECTION */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid var(--border-light)', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', backgroundColor: '#F9FAFB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>All Registered Players</h2>
          <div className="text-small" style={{color: 'var(--text-muted)'}}>Total: {users.length}</div>
        </div>
        <div className="table-responsive">
          <table className="clean-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Mobile / ID</th>
                <th>Password</th>
                <th>Status</th>
                <th>Points</th>
                <th style={{textAlign: 'right'}}>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.sort((a,b) => b.points - a.points).map(u => (
                <tr key={u.id} className="hover-bg">
                  <td>
                    <div style={{fontWeight: 600}}>{u.name}</div>
                    {u.managerId && <span className="text-small" style={{display: 'block', color: 'var(--text-muted)'}}>Sub-player of {db.getUser(u.managerId)?.name}</span>}
                  </td>
                  <td style={{fontFamily: 'monospace', fontSize: '13px'}}>{u.mobile || <span style={{color: '#9CA3AF', fontStyle: 'italic'}}>Group Player</span>}</td>
                  <td style={{fontFamily: 'monospace', fontSize: '13px'}}>{u.password || <span style={{color: '#9CA3AF'}}>••••</span>}</td>
                  <td>
                    <StatusBadge variant={u.status === 'APPROVED' ? 'success' : 'warning'}>
                      {u.status}
                    </StatusBadge>
                  </td>
                  <td style={{fontWeight: 700, color: u.points > 0 ? 'var(--color-primary)' : 'var(--color-danger)'}}>
                    {u.points.toLocaleString()}
                  </td>
                  <td style={{textAlign: 'right'}}>
                    {!u.managerId && u.role !== 'ADMIN' && (
                      <button 
                        className="btn btn-outline text-xs-caps" 
                        style={{padding: '4px 12px', fontSize: '11px', borderColor: 'var(--color-primary)', color: 'var(--color-primary)'}}
                        onClick={() => addSubPlayer(u.id)}
                      >
                        + Add Member
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
