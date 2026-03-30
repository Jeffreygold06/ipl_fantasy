import { useEffect, useState } from 'react';
import { db, Match } from '../lib/db';
import { useAuth } from '../lib/auth';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useNavigate } from 'react-router-dom';

export const Matches = () => {
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    setMatches(db.getMatches().sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
  }, []);

  // Group matches by date
  const groupedMatches = matches.reduce((acc, match) => {
    const dateObj = new Date(match.date);
    const formattedDate = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    if (!acc[formattedDate]) acc[formattedDate] = [];
    acc[formattedDate].push(match);
    return acc;
  }, {} as Record<string, Match[]>);

  return (
    <div>
      <div className="flex justify-between items-center" style={{ marginBottom: '24px' }}>
        <h1 className="title-large">Schedule</h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {Object.entries(groupedMatches).map(([dateLabel, dailyMatches]) => (
           <div key={dateLabel}>
              {/* Date Header */}
              <div style={{ backgroundColor: '#F3F3F3', padding: '12px 24px', borderRadius: '8px', color: '#111827', fontWeight: 600, fontSize: '15px', marginBottom: '16px' }}>
                 {dateLabel}
              </div>
              
              {/* Grid of Matches for the day */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
                 {dailyMatches.map((m) => {
                    const globalIndex = matches.findIndex(mch => mch.id === m.id) + 1;
                    return <BingMatchCard key={m.id} match={m} globalIndex={globalIndex} />
                 })}
              </div>
           </div>
        ))}

        {matches.length === 0 && <div style={{textAlign: 'center', padding: '32px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid var(--border-light)'}}>No matches found.</div>}
      </div>
    </div>
  );
};

// Generates consistent colors for team avatars
const getTeamAvatarColor = (teamName: string) => {
   const colors = ['#EF4444', '#3B82F6', '#F59E0B', '#10B981', '#6366F1', '#EC4899', '#8B5CF6'];
   let hash = 0;
   for (let i = 0; i < teamName.length; i++) {
      hash = teamName.charCodeAt(i) + ((hash << 5) - hash);
   }
   return colors[Math.abs(hash) % colors.length];
};

const BingMatchCard = ({ match, globalIndex }: { match: Match, globalIndex: number }) => {
   const navigate = useNavigate();
   
   const dateObj = new Date(match.date);
   const formattedDate = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
   const formattedTime = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

   return (
      <div 
         onClick={() => navigate('/matches/' + match.id)}
         style={{ 
            backgroundColor: 'white', 
            borderRadius: '12px', 
            border: '1px solid #E5E7EB', 
            padding: '20px', 
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
            transition: 'transform 0.2s, box-shadow 0.2s',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
         }}
         onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
         onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)'; e.currentTarget.style.transform = 'translateY(0)' }}
      >
         {/* Top Metadata Layer */}
         <div style={{ display: 'flex', justifyContent: 'space-between', color: '#727272', fontSize: '13px', fontWeight: 500 }}>
            <div>IPL, 2026 • Match {globalIndex}</div>
            <div style={{textAlign: 'right'}}>{formattedDate}</div>
         </div>

         {/* Core Info Layer */}
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
               {/* Team 1 Row */}
               <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: getTeamAvatarColor(match.team1), color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 600 }}>
                     {match.team1.substring(0,1)}
                  </div>
                  <span style={{ fontSize: '17px', fontWeight: 700, color: '#000000' }}>{match.team1}</span>
               </div>
               {/* Team 2 Row */}
               <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: getTeamAvatarColor(match.team2), color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 600 }}>
                     {match.team2.substring(0,1)}
                  </div>
                  <span style={{ fontSize: '17px', fontWeight: 700, color: '#000000' }}>{match.team2}</span>
               </div>
            </div>

            {/* Status / Time */}
            <div style={{ textAlign: 'right' }}>
               {match.status === 'COMPLETED' ? (
                  <div style={{ fontSize: '14px', color: '#10B981', fontWeight: 600 }}>Completed</div>
               ) : match.status === 'LOCKED' ? (
                  <div style={{ fontSize: '14px', color: '#EF4444', fontWeight: 700 }}>Frozen</div>
               ) : match.status === 'LIVE' ? (
                  <StatusBadge variant="warning">LIVE</StatusBadge>
               ) : (
                  <div style={{ fontSize: '15px', color: '#000000', fontWeight: 600 }}>{formattedTime}</div>
               )}
            </div>
         </div>

         {/* Bottom Metadata Layer */}
         <div style={{ borderTop: '1px solid #F3F3F3', paddingTop: '12px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', color: '#727272', fontSize: '13px', fontWeight: 500 }}>
            <div>IPL Arena, India</div>
         </div>
      </div>
   );
};
