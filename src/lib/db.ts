import { createClient } from '@supabase/supabase-js';

// @ts-ignore
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
// @ts-ignore
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const supabase = createClient(supabaseUrl, supabaseKey);

export type UserRole = 'ADMIN' | 'USER';
export type UserStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type MatchStatus = 'UPCOMING' | 'LIVE' | 'LOCKED' | 'COMPLETED';
export type BetStatus = 'PENDING' | 'WON' | 'LOST';

export interface User {
  id: string;
  name: string;
  mobile: string;
  password?: string;
  managerId?: string;
  role: UserRole;
  points: number;
  status: UserStatus;
}

export interface Match {
  id: string;
  team1: string;
  team2: string;
  date: string; // ISO String
  status: MatchStatus;
  winner?: string; // team name
  manOfTheMatch?: string;
  halfCenturies?: string[];
  centuries?: string[];
  threeWickets?: string[];
  fiveWickets?: string[];
}

export interface Bet {
  id: string;
  matchId: string;
  userId: string;
  type: 'TEAM_WIN' | 'HALF_CENTURY' | 'THREE_WICKETS' | 'MAN_OF_MATCH' | 'CENTURY' | 'FIVE_WICKETS';
  ratio: number;
  amount: number;
  selectedPlayer?: string;
  selectedTeam?: string; // for TEAM_WIN
  status: BetStatus;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'INITIAL_GRANT' | 'RE_ENTRY_REQUEST' | 'RE_ENTRY_APPROVED' | 'BET_PLACED' | 'BET_WON';
  amount: number;
  timestamp: string;
  note?: string;
}

// Database wrapper
class LocalDB {
  public supabase = supabase;
  private get<T>(key: string): T[] {
    const data = localStorage.getItem(`ipl_fantasy_${key}`);
    return data ? JSON.parse(data) : [];
  }

  private set<T>(key: string, data: T[]) {
    localStorage.setItem(`ipl_fantasy_${key}`, JSON.stringify(data));
  }

  async syncFromCloud() {
    if (!supabaseUrl) return; // Skip if no keys
    try {
       const { data: users } = await supabase.from('users').select('*');
       if (users) this.set('users', users.map((u: any) => ({
          id: u.id, name: u.name, mobile: u.mobile, password: u.password, 
          managerId: u.manager_id, role: u.role, points: u.points, status: u.status
       })));

       const { data: matches } = await supabase.from('matches').select('*');
       if (matches) this.set('matches', matches.map((m: any) => ({
          id: m.id, team1: m.team1, team2: m.team2, date: m.date, 
          status: m.status, winner: m.winner, manOfTheMatch: m.man_of_the_match
       })));

       const { data: bets } = await supabase.from('bets').select('*');
       if (bets) this.set('bets', bets.map((b: any) => ({
          id: b.id, matchId: b.match_id, userId: b.user_id, type: b.type, 
          ratio: b.ratio, amount: b.amount, selectedPlayer: b.selected_player, 
          selectedTeam: b.selected_team, status: b.status
       })));

       const { data: txs } = await supabase.from('transactions').select('*');
       if (txs) this.set('transactions', txs.map((t: any) => ({
          id: t.id, userId: t.user_id, type: t.type, amount: t.amount, note: t.note, timestamp: t.created_at
       })));
    } catch (e) {
       console.error("Supabase Sync Error", e);
    }
  }

  // ---- Users ----
  getUsers(): User[] { return this.get<User>('users'); }
  getUser(id: string): User | undefined { return this.getUsers().find(u => u.id === id); }
  saveUser(user: User) {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx >= 0) users[idx] = user;
    else users.push(user);
    this.set('users', users);
    
    if (supabaseUrl) {
       supabase.from('users').upsert({
          id: user.id || undefined, name: user.name, mobile: user.mobile, password: user.password,
          manager_id: user.managerId, role: user.role, points: user.points, status: user.status
       }).then();
    }
  }

  // ---- Matches ----
  getMatches(): Match[] { return this.get<Match>('matches'); }
  getMatch(id: string): Match | undefined { return this.getMatches().find(m => m.id === id); }
  saveMatch(match: Match) {
    const matches = this.getMatches();
    const idx = matches.findIndex(m => m.id === match.id);
    if (idx >= 0) matches[idx] = match;
    else matches.push(match);
    this.set('matches', matches);
    
    if (supabaseUrl) {
       supabase.from('matches').upsert({
          id: match.id, team1: match.team1, team2: match.team2, date: match.date, 
          status: match.status, winner: match.winner, man_of_the_match: match.manOfTheMatch
       }).then();
    }
  }

  // ---- Bets ----
  getBets(): Bet[] { return this.get<Bet>('bets'); }
  getBetsForUser(userId: string): Bet[] { return this.getBets().filter(b => b.userId === userId); }
  getBetsForMatch(matchId: string): Bet[] { return this.getBets().filter(b => b.matchId === matchId); }
  saveBet(bet: Bet) {
    const bets = this.getBets();
    const idx = bets.findIndex(b => b.id === bet.id);
    if (idx >= 0) bets[idx] = bet;
    else bets.push(bet);
    this.set('bets', bets);
    
    if (supabaseUrl) {
       supabase.from('bets').upsert({
          id: bet.id || undefined, match_id: bet.matchId, user_id: bet.userId, type: bet.type, 
          ratio: bet.ratio, amount: bet.amount, selected_player: bet.selectedPlayer, 
          selected_team: bet.selectedTeam, status: bet.status
       }).then();
    }
  }

  // ---- Transactions ----
  getTransactions(userId?: string): Transaction[] {
    const txs = this.get<Transaction>('transactions');
    if (userId) return txs.filter(t => t.userId === userId).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return txs.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
  addTransaction(tx: Transaction) {
    const txs = this.get<Transaction>('transactions');
    txs.push(tx);
    this.set('transactions', txs);
    
    if (supabaseUrl) {
       supabase.from('transactions').insert({
          id: tx.id || undefined, user_id: tx.userId, type: tx.type, amount: tx.amount, 
          note: tx.note, created_at: tx.timestamp
       }).then();
    }
  }

  // ---- Business Logic Wrappers ----
  approveUser(userId: string) {
    const user = this.getUser(userId);
    if (user && user.status === 'PENDING') {
      user.status = 'APPROVED';
      user.points = 15000;
      this.saveUser(user);
      this.addTransaction({
        id: crypto.randomUUID(), userId, type: 'INITIAL_GRANT', amount: 15000, timestamp: new Date().toISOString()
      });
    }
  }

  createSubPlayer(managerId: string, name: string) {
    const id = crypto.randomUUID();
    const subPlayer: User = {
      id,
      name,
      mobile: `sub_${id}`, // Unique internal ID to satisfy DB constraints
      managerId,
      role: 'USER',
      points: 15000,
      status: 'APPROVED'
    };
    this.saveUser(subPlayer);
    this.addTransaction({
      id: crypto.randomUUID(), userId: id, type: 'INITIAL_GRANT', amount: 15000, timestamp: new Date().toISOString()
    });
    return subPlayer;
  }

  requestReEntry(userId: string) {
    const user = this.getUser(userId);
    if (user && user.points === 0) {
      this.addTransaction({
        id: crypto.randomUUID(), userId, type: 'RE_ENTRY_REQUEST', amount: 0, timestamp: new Date().toISOString()
      });
    }
  }

  approveReEntry(txId: string) {
    const txs = this.get<Transaction>('transactions');
    const txIndex = txs.findIndex(t => t.id === txId && t.type === 'RE_ENTRY_REQUEST');
    if (txIndex !== -1) {
      const tx = txs[txIndex];
      tx.type = 'RE_ENTRY_APPROVED';
      tx.amount = 15000;
      tx.timestamp = new Date().toISOString(); 
      this.set('transactions', txs);
      
      const user = this.getUser(tx.userId);
      if (user) {
        user.points += 15000;
        this.saveUser(user);
      }
    }
  }

  seedDataIfNeeded() {
    const users = this.getUsers();
    // If empty OR old schema (no password on admin1), reset the DB
    if (users.length === 0 || (users.length > 0 && !('password' in users[0]))) {
      
      this.set('users', []);
      this.set('matches', []);
      this.set('bets', []);
      this.set('transactions', []);

      this.saveUser({ id: '00000000-0000-0000-0000-000000000000', name: 'Admin User', mobile: '9999999999', password: 'admin', role: 'ADMIN', points: 0, status: 'APPROVED' });
    }
  }

  performProductionWipe() {
     if (!localStorage.getItem('ipl_fantasy_production_wipe_v1')) {
        const users = this.getUsers();
        let adminUser = users.find(u => u.role === 'ADMIN');
        if (!adminUser) {
           adminUser = { id: '00000000-0000-0000-0000-000000000000', name: 'Admin User', mobile: '9999999999', password: 'admin', role: 'ADMIN', points: 0, status: 'APPROVED' };
        }
        
        // Keep ONLY the admin account
        this.set('users', [adminUser]);
        // Wipe all betting history and transactions
        this.set('bets', []);
        this.set('transactions', []);
        
        localStorage.setItem('ipl_fantasy_production_wipe_v1', 'true');
     }
  }

  seedScheduleMatches() {
     if (!localStorage.getItem('ipl_fantasy_schedule_loaded_v4')) {
        this.set('matches', []); // clear existing dummy matches

        const schedule: Match[] = [
          { id: 'm0', team1: 'RCB', team2: 'SRH', date: '2026-03-29T23:45:00+05:30', status: 'UPCOMING', halfCenturies: [], centuries: [], threeWickets: [], fiveWickets: [] },
          { id: 'm1', team1: 'KKR', team2: 'MI', date: '2026-03-29T19:30:00+05:30', status: 'UPCOMING' },
          { id: 'm2', team1: 'CSK', team2: 'RR', date: '2026-03-30T19:30:00+05:30', status: 'UPCOMING' },
          { id: 'm3', team1: 'GT', team2: 'PBKS', date: '2026-03-31T19:30:00+05:30', status: 'UPCOMING' },
          { id: 'm4', team1: 'DC', team2: 'LSG', date: '2026-04-01T19:30:00+05:30', status: 'UPCOMING' },
          { id: 'm5', team1: 'SRH', team2: 'KKR', date: '2026-04-02T19:30:00+05:30', status: 'UPCOMING' },
          { id: 'm6', team1: 'PBKS', team2: 'CSK', date: '2026-04-03T19:30:00+05:30', status: 'UPCOMING' },
          { id: 'm7', team1: 'MI', team2: 'DC', date: '2026-04-04T15:30:00+05:30', status: 'UPCOMING' },
          { id: 'm8', team1: 'RR', team2: 'GT', date: '2026-04-04T19:30:00+05:30', status: 'UPCOMING' },
          { id: 'm9', team1: 'LSG', team2: 'SRH', date: '2026-04-05T15:30:00+05:30', status: 'UPCOMING' },
          { id: 'm10', team1: 'CSK', team2: 'RCB', date: '2026-04-05T19:30:00+05:30', status: 'UPCOMING' },
          { id: 'm11', team1: 'PBKS', team2: 'KKR', date: '2026-04-06T19:30:00+05:30', status: 'UPCOMING' },
          { id: 'm12', team1: 'MI', team2: 'RR', date: '2026-04-07T19:30:00+05:30', status: 'UPCOMING' },
          { id: 'm13', team1: 'GT', team2: 'DC', date: '2026-04-08T19:30:00+05:30', status: 'UPCOMING' },
          { id: 'm14', team1: 'LSG', team2: 'KKR', date: '2026-04-09T19:30:00+05:30', status: 'UPCOMING' },
          { id: 'm15', team1: 'RCB', team2: 'RR', date: '2026-04-10T19:30:00+05:30', status: 'UPCOMING' },
          { id: 'm16', team1: 'SRH', team2: 'PBKS', date: '2026-04-11T15:30:00+05:30', status: 'UPCOMING' },
          { id: 'm17', team1: 'DC', team2: 'CSK', date: '2026-04-11T19:30:00+05:30', status: 'UPCOMING' },
          { id: 'm18', team1: 'GT', team2: 'LSG', date: '2026-04-12T15:30:00+05:30', status: 'UPCOMING' },
          { id: 'm19', team1: 'RCB', team2: 'MI', date: '2026-04-12T19:30:00+05:30', status: 'UPCOMING' }
        ];

        schedule.forEach(m => this.saveMatch(m));
        localStorage.setItem('ipl_fantasy_schedule_loaded_v4', 'true');
     }
  }

  // Current session logic (simple mock)
  getLoggedInUser(): User | null {
    const id = localStorage.getItem('ipl_fantasy_simulated_user');
    return id ? (this.getUser(id) || null) : null;
  }
  
  logout() {
    localStorage.removeItem('ipl_fantasy_simulated_user');
  }

  getManagedUsers(managerId: string): User[] {
    return this.getUsers().filter(u => u.managerId === managerId);
  }

  login(mobile: string, password?: string) {
    const user = this.getUsers().find(u => u.mobile === mobile && (!password || u.password === password));
    if (user) {
      localStorage.setItem('ipl_fantasy_simulated_user', user.id);
      return user;
    }
    return null;
  }
}

export const db = new LocalDB();
db.performProductionWipe();
db.seedScheduleMatches();

export const TEAM_ROSTERS: Record<string, string[]> = {
  'CSK': ['Ruturaj Gaikwad', 'Dewald Brevis', 'Ayush Mhatre', 'Matthew Short', 'Sarfaraz Khan', 'Shivam Dube', 'Ramakrishna Ghosh', 'Jamie Overton', 'Anshul Kamboj', 'Prashant Veer', 'Zakary Foulkes', 'Aman Khan', 'MS Dhoni', 'Urvil Patel', 'Sanju Samson', 'Kartik Sharma', 'Shreyas Gopal', 'Khaleel Ahmed', 'Gurjapneet Singh', 'Mukesh Choudhary', 'Noor Ahmad', 'Akeal Hosein', 'Matt Henry', 'Rahul Chahar', 'Spencer Johnson'],
  'DC': ['Karun Nair', 'Nitish Rana', 'Sameer Rizvi', 'David Miller', 'Pathum Nissanka', 'Sahil Parakh', 'Prithvi Shaw', 'Ashutosh Sharma', 'Axar Patel', 'Ajay Jadav Mandal', 'Madhav Tiwari', 'Tripurana Vijay', 'Auqib Nabi Dar', 'Abishek Porel', 'KL Rahul', 'Tristan Stubbs', 'Dushmantha Chameera', 'Kuldeep Yadav', 'Mukesh Kumar', 'T Natarajan', 'Vipraj Nigam', 'Mitchell Starc', 'Lungi Ngidi', 'Kyle Jamieson'],
  'GT': ['Shubman Gill', 'M Shahrukh Khan', 'Sai Sudharsan', 'Nishant Sindhu', 'Rashid Khan', 'Manav Suthar', 'Rahul Tewatia', 'Washington Sundar', 'Arshad Khan', 'Ravisrinivasan Sai Kishore', 'Jason Holder', 'Anuj Rawat', 'Jos Buttler', 'Kumar Kushagra', 'Glenn Phillips', 'Tom Banton', 'Gurnoor Brar', 'Mohammed Siraj', 'Prasidh Krishna', 'Kagiso Rabada', 'Jayant Yadav', 'Ishant Sharma', 'Ashok Sharma', 'Luke Wood', 'Kulwant Khejroliya'],
  'RCB': ['Rajat Patidar', 'Tim David', 'Virat Kohli', 'Devdutt Padikkal', 'Jacob Bethell', 'Krunal Pandya', 'Venkatesh Iyer', 'Vihaan Malhotra', 'Romario Shepherd', 'Mangesh Yadav', 'Kanishk Chouhan', 'Satvik Deswal', 'Philip Salt', 'Jitesh Sharma', 'Jordan Cox', 'Abhinandan Singh', 'Josh Hazlewood', 'Rasikh Salam Dar', 'Bhuvneshwar Kumar', 'Suyash Sharma', 'Swapnil Singh', 'Nuwan Thushara', 'Jacob Duffy', 'Vicky Ostwal'],
  'PBKS': ['Shreyas Iyer', 'Priyansh Arya', 'Pyla Avinash', 'Harnoor Singh', 'Nehal Wadhera', 'Mitchell Owen', 'Musheer Khan', 'Shashank Singh', 'Marcus Stoinis', 'Suryansh Shedge', 'Cooper Connolly', 'Azmatullah Omarzai', 'Marco Jansen', 'Praveen Dubey', 'Prabhsimran Singh', 'Vishnu Vinod', 'Arshdeep Singh', 'Xavier Bartlett', 'Yuzvendra Chahal', 'Lockie Ferguson', 'Harpreet Brar', 'Vijaykumar Vyshak', 'Yash Thakur', 'Ben Dwarshuis', 'Vishal Nishad'],
  'KKR': ['Ajinkya Rahane', 'Manish Pandey', 'Rovman Powell', 'Angkrish Raghuvanshi', 'Rinku Singh', 'Finn Allen', 'Rahul Tripathi', 'Sarthak Ranjan', 'Ramandeep Singh', 'Anukul Roy', 'Cameron Green', 'Rachin Ravindra', 'Sunil Narine', 'Daksh Kamra', 'Tim Seifert', 'Tejasvi Dahiya', 'Vaibhav Arora', 'Umran Malik', 'Varun Chakaravarthy', 'Prashant Solanki', 'Kartik Tyagi', 'Matheesha Pathirana', 'Blessing Muzarabani', 'Saurabh Dubey', 'Navdeep Saini'],
  'SRH': ['Travis Head', 'Smaran Ravichandran', 'Aniket Verma', 'Abhishek Sharma', 'Kamindu Mendis', 'Nitish Kumar Reddy', 'Liam Livingstone', 'Harsh Dubey', 'Shivang Kumar', 'Ishan Kishan', 'Heinrich Klaasen', 'Salil Arora', 'Brydon Carse', 'Pat Cummins', 'Eshan Malinga', 'Jaydev Unadkat', 'Harshal Patel', 'Zeeshan Ansari', 'Sakib Hussain', 'Onkar Tarmale', 'Amit Kumar', 'Praful Hinge', 'Krains Fuletra', 'Shivam Mavi', 'David Payne'],
  'RR': ['Shubham Dubey', 'Shimron Hetmyer', 'Yashasvi Jaiswal', 'Vaibhav Sooryavanshi', 'Aman Rao Perala', 'Riyan Parag', 'Dasun Shanaka', 'Ravindra Jadeja', 'Dhruv Jurel', 'Lhuan-dre Pretorius', 'Donovan Ferreira', 'Ravi Singh', 'Jofra Archer', 'Nandre Burger', 'Tushar Deshpande', 'Kwena Maphaka', 'Sandeep Sharma', 'Yudhvir Singh Charak', 'Vignesh Puthur', 'Yash Raj Punja', 'Sushant Mishra', 'Ravi Bishnoi', 'Brijesh Sharma', 'Adam Milne', 'Kuldeep Sen'],
  'LSG': ['Himmat Singh', 'Aiden Markram', 'Akshat Raghuwanshi', 'Abdul Samad', 'Ayush Badoni', 'Arshin Kulkarni', 'Mitchell Marsh', 'Shahbaz Ahmed', 'Arjun Tendulkar', 'Wanindu Hasaranga', 'Rishabh Pant', 'Matthew Breetzke', 'Nicholas Pooran', 'Mukul Choudhary', 'Josh Inglis', 'Akash Maharaj Singh', 'Avesh Khan', 'Mohammed Shami', 'Prince Yadav', 'Mohsin Khan', 'Digvesh Singh Rathi', 'Manimaran Siddharth', 'Mayank Yadav', 'Anrich Nortje', 'Naman Tiwari'],
  'MI': ['Naman Dhir', 'Rohit Sharma', 'Suryakumar Yadav', 'Tilak Varma', 'Danish Malewar', 'Sherfane Rutherford', 'Hardik Pandya', 'Raj Bawa', 'Will Jacks', 'Mayank Rawat', 'Corbin Bosch', 'Mitchell Santner', 'Shardul Thakur', 'Atharva Ankolekar', 'Robin Minz', 'Ryan Rickelton', 'Quinton de Kock', 'Trent Boult', 'Ashwani Kumar', 'Jasprit Bumrah', 'Deepak Chahar', 'Mayank Markande', 'AM Ghazanfar', 'Raghu Sharma', 'Mohammed Salahuddin Izhar']
};

