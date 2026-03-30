import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, Match, TEAM_ROSTERS } from '../lib/db';
import { useAuth } from '../lib/auth';
import { StatusBadge } from '../components/ui/StatusBadge';

export const MatchDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [match, setMatch] = useState<Match | null>(null);
  
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const managedUsers = user ? db.getManagedUsers(user.id) : [];

  useEffect(() => {
    if (id) {
      setMatch(db.getMatch(id) || null);
    }
  }, [id]);

  useEffect(() => {
    if (user && !selectedUserId) setSelectedUserId(user.id);
  }, [user, selectedUserId]);

  const [slip, setSlip] = useState({
     teamWin: { amount: '', selection: '' },
     halfCentury: { amount: '', selection: '' },
     threeWickets: { amount: '', selection: '' },
     motm: { amount: '', selection: '' },
     century: { enabled: false, amount: '' },
     fiveWickets: { enabled: false, amount: '' },
  });

  // Sync default team selection once match loads
  useEffect(() => {
     if (match && !slip.teamWin.selection) {
        setSlip(s => ({ ...s, teamWin: { ...s.teamWin, selection: match.team1 } }));
     }
  }, [match]);

  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  if (!match) return <div style={{padding: '32px'}}>Loading or Match Not Found...</div>;

  const isAdmin = user?.role === 'ADMIN';

  const getBettingUser = () => {
     if (!user) return null;
     if (selectedUserId === user.id) return user;
     return managedUsers.find(u => u.id === selectedUserId) || null;
  }

  const handleBetPlaced = () => {
     refreshUser();
     setMatch(db.getMatch(id!) || null); 
  }

  const hasBet = db.getBetsForMatch(id!).some(b => b.userId === selectedUserId);

  const totalWager = 
     (parseInt(slip.teamWin.amount) || 0) +
     (parseInt(slip.halfCentury.amount) || 0) +
     (parseInt(slip.threeWickets.amount) || 0) +
     (parseInt(slip.motm.amount) || 0) +
     (slip.century.enabled ? (parseInt(slip.century.amount) || 0) : 0) +
     (slip.fiveWickets.enabled ? (parseInt(slip.fiveWickets.amount) || 0) : 0);

  const handleBulkSubmit = () => {
     const bUser = getBettingUser();
     if (!bUser) return alert('No user selected');
     if (totalWager <= 0) return alert('You must wager points on at least one event.');
     if (bUser.points < totalWager) return alert(`Insufficient points. Need ${totalWager.toLocaleString()} but you have ${bUser.points.toLocaleString()}.`);

     let err = false;
     const bets: any[] = [];
     
     if (parseInt(slip.teamWin.amount) > 0) bets.push({ type: 'TEAM_WIN', amount: parseInt(slip.teamWin.amount), selection: slip.teamWin.selection, ratio: 1 });
     if (parseInt(slip.halfCentury.amount) > 0) { if(!slip.halfCentury.selection || slip.halfCentury.selection.includes('Select')) err = true; else bets.push({ type: 'HALF_CENTURY', amount: parseInt(slip.halfCentury.amount), selection: slip.halfCentury.selection, ratio: 5 }); }
     if (parseInt(slip.threeWickets.amount) > 0) { if(!slip.threeWickets.selection || slip.threeWickets.selection.includes('Select')) err = true; else bets.push({ type: 'THREE_WICKETS', amount: parseInt(slip.threeWickets.amount), selection: slip.threeWickets.selection, ratio: 5 }); }
     if (parseInt(slip.motm.amount) > 0) { if(!slip.motm.selection || slip.motm.selection.includes('Select')) err = true; else bets.push({ type: 'MAN_OF_MATCH', amount: parseInt(slip.motm.amount), selection: slip.motm.selection, ratio: 5 }); }
     if (slip.century.enabled && parseInt(slip.century.amount) > 0) bets.push({ type: 'CENTURY', amount: parseInt(slip.century.amount), selection: 'YES', ratio: 10 });
     if (slip.fiveWickets.enabled && parseInt(slip.fiveWickets.amount) > 0) bets.push({ type: 'FIVE_WICKETS', amount: parseInt(slip.fiveWickets.amount), selection: 'YES', ratio: 10 });

     if (err) return alert('Please select a player for all wagered events.');

     bUser.points -= totalWager;
     db.saveUser(bUser);
     db.addTransaction({ id: crypto.randomUUID(), userId: bUser.id, type: 'BET_PLACED', amount: -totalWager, timestamp: new Date().toISOString()});

     bets.forEach(b => {
        db.saveBet({
           id: crypto.randomUUID(), userId: bUser.id, matchId: match.id,
           amount: b.amount, ratio: b.ratio, type: b.type,
           selectedPlayer: b.type !== 'TEAM_WIN' ? b.selection : undefined,
           selectedTeam: b.type === 'TEAM_WIN' ? b.selection : undefined,
           status: 'PENDING'
        });
     });

     alert(`Successfully placed ${bets.length} bets! Good luck!`);
     handleBetPlaced();
  };

  return (
    <div>
      <div className="flex justify-between items-center" style={{ marginBottom: '24px' }}>
         <div>
            <button className="btn btn-outline text-xs-caps" style={{marginBottom: '16px'}} onClick={() => navigate('/matches')}>← Back to Matches</button>
            <h1 className="title-large" style={{fontSize: '28px'}}>{match.team1} vs {match.team2}</h1>
         </div>
         <StatusBadge variant={match.status === 'UPCOMING' ? 'blue' : match.status === 'LOCKED' ? 'error' : match.status === 'LIVE' ? 'warning' : 'success'}>
            {match.status === 'LOCKED' ? 'BETTING FROZEN' : match.status}
         </StatusBadge>
      </div>

      <div className="ipl-gradient" style={{ borderRadius: '12px', padding: '24px', marginBottom: '32px' }}>
         <div style={{fontSize: '14px', opacity: 0.9, marginBottom: '8px'}}>Match Details</div>
         <div style={{fontSize: '18px', fontWeight: 600}}>{new Date(match.date).toLocaleDateString()} at {new Date(match.date).toLocaleTimeString()}</div>
      </div>

      {isAdmin && match.status !== 'COMPLETED' && (
         <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
             <div className="ipl-card" style={{ padding: '20px', border: '2px solid var(--color-primary)', backgroundColor: 'white' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Betting Control</h3>
                <button 
                  className={match.status === 'LOCKED' ? "btn btn-primary" : "btn btn-outline"} 
                  onClick={() => {
                    const newStatus = match.status === 'LOCKED' ? 'UPCOMING' : 'LOCKED';
                    db.saveMatch({ ...match, status: newStatus });
                    setMatch({ ...match, status: newStatus });
                    alert(`Betting is now ${newStatus === 'LOCKED' ? 'FROZEN' : 'OPEN'} for this match.`);
                  }}
                  style={{ width: '100%', borderColor: match.status === 'LOCKED' ? 'var(--color-primary)' : 'var(--color-danger)', color: match.status === 'LOCKED' ? 'white' : 'var(--color-danger)' }}
                >
                  {match.status === 'LOCKED' ? 'Unfreeze Betting (Open for Bets)' : 'Freeze Betting (Close Bets)'}
                </button>
             </div>
             <SettleMatchPanel match={match} onSettled={() => { setMatch(db.getMatch(id!) || null); alert('Engine execution complete. Winnings distributed recursively.'); }} />
         </div>
      )}

      {!isAdmin && (
         <>
           {match.status !== 'UPCOMING' && match.status !== 'COMPLETED' && (
              <div style={{ padding: '24px', textAlign: 'center', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', marginBottom: '24px' }}>
                 <h3 style={{ color: '#B91C1C', fontWeight: 600, fontSize: '16px' }}>Betting is Frozen</h3>
                 <p style={{ color: '#991B1B', marginTop: '4px', fontSize: '14px' }}>The administrator has frozen betting for this match temporarily.</p>
              </div>
           )}
           
           {match.status === 'UPCOMING' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: 'white', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                   <span style={{fontWeight: 600, fontSize: '14px'}}>Placing Bet As:</span>
                   <select className="input-base" style={{padding: '8px 12px', width: '250px'}} value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}>
                     {user && <option value={user.id}>{user.name} ({user.points.toLocaleString()} pts)</option>}
                     {managedUsers.map(u => (
                       <option key={u.id} value={u.id}>{u.name} ({u.points.toLocaleString()} pts)</option>
                     ))}
                   </select>
                </div>

                {hasBet ? (
                   <div style={{padding: '32px', textAlign: 'center', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px'}}>
                      <h3 style={{color: '#B91C1C', fontWeight: 600, fontSize: '18px'}}>Bet Already Placed</h3>
                      <p style={{color: '#991B1B', marginTop: '8px', fontSize: '14px'}}>You have already submitted a betting slip for this match. Check your Dashboard!</p>
                   </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                       <BetInputCard title="Match Winner" ratio={1} selectionType="team" teams={[match.team1, match.team2]} value={slip.teamWin} onChange={(val: any) => setSlip({...slip, teamWin: val})} team1={match.team1} team2={match.team2} isActive={activeDropdown === 'winner'} onFocus={() => setActiveDropdown('winner')} />
                       <BetInputCard title="50 Runs" ratio={5} selectionType="player" value={slip.halfCentury} onChange={(val: any) => setSlip({...slip, halfCentury: val})} team1={match.team1} team2={match.team2} isActive={activeDropdown === '50runs'} onFocus={() => setActiveDropdown('50runs')} />
                       <BetInputCard title="3 Wickets" ratio={5} selectionType="player" value={slip.threeWickets} onChange={(val: any) => setSlip({...slip, threeWickets: val})} team1={match.team1} team2={match.team2} isActive={activeDropdown === '3wickets'} onFocus={() => setActiveDropdown('3wickets')} />
                       <BetInputCard title="Man of the Match" ratio={5} selectionType="player" value={slip.motm} onChange={(val: any) => setSlip({...slip, motm: val})} team1={match.team1} team2={match.team2} isActive={activeDropdown === 'motm'} onFocus={() => setActiveDropdown('motm')} />
                       
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', justifyContent: 'center' }}>
                          <ToggleBetInput title="Century in match?" ratio={10} value={slip.century} onChange={(val: any) => setSlip({...slip, century: val})} />
                          <ToggleBetInput title="5 Wickets in match?" ratio={10} value={slip.fiveWickets} onChange={(val: any) => setSlip({...slip, fiveWickets: val})} />
                       </div>
                    </div>
                    
                    <div className="flex justify-between items-center" style={{padding: '24px', backgroundColor: 'white', borderRadius: '12px', border: '2px solid var(--color-primary)', boxShadow: '0 4px 12px rgba(29, 78, 216, 0.15)'}}>
                       <div style={{display: 'flex', flexDirection: 'column'}}>
                          <span style={{fontSize: '13px', color: 'var(--text-muted)'}}>Total Combined Wager</span>
                          <span style={{fontWeight: 800, fontSize: '24px', color: 'var(--color-primary)'}}>{totalWager.toLocaleString()} pts</span>
                       </div>
                       <button className="btn btn-primary" style={{padding: '14px 40px', fontSize: '16px', fontWeight: 600}} onClick={handleBulkSubmit}>Submit Betting Slip</button>
                    </div>
                  </div>
                )}
              </div>
           )}
         </>
      )}

      {match.status === 'COMPLETED' && (
        <div style={{padding: '32px', textAlign: 'center', color: 'var(--text-muted)', backgroundColor: 'white', borderRadius: '12px', border: '1px solid var(--border-light)'}}>
            Match is completed. Winner: <strong style={{color: 'var(--text-primary)'}}>{match.winner}</strong>
        </div>
      )}
    </div>
  );
};

const CustomPlayerDropdown = ({ team1, team2, value, onChange }: any) => {
   const [open, setOpen] = useState(false);
   const t1Players = TEAM_ROSTERS[team1] ? [...TEAM_ROSTERS[team1]].sort() : [];
   const t2Players = TEAM_ROSTERS[team2] ? [...TEAM_ROSTERS[team2]].sort() : [];

   return (
      <div style={{ position: 'relative', width: '100%' }}>
         <button 
           type="button"
           className="input-base" 
           style={{ width: '100%', textAlign: 'left', backgroundColor: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
           onClick={() => setOpen(!open)}
         >
           <span style={{overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
              {value || 'Select Player...'}
           </span>
           <span style={{fontSize: '10px', opacity: 0.5}}>▼</span>
         </button>
         
         {open && (
            <>
               <div style={{position: 'fixed', inset: 0, zIndex: 90}} onClick={() => setOpen(false)}></div>
               <div style={{ 
                  position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, 
                  backgroundColor: 'white', border: '1px solid var(--border-light)', 
                  borderRadius: '12px', zIndex: 100, 
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                  overflow: 'hidden'
               }}>
                  <div style={{ display: 'flex', maxHeight: '350px', overflowY: 'auto' }}>
                     <div style={{ flex: 1, borderRight: '1px solid var(--border-light)', paddingBottom: '8px' }}>
                        <div style={{ padding: '8px 12px', fontSize: '12px', fontWeight: 700, backgroundColor: 'var(--bg-app)', borderBottom: '1px solid var(--border-light)', position: 'sticky', top: 0, color: 'var(--color-primary)' }}>
                           {team1} Squad
                        </div>
                        {t1Players.map(p => (
                           <div key={p} 
                                style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '13px', backgroundColor: value === p ? 'var(--bg-hover)' : 'transparent', borderBottom: '1px solid var(--border-light)', transition: 'background-color 0.1s' }} 
                                onClick={() => { onChange(p); setOpen(false); }}
                           >
                              {p}
                           </div>
                        ))}
                     </div>
                     <div style={{ flex: 1, paddingBottom: '8px' }}>
                        <div style={{ padding: '8px 12px', fontSize: '12px', fontWeight: 700, backgroundColor: 'var(--bg-app)', borderBottom: '1px solid var(--border-light)', position: 'sticky', top: 0, color: 'var(--color-primary)' }}>
                           {team2} Squad
                        </div>
                        {t2Players.map(p => (
                           <div key={p} 
                                style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '13px', backgroundColor: value === p ? 'var(--bg-hover)' : 'transparent', borderBottom: '1px solid var(--border-light)', transition: 'background-color 0.1s' }}
                                onClick={() => { onChange(p); setOpen(false); }}
                           >
                              {p}
                           </div>
                        ))}
                     </div>
                  </div>
                  <div style={{ padding: '12px', cursor: 'pointer', fontSize: '13px', backgroundColor: value === 'Other Player / Not Listed' ? 'var(--bg-hover)' : 'var(--bg-app)', borderTop: '1px solid var(--border-light)', textAlign: 'center', fontWeight: '600' }}
                       onClick={() => { onChange('Other Player / Not Listed'); setOpen(false); }}
                  >
                     Other Player / Not Listed
                  </div>
               </div>
            </>
         )}
      </div>
   );
}

const BetInputCard = ({ title, ratio, selectionType = 'player', teams = [], team1, team2, value, onChange, isActive, onFocus }: any) => {
   return (
      <div className="ipl-card" style={{height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: isActive ? 50 : 1}} onFocus={onFocus} onMouseEnter={onFocus}>
         <div className="ipl-card-header">
            <span>{title}</span>
            <span style={{color: 'var(--color-primary)'}}>1:{ratio}</span>
         </div>
         <div className="ipl-card-body flex flex-col" style={{ gap: '16px', flex: 1 }}>
            <div>
               <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>
                  {selectionType === 'team' ? 'Select Team' : 'Player Name'}
               </label>
               {selectionType === 'team' ? (
                  <select className="input-base" style={{width: '100%'}} value={value.selection} onChange={e => onChange({...value, selection: e.target.value})}>
                     {teams.map((t: string) => <option key={t} value={t}>{t}</option>)}
                  </select>
               ) : (
                  <CustomPlayerDropdown team1={team1} team2={team2} value={value.selection} onChange={(sel: string) => onChange({...value, selection: sel})} />
               )}
            </div>
            
            <div style={{marginTop: 'auto'}}>
               <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>Bet Amount</label>
               <input type="number" className="input-base" style={{width: '100%'}} value={value.amount} onChange={e => onChange({...value, amount: e.target.value})} min="0" placeholder="0 pts" />
            </div>
         </div>
      </div>
   );
};

const ToggleBetInput = ({ title, ratio, value, onChange }: any) => {
   return (
      <div style={{ padding: '16px 20px', backgroundColor: 'white', border: '1px solid var(--border-light)', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', transition: 'all 0.2s' }}>
         <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
               <label style={{ position: 'relative', display: 'inline-block', width: '40px', height: '24px', margin: 0 }}>
                  <input type="checkbox" checked={value.enabled} onChange={() => onChange({...value, enabled: !value.enabled})} style={{ opacity: 0, width: 0, height: 0 }} />
                  <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: value.enabled ? 'var(--color-primary)' : '#cbd5e1', transition: '.3s', borderRadius: '34px' }}>
                     <span style={{ position: 'absolute', content: '""', height: '18px', width: '18px', left: value.enabled ? '19px' : '3px', bottom: '3px', backgroundColor: 'white', transition: '.3s', borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}></span>
                  </span>
               </label>
               <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 600, fontSize: '15px' }}>{title}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Ratio 1:{ratio}</span>
               </div>
            </div>
            
            {value.enabled && (
               <div style={{ display: 'flex', alignItems: 'center', gap: '8px', animation: 'fadeIn 0.2s ease-in-out' }}>
                  <input 
                     type="number" 
                     className="input-base" 
                     style={{ width: '90px', padding: '8px 12px' }} 
                     value={value.amount} 
                     onChange={e => onChange({...value, amount: e.target.value})} 
                     placeholder="Pts" 
                     min="0" 
                  />
               </div>
            )}
         </div>
      </div>
   );
};

const SettleMatchPanel = ({ match, onSettled }: any) => {
   const [eventResults, setEventResults] = useState<Record<string, boolean>>({});
   
   // Fetch pending bets dynamically
   const pendingBets = db.getBetsForMatch(match.id).filter(b => b.status === 'PENDING');
   const uniqueEvents = Array.from(new Set(pendingBets.map(b => `${b.type}|${b.selectedTeam || b.selectedPlayer || 'YES'}`)));

   const handleToggle = (eventKey: string) => {
      setEventResults(prev => ({ ...prev, [eventKey]: !prev[eventKey] }));
   };

   const handleSubmit = () => {
      // 1. Mark match completed
      const winTeamEvent = Object.keys(eventResults).find(k => k.startsWith('TEAM_WIN|') && eventResults[k]);
      let winnerName = 'Unknown / Draw';
      if (winTeamEvent) winnerName = winTeamEvent.split('|')[1];
      
      const m = { ...match, status: 'COMPLETED', winner: winnerName };
      db.saveMatch(m);

      // 2. Loop all pending bets and resolve using eventResults map
      pendingBets.forEach(b => {
         const eventKey = `${b.type}|${b.selectedTeam || b.selectedPlayer || 'YES'}`;
         const won = eventResults[eventKey] === true;
         
         b.status = won ? 'WON' : 'LOST';
         db.saveBet(b);

         if (won) {
            const u = db.getUser(b.userId);
            if (u) {
               const winnings = b.amount + (b.amount * b.ratio);
               u.points += winnings;
               db.saveUser(u);
               db.addTransaction({ id: crypto.randomUUID(), userId: u.id, type: 'BET_WON', amount: winnings, timestamp: new Date().toISOString() });
            }
         }
      });

      onSettled();
   };

   return (
      <div className="ipl-card" style={{padding: '24px', marginBottom: '32px', border: '1px solid var(--color-primary)'}}>
         <h2 style={{fontSize: '20px', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px'}}>
            <span style={{width: '24px', height: '24px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', backgroundColor: 'var(--color-primary)', color: 'white', fontSize: '13px'}}>✓</span> 
            Admin: Automatic Event Settlement
         </h2>
         
         {uniqueEvents.length === 0 ? (
            <p style={{color: 'var(--text-muted)'}}>No users have placed any bets on this match yet.</p>
         ) : (
            <div style={{display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px'}}>
               <p style={{fontSize: '13px', color: 'var(--text-secondary)'}}>
                 The system has aggregated all open bets into exactly {uniqueEvents.length} unique events. Toggle 'Yes' if the event occurred.
               </p>
               {uniqueEvents.map(key => {
                  const [type, val] = key.split('|');
                  const label = `${type.replace(/_/g, ' ')} -> ${val}`;
                  const isYes = eventResults[key] || false;
                  
                  return (
                     <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', border: '1px solid var(--border-light)', borderRadius: '8px', backgroundColor: isYes ? '#F0FDF4' : 'white', transition: 'background-color 0.2s' }}>
                         <span style={{fontWeight: 600, fontSize: '15px'}}>{label}</span>
                         <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '28px', margin: 0 }}>
                           <input type="checkbox" checked={isYes} onChange={() => handleToggle(key)} style={{ opacity: 0, width: 0, height: 0 }} />
                           <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: isYes ? 'var(--color-success)' : '#e2e8f0', transition: '.3s', borderRadius: '34px' }}>
                              <span style={{ position: 'absolute', content: '""', height: '20px', width: '20px', left: isYes ? '24px' : '4px', bottom: '4px', backgroundColor: 'white', transition: '.3s', borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}></span>
                           </span>
                        </label>
                     </div>
                  );
               })}
            </div>
         )}
         
         <div style={{display: 'flex', gap: '16px'}}>
             {uniqueEvents.length > 0 && <button className="btn btn-primary" onClick={handleSubmit}>Save Results & Distribute Funds</button>}
             {uniqueEvents.length === 0 && <button className="btn btn-outline" onClick={() => { db.saveMatch({...match, status: 'COMPLETED'}); onSettled(); }}>Mark as Completed (No Bets)</button>}
         </div>
      </div>
   );
};
