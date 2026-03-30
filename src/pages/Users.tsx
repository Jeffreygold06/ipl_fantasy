import { useEffect, useState } from 'react';
import { db, User } from '../lib/db';
import { StatusBadge } from '../components/ui/StatusBadge';

export const Users = () => {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setUsers([...db.getUsers()]);
  };

  const addSubPlayer = (managerId: string) => {
    const name = window.prompt("Enter Member Name:");
    if (name && name.trim()) {
      db.createSubPlayer(managerId, name.trim());
      alert("Member added successfully!");
      refreshData();
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center" style={{ marginBottom: '24px' }}>
        <h1 className="title-large">User Management</h1>
        <div className="text-small" style={{ color: 'var(--text-muted)' }}>Total Players: {users.length}</div>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid var(--border-light)', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <div className="table-responsive">
          <table className="clean-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Mobile / ID</th>
                <th>Password</th>
                <th>Status</th>
                <th>Points</th>
                <th style={{ textAlign: 'right' }}>Management</th>
              </tr>
            </thead>
            <tbody>
              {users.sort((a, b) => b.points - a.points).map(u => (
                <tr key={u.id} className="hover-bg">
                  <td>
                    <div style={{ fontWeight: 600 }}>{u.name}</div>
                    {u.managerId && (
                      <span className="text-small" style={{ display: 'block', color: 'var(--text-muted)' }}>
                        Member of {db.getUser(u.managerId)?.name}
                      </span>
                    )}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                    {u.mobile || <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>Group Player</span>}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                    {u.password || <span style={{ color: '#9CA3AF' }}>••••</span>}
                  </td>
                  <td>
                    <StatusBadge variant={u.status === 'APPROVED' ? 'success' : 'warning'}>
                      {u.status}
                    </StatusBadge>
                  </td>
                  <td style={{ fontWeight: 700, color: u.points > 0 ? 'var(--color-primary)' : 'var(--color-danger)' }}>
                    {u.points.toLocaleString()}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {!u.managerId && u.role !== 'ADMIN' && (
                      <button 
                        className="btn btn-primary text-xs-caps" 
                        style={{ padding: '6px 16px', fontSize: '11px' }}
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
