import { useEffect, useState } from 'react';
import { db, User } from '../lib/db';

export const Leaderboard = () => {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const list = db.getUsers().filter(u => u.status === 'APPROVED' && u.role === 'USER')
      .sort((a,b) => b.points - a.points);
    setUsers(list);
  }, []);

  return (
    <div>
      <h1 className="title-large" style={{ marginBottom: '24px' }}>Leaderboard</h1>

      <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid var(--border-light)', overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="clean-table">
          <thead>
            <tr>
              <th style={{width: '60px', textAlign: 'center'}}>Rank</th>
              <th>Player</th>
              <th style={{textAlign: 'right'}}>Total Points</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={u.id} className={i < 3 ? 'success-row' : ''}>
                <td style={{textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)'}}>
                  #{i + 1}
                </td>
                <td style={{fontWeight: 500}}>{u.name}</td>
                <td style={{textAlign: 'right', fontWeight: 700, color: 'var(--color-primary)'}}>
                  {u.points.toLocaleString()}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={3} style={{textAlign: 'center', padding: '32px'}}>No players ranked yet.</td></tr>
            )}
          </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
