import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { auth, db } from '../firebase/config';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import { 
  LayoutDashboard, 
  Gamepad2, 
  Trophy, 
  Settings, 
  TrendingUp, 
  Users, 
  Activity, 
  Menu, 
  X,
  Search,
  Bell,
  ChevronRight,
  Download,
  Tv
} from 'lucide-react';
import TVView from '../components/TVView';
import AnalyticsView from '../components/AnalyticsView';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [hideSidebarOnTv, setHideSidebarOnTv] = useState(true);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const localAuth = window.localStorage.getItem('myg_admin_authenticated') === 'true';
    const isFirebaseAnonymous = auth.currentUser?.isAnonymous;
    return localAuth && !isFirebaseAnonymous;
  });

  useEffect(() => {
    // Reset body style to clear game-specific scrolling lockouts
    document.body.style.cssText = '';

    // Listen to direct Firebase Authentication changes
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user && !user.isAnonymous) {
        window.localStorage.setItem('myg_admin_authenticated', 'true');
        setIsAuthenticated(true);
      } else if (user && user.isAnonymous) {
        // Force require login if the current active Firebase user is anonymous
        window.localStorage.removeItem('myg_admin_authenticated');
        setIsAuthenticated(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    setLoading(true);
    setError('');

    // 1. Try real Firebase Auth email/password login
    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.localStorage.setItem('myg_admin_authenticated', 'true');
      setIsAuthenticated(true);
      setLoading(false);
      return;
    } catch (firebaseErr) {
      console.warn('Firebase Auth failed, trying local fallback:', firebaseErr.message);
      
      // 2. Check local fallback credentials for quick local testing
      if (email === 'admin@myg.in' && password === 'myg123') {
        window.localStorage.setItem('myg_admin_authenticated', 'true');
        setIsAuthenticated(true);
        setLoading(false);
        return;
      }
      
      // Map standard Firebase Auth errors to user-friendly messages
      let msg = 'Invalid credentials. Please try again.';
      if (firebaseErr.code === 'auth/user-not-found' || firebaseErr.code === 'auth/wrong-password') {
        msg = 'Incorrect email or password.';
      } else if (firebaseErr.code === 'auth/invalid-email') {
        msg = 'Invalid email address format.';
      } else if (firebaseErr.code === 'auth/network-request-failed') {
        msg = 'Network error. Please check your connection.';
      }
      
      setError(msg);
      setLoading(false);
    }
  };

  const formatPlayedAt = (val) => {
    if (!val || val === 'N/A') return 'N/A';
    try {
      let d;
      if (val && typeof val.toDate === 'function') {
        d = val.toDate();
      } else if (val && typeof val === 'object' && typeof val.seconds === 'number') {
        d = new Date(val.seconds * 1000);
      } else {
        d = new Date(val);
      }
      
      if (isNaN(d.getTime())) {
        return typeof val === 'object' ? 'N/A' : String(val);
      }
      
      const options = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
      return d.toLocaleDateString('en-US', options);
    } catch (e) {
      return typeof val === 'object' ? 'N/A' : String(val);
    }
  };

  const [players, setPlayers] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [selectedHour, setSelectedHour] = useState('current');

  const getCurrentHourBlock = () => {
    const now = new Date();
    const startHour = now.getHours();
    const endHour = (startHour + 1) % 24;
    
    const formatHour = (h) => {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const displayHour = h % 12 === 0 ? 12 : h % 12;
      return `${displayHour} ${ampm}`;
    };
    
    return `${formatHour(startHour)} - ${formatHour(endHour)}`;
  };

  const getSelectedHourLimits = (hourVal) => {
    const now = new Date();
    const startOfHour = new Date(now);
    const endOfHour = new Date(now);
    
    if (hourVal === 'current') {
      const currentH = now.getHours();
      startOfHour.setHours(currentH, 0, 0, 0);
      endOfHour.setHours(currentH, 59, 59, 999);
    } else {
      const selectedH = parseInt(hourVal, 10);
      startOfHour.setHours(selectedH, 0, 0, 0);
      endOfHour.setHours(selectedH, 59, 59, 999);
    }
    
    return { startOfHour, endOfHour };
  };

  const getSelectedHourBlockLabel = (hourVal) => {
    if (hourVal === 'current') {
      return getCurrentHourBlock();
    }
    const h = parseInt(hourVal, 10);
    const startH = h;
    const endH = (h + 1) % 24;
    const formatHour = (hour) => {
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 === 0 ? 12 : hour % 12;
      return `${displayHour} ${ampm}`;
    };
    return `${formatHour(startH)} - ${formatHour(endH)}`;
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    
    const fetchPlayers = async () => {
      setLoadingData(true);
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const fetchedPlayers = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          
          // Get the latest score entry's timestamp (played at)
          let lastPlayedAt = data.lastPlayedAt || data.lastplayed_at || data.playedAt || 'N/A';
          if (lastPlayedAt === 'N/A' && data.scores && data.scores.length > 0) {
            const dates = data.scores
              .map(s => s.playedAt || s['played at'] || s.played_at)
              .filter(Boolean);
            if (dates.length > 0) {
              dates.sort((a, b) => new Date(b) - new Date(a));
              lastPlayedAt = dates[0];
            }
          }
          if (lastPlayedAt === 'N/A' && data.createdAt) {
            lastPlayedAt = data.createdAt;
          }
          
          fetchedPlayers.push({
            id: doc.id,
            name: data.name || 'Anonymous',
            phone: data.phone || doc.id || 'N/A',
            age: data.age || 'N/A',
            highscore: data.highscore || 0,
            totalScore: data.totalScore || 0,
            lastPlayedAt: lastPlayedAt,
            createdAt: data.createdAt || 'N/A',
            rawScores: data.scores || []
          });
        });

        // Filter by the selected clock hour limits
        const { startOfHour, endOfHour } = getSelectedHourLimits(selectedHour);

        const hourlyPlayers = [];
        fetchedPlayers.forEach((player) => {
          let filteredScores = [];
          if (Array.isArray(player.rawScores) && player.rawScores.length > 0) {
            filteredScores = player.rawScores.filter(s => {
              const playedTime = s.playedAt || s['played at'] || s.played_at;
              if (!playedTime) return false;
              const d = new Date(playedTime);
              return d >= startOfHour && d <= endOfHour;
            });
          }

          if (filteredScores.length > 0) {
            const hourlyHigh = Math.max(...filteredScores.map(s => Number(s.score || 0)));
            const hourlyTotal = filteredScores.reduce((sum, s) => sum + Number(s.score || 0), 0);
            
            // Sort to find the latest playedAt within the selected hour
            const sortedScores = [...filteredScores].sort((a, b) => new Date(b.playedAt || b['played at'] || b.played_at) - new Date(a.playedAt || a['played at'] || a.played_at));
            const hourlyLast = sortedScores[0].playedAt || sortedScores[0]['played at'] || sortedScores[0].played_at;

            hourlyPlayers.push({
              ...player,
              highscore: hourlyHigh,
              totalScore: hourlyTotal,
              lastPlayedAt: hourlyLast
            });
          } else {
            // Fallback: check if the overall lastPlayedAt is within the selected hour
            if (player.lastPlayedAt && player.lastPlayedAt !== 'N/A') {
              const d = new Date(player.lastPlayedAt);
              if (d >= startOfHour && d <= endOfHour) {
                hourlyPlayers.push(player);
              }
            }
          }
        });
        
        // Sort players by highscore in descending order (highest score first)
        hourlyPlayers.sort((a, b) => b.highscore - a.highscore);
        
        // Assign ranks based on sorted highscore
        const rankedPlayers = hourlyPlayers.map((player, index) => ({
          ...player,
          rank: index + 1
        }));
        
        setPlayers(rankedPlayers);
      } catch (err) {
        console.error('Error fetching player data from Firestore:', err);
      } finally {
        setLoadingData(false);
      }
    };

    fetchPlayers();
  }, [isAuthenticated, selectedHour]);

  const downloadExcel = async () => {
    setLoadingData(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const allPlays = [];

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const name = data.name || 'Anonymous';
        const phone = data.phone || docSnap.id || 'N/A';
        const age = data.age || 'N/A';
        
        if (Array.isArray(data.scores) && data.scores.length > 0) {
          data.scores.forEach(s => {
            const playedTime = s.playedAt || s['played at'] || s.played_at;
            if (playedTime) {
              allPlays.push({
                name,
                phone,
                age,
                score: Number(s.score || 0),
                playedAt: new Date(playedTime)
              });
            }
          });
        } else if (data.highscore !== undefined || data.totalScore !== undefined) {
          // Fallback for single/legacy play
          const playedTime = data.lastPlayedAt || data.playedAt || data.createdAt;
          if (playedTime) {
            let parsedTime;
            if (playedTime && typeof playedTime.toDate === 'function') {
              parsedTime = playedTime.toDate();
            } else if (playedTime && typeof playedTime === 'object' && typeof playedTime.seconds === 'number') {
              parsedTime = new Date(playedTime.seconds * 1000);
            } else {
              parsedTime = new Date(playedTime);
            }
            
            if (!isNaN(parsedTime.getTime())) {
              allPlays.push({
                name,
                phone,
                age,
                score: Number(data.highscore || data.totalScore || 0),
                playedAt: parsedTime
              });
            }
          }
        }
      });

      if (allPlays.length === 0) {
        alert("No player game data found to export.");
        return;
      }

      // Helper to format date as "DD-MM-YYYY"
      const getDayString = (date) => {
        const d = new Date(date);
        if (isNaN(d.getTime())) return 'Unknown_Day';
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
      };

      // Helper to format hour slot like "9-10"
      const getHourSlotLabel = (date) => {
        const d = new Date(date);
        if (isNaN(d.getTime())) return 'Unknown_Hour';
        const startHour = d.getHours();
        const endHour = startHour + 1;
        return `${startHour}-${endHour}`;
      };

      // Group all plays across all days by sheet name (DD-MM-YYYY H-H)
      const playsBySheet = {};
      allPlays.forEach(play => {
        const dayStr = getDayString(play.playedAt);
        const hourSlot = getHourSlotLabel(play.playedAt);
        const sheetName = `${dayStr} ${hourSlot}`;
        if (!playsBySheet[sheetName]) {
          playsBySheet[sheetName] = [];
        }
        playsBySheet[sheetName].push(play);
      });

      // Sort plays within each sheet by score descending to determine rank
      Object.keys(playsBySheet).forEach(sheetName => {
        playsBySheet[sheetName].sort((a, b) => b.score - a.score);
      });

      // Helper to get chronological timestamp from sheet name "DD-MM-YYYY H-H" for sorting
      const getSheetTimestamp = (sheetName) => {
        const [datePart, hourPart] = sheetName.split(' ');
        if (!datePart || !hourPart) return 0;
        const [day, month, year] = datePart.split('-').map(Number);
        const [startHour] = hourPart.split('-').map(Number);
        return new Date(year, month - 1, day, startHour, 0, 0, 0).getTime();
      };

      // Sort sheets chronologically (oldest to newest)
      const sortedSheetNames = Object.keys(playsBySheet).sort((a, b) => {
        return getSheetTimestamp(a) - getSheetTimestamp(b);
      });

      const workbook = XLSX.utils.book_new();

      // 1. Create a combined sheet for all data across all hours and days
      const allDataRows = [];
      const sortedAllPlays = [...allPlays].sort((a, b) => b.playedAt - a.playedAt);
      
      sortedAllPlays.forEach(play => {
        const dayStr = getDayString(play.playedAt);
        const hourSlot = getHourSlotLabel(play.playedAt);
        const sheetName = `${dayStr} ${hourSlot}`;
        const slotIndex = playsBySheet[sheetName].findIndex(p => p === play);
        const slotRank = slotIndex !== -1 ? slotIndex + 1 : 'N/A';

        allDataRows.push({
          'Date': dayStr,
          'Hour Slot': hourSlot,
          'Hourly Rank': slotRank,
          'Player Name': play.name,
          'Phone Number': play.phone,
          'Age': play.age,
          'Score (Coins)': play.score,
          'Played At': play.playedAt.toLocaleString()
        });
      });

      const allDataSheet = XLSX.utils.json_to_sheet(allDataRows);
      XLSX.utils.book_append_sheet(workbook, allDataSheet, "All Data");

      // 2. Create individual sheets for each hour slot of every date
      sortedSheetNames.forEach(sheetName => {
        const slotRows = playsBySheet[sheetName].map((play, index) => ({
          'Hourly Rank': index + 1,
          'Player Name': play.name,
          'Phone Number': play.phone,
          'Age': play.age,
          'Score (Coins)': play.score,
          'Played At': play.playedAt.toLocaleString()
        }));
        
        const slotSheet = XLSX.utils.json_to_sheet(slotRows);
        
        // Sanitize sheet name just in case (max 31 chars)
        let cleanSheetName = sheetName.substring(0, 31).trim();
        XLSX.utils.book_append_sheet(workbook, slotSheet, cleanSheetName || 'Hour Slot');
      });

      // Write single Excel workbook containing all data
      XLSX.writeFile(workbook, `myG_Runner_Leaderboard_All_Time_Export.xlsx`);
    } catch (err) {
      console.error('Error generating hourly excel download:', err);
      alert('Error generating Excel file: ' + err.message);
    } finally {
      setLoadingData(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="login-overlay">
        <div className="login-box">
          <div className="login-header">
            <img src="/images/mygtrans.png" alt="myG" className="login-logo" />
            <h2 className="login-title">Admin Portal</h2>
            <p className="login-subtitle">Sign in to access game analytics</p>
          </div>
          
          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                placeholder="admin@myg.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            {error && <div className="login-error">{error}</div>}

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
          
          <div className="login-hint">
            <p>Demo Login: <strong>admin@myg.com</strong> / <strong>admin123</strong></p>
          </div>
        </div>

        <style>{`
          .login-overlay {
            position: fixed;
            inset: 0;
            background: #03010a;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            font-family: 'Inter', sans-serif;
            padding: 20px;
          }
          .login-box {
            width: 100%;
            max-width: 420px;
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 107, 0, 0.15);
            border-radius: 24px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(8px);
          }
          .login-header {
            text-align: center;
            margin-bottom: 32px;
          }
          .login-logo {
            height: 40px;
            margin-bottom: 16px;
            display: inline-block;
          }
          .login-title {
            font-size: 24px;
            font-weight: 800;
            color: #fff;
            margin: 0 0 6px 0;
            letter-spacing: -0.02em;
          }
          .login-subtitle {
            font-size: 13px;
            color: rgba(255, 255, 255, 0.4);
            margin: 0;
          }
          .login-form {
            display: flex;
            flex-direction: column;
            gap: 20px;
          }
          .form-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .form-label {
            font-size: 12px;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.6);
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          .form-input {
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            padding: 12px 16px;
            color: #fff;
            font-size: 14px;
            outline: none;
            transition: all 0.2s ease;
          }
          .form-input:focus {
            border-color: #ff6b00;
            box-shadow: 0 0 0 3px rgba(255, 107, 0, 0.15);
            background: rgba(255, 255, 255, 0.06);
          }
          .login-error {
            background: rgba(255, 59, 48, 0.1);
            border: 1px solid rgba(255, 59, 48, 0.2);
            color: #ff3b30;
            border-radius: 12px;
            padding: 12px;
            font-size: 13px;
            font-weight: 500;
            text-align: center;
          }
          .login-btn {
            background: #ff6b00;
            color: #fff;
            border: none;
            border-radius: 12px;
            padding: 14px;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s ease;
            margin-top: 10px;
          }
          .login-btn:hover {
            background: #ff8533;
            transform: translateY(-1px);
            box-shadow: 0 8px 16px rgba(255, 107, 0, 0.2);
          }
          .login-btn:disabled {
            background: rgba(255, 107, 0, 0.5);
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
          }
          .login-hint {
            margin-top: 24px;
            text-align: center;
            font-size: 12px;
            color: rgba(255, 255, 255, 0.3);
            border-top: 1px solid rgba(255, 255, 255, 0.05);
            padding-top: 16px;
          }
          .login-hint strong {
            color: rgba(255, 255, 255, 0.7);
          }
        `}</style>
      </div>
    );
  }

  const totalPlayersCount = players.length;
  const averageHighScore = players.length > 0 
    ? Math.round(players.reduce((sum, p) => sum + p.highscore, 0) / players.length) 
    : 0;
  const absoluteHighScore = players.length > 0 
    ? Math.max(...players.map(p => p.highscore)) 
    : 0;

  return (
    <div className="dashboard-container">
      {/* Mobile Header */}
      <div className="mobile-navbar">
        <img src="/images/mygtrans.png" alt="myG" className="mobile-logo" />
        <button className="mobile-menu-toggle" onClick={() => setSidebarOpen(true)}>
          <Menu size={24} color="#fff" />
        </button>
      </div>

      {/* Sidebar Overlay */}
      {isSidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <div className={`dashboard-sidebar ${isSidebarOpen ? 'is-open' : ''} ${activeTab === 'tv' && hideSidebarOnTv ? 'tv-hidden' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-wrap">
            <img src="/images/mygtrans.png" alt="myG" className="sidebar-logo" />
            <span className="brand-subtitle">ADMIN PORTAL</span>
          </div>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>
            <X size={20} color="rgba(255,255,255,0.5)" />
          </button>
        </div>

        <nav className="sidebar-nav">
          <div 
            className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => { setActiveTab('dashboard'); setSidebarOpen(false); }}
          >
            <LayoutDashboard size={18} /> Dashboard
          </div>
          <div 
            className={`nav-link ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => { setActiveTab('analytics'); setSidebarOpen(false); }}
          >
            <TrendingUp size={18} /> Analytics Menu
          </div>
          <div 
            className={`nav-link ${activeTab === 'tv' ? 'active' : ''}`}
            onClick={() => { setActiveTab('tv'); setSidebarOpen(false); }}
          >
            <Tv size={18} /> TV Display View
          </div>
          <div 
            className={`nav-link ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => { setActiveTab('settings'); setSidebarOpen(false); }}
          >
            <Gamepad2 size={18} /> Game Settings
          </div>
          <div 
            className={`nav-link ${activeTab === 'leaderboard' ? 'active' : ''}`}
            onClick={() => { setActiveTab('leaderboard'); setSidebarOpen(false); }}
          >
            <Trophy size={18} /> Leaderboard
          </div>
          <div 
            className={`nav-link ${activeTab === 'system' ? 'active' : ''}`}
            onClick={() => { setActiveTab('system'); setSidebarOpen(false); }}
          >
            <Settings size={18} /> System
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="admin-profile" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="admin-avatar">A</div>
              <div className="admin-info">
                <span className="admin-name">Admin User</span>
                <span className="admin-role">Super Admin</span>
              </div>
            </div>
            <button 
              onClick={() => {
                window.localStorage.removeItem('myg_admin_authenticated');
                auth.signOut().catch((e) => console.warn('Firebase Auth signout failed:', e));
                setIsAuthenticated(false);
                setEmail('');
                setPassword('');
              }} 
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255, 59, 48, 0.7)',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '6px',
                transition: 'all 0.2s',
                outline: 'none'
              }}
              onMouseOver={(e) => e.target.style.color = '#ff3b30'}
              onMouseOut={(e) => e.target.style.color = 'rgba(255, 59, 48, 0.7)'}
            >
              LOGOUT
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`dashboard-main ${activeTab === 'tv' && hideSidebarOnTv ? 'tv-fullwidth' : ''}`}>
        {activeTab === 'dashboard' && (
          <>
            <header className="main-header">
              <div className="header-text">
                <h1 className="main-title">Dashboard</h1>
                <p className="main-subtitle">Real-time player tracking and analytics</p>
              </div>
              <div className="header-utils">
                <div className="header-search">
                  <Search size={16} color="rgba(255,255,255,0.3)" />
                  <input type="text" placeholder="Search players..." />
                </div>
                <button className="util-btn">
                  <Bell size={18} />
                </button>
              </div>
            </header>

            <div className="metrics-grid">
              <div className="metric-card">
                <div className="card-top">
                  <div className="card-icon-box users">
                    <Users size={20} />
                  </div>
                  <span className="card-badge positive">
                    Active
                  </span>
                </div>
                <div className="card-body">
                  <span className="card-label">Total Players</span>
                  <h2 className="card-value">{loadingData ? '...' : totalPlayersCount.toLocaleString()}</h2>
                </div>
              </div>

              <div className="metric-card">
                <div className="card-top">
                  <div className="card-icon-box activity">
                    <Activity size={20} />
                  </div>
                  <span className="card-badge positive">
                    Avg Peak
                  </span>
                </div>
                <div className="card-body">
                  <span className="card-label">Avg. Coins</span>
                  <h2 className="card-value">{loadingData ? '...' : averageHighScore.toLocaleString()}</h2>
                </div>
              </div>

              <div className="metric-card">
                <div className="card-top">
                  <div className="card-icon-box trophy">
                    <Trophy size={20} />
                  </div>
                  <span className="card-badge neutral">Peak</span>
                </div>
                <div className="card-body">
                  <span className="card-label">High Score</span>
                  <h2 className="card-value">{loadingData ? '...' : absoluteHighScore.toLocaleString()}</h2>
                </div>
              </div>
            </div>

            <div className="data-section">
              <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <h2 className="section-title" style={{ margin: 0 }}>
                  Leaderboard Analytics (Hourly Slot: {getSelectedHourBlockLabel(selectedHour)})
                </h2>
                
                {/* Hourly Timings & Export Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <button 
                    className="download-btn" 
                    onClick={downloadExcel} 
                    disabled={loadingData}
                    style={{ marginRight: '8px' }}
                  >
                    <Download size={14} /> Export Data
                  </button>
                  <label htmlFor="hourly-selector" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: '600' }}>Select Timing:</label>
                  <select
                    id="hourly-selector"
                    value={selectedHour}
                    onChange={(e) => setSelectedHour(e.target.value)}
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: '#fff',
                      fontSize: '13px',
                      fontWeight: '600',
                      outline: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <option value="current" style={{ background: '#0c0a15', color: '#fff' }}>Current Hour</option>
                    {Array.from({ length: 24 }, (_, i) => {
                      const startH = i;
                      const endH = (i + 1) % 24;
                      const formatHour = (h) => {
                        const ampm = h >= 12 ? 'PM' : 'AM';
                        const displayHour = h % 12 === 0 ? 12 : h % 12;
                        return `${displayHour} ${ampm}`;
                      };
                      return (
                        <option key={i} value={String(i)} style={{ background: '#0c0a15', color: '#fff' }}>
                          {`${formatHour(startH)} - ${formatHour(endH)}`}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Player Name</th>
                      <th>Age</th>
                      <th>Phone Number</th>
                      <th>High Score (Coins)</th>
                      <th>Total Coins</th>
                      <th>Played At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingData ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>
                          <div className="loading-spinner"></div>
                          Fetching player analytics from Firestore...
                        </td>
                      </tr>
                    ) : players.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>
                          No registered players found.
                        </td>
                      </tr>
                    ) : (
                      players.map((player) => (
                        <tr key={player.id}>
                          <td>
                            <div className={`rank-badge rank-${player.rank}`}>
                              {player.rank}
                            </div>
                          </td>
                          <td className="name-cell">{player.name}</td>
                          <td className="age-cell">{player.age}</td>
                          <td className="phone-cell">{player.phone}</td>
                          <td className="score-cell">{player.highscore.toLocaleString()}</td>
                          <td className="total-coins-cell" style={{ color: '#9b30ff', fontWeight: '700' }}>{player.totalScore.toLocaleString()}</td>
                          <td className="played-at-cell">{formatPlayedAt(player.lastPlayedAt)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView />
        )}

        {activeTab === 'tv' && (
          <TVView 
            hideSidebar={hideSidebarOnTv} 
            setHideSidebar={setHideSidebarOnTv} 
          />
        )}

        {activeTab === 'settings' && (
          <div className="coming-soon-container">
            <Gamepad2 size={48} className="coming-soon-icon" />
            <h2 className="coming-soon-title font-goofy">Game Settings</h2>
            <p className="coming-soon-subtitle">Configure your game settings and physics parameters.</p>
            <span className="coming-soon-badge font-goofy">COMING SOON</span>
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="coming-soon-container">
            <Trophy size={48} className="coming-soon-icon" />
            <h2 className="coming-soon-title font-goofy">Leaderboard Panel</h2>
            <p className="coming-soon-subtitle">Manage bans, profile visibility, and score resets.</p>
            <span className="coming-soon-badge font-goofy">COMING SOON</span>
          </div>
        )}

        {activeTab === 'system' && (
          <div className="coming-soon-container">
            <Settings size={48} className="coming-soon-icon" />
            <h2 className="coming-soon-title font-goofy">System Panel</h2>
            <p className="coming-soon-subtitle">Modify API keys, database connections, and portal roles.</p>
            <span className="coming-soon-badge font-goofy">COMING SOON</span>
          </div>
        )}
      </div>

      <style>{`
        .dashboard-container {
          display: flex;
          min-height: 100vh;
          background: #03010a;
          color: #fff;
          font-family: 'Inter', sans-serif;
          width: 100%;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }

        /* Sidebar */
        .dashboard-sidebar {
          width: 280px;
          background: #0a0518;
          border-right: 1px solid rgba(255,107,0,0.1);
          display: flex;
          flex-direction: column;
          position: fixed;
          top: 0; bottom: 0; left: 0;
          z-index: 200;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .sidebar-brand { padding: 30px; display: flex; justify-content: space-between; align-items: flex-start; }
        .brand-wrap { display: flex; flex-direction: column; gap: 6px; }
        .sidebar-logo { width:'20px'  }
        .brand-subtitle { font-size: 9px; letter-spacing: 0.25em; color: #ff6b00; font-weight: 800; }
        .sidebar-close { display: none; background: none; border: none; cursor: pointer; }
        .sidebar-nav { padding: 0 15px; display: flex; flex-direction: column; gap: 4px; }
        .nav-link { padding: 14px 20px; font-size: 14px; color: rgba(255,255,255,0.5); cursor: pointer; display: flex; align-items: center; gap: 12px; transition: all 0.2s ease; border-radius: 12px; font-weight: 500; }
        .nav-link.active { color: #fff; background: rgba(255,107,0,0.08); box-shadow: inset 4px 0 0 #ff6b00; }
        .sidebar-footer { margin-top: auto; padding: 20px; border-top: 1px solid rgba(255,255,255,0.05); }
        .admin-profile { display: flex; align-items: center; gap: 12px; padding: 10px; background: rgba(255,255,255,0.03); border-radius: 16px; }
        .admin-avatar { width: 38px; height: 38px; border-radius: 12px; background: linear-gradient(135deg, #ff6b00, #ff9500); display: flex; align-items: center; justify-content: center; font-weight: bold; }
        .admin-info { display: flex; flex-direction: column; }
        .admin-name { font-size: 14px; font-weight: 600; }
        .admin-role { font-size: 11px; color: rgba(255,255,255,0.4); }

        /* Main */
        .dashboard-main { flex: 1; margin-left: 280px; padding: 40px 50px; min-height: 100vh; transition: margin-left 0.3s ease; }
        .main-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 40px; }
        .main-title { font-size: 32px; font-weight: 800; margin: 0; letter-spacing: -0.02em; }
        .main-subtitle { font-size: 14px; color: rgba(255,255,255,0.4); margin: 0; }
        .header-utils { display: flex; align-items: center; gap: 15px; }
        .header-search { display: flex; align-items: center; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 0 15px; height: 42px; width: 240px; }
        .header-search input { background: none; border: none; color: #fff; font-size: 14px; margin-left: 10px; width: 100%; outline: none; }
        .util-btn { width: 42px; height: 42px; border-radius: 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; }

        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 25px; margin-bottom: 40px; }
        .metric-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 24px; padding: 24px; }
        .card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .card-icon-box { width: 44px; height: 44px; border-radius: 14px; display: flex; align-items: center; justify-content: center; }
        .card-icon-box.users { background: rgba(255,107,0,0.1); color: #ff6b00; }
        .card-icon-box.activity { background: rgba(155,48,255,0.1); color: #9b30ff; }
        .card-icon-box.trophy { background: rgba(0,255,136,0.1); color: #00ff88; }
        .card-badge { font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 20px; display: flex; align-items: center; gap: 4px; }
        .card-badge.positive { color: #00ff88; background: rgba(0,255,136,0.1); }
        .card-badge.neutral { color: #fff; background: rgba(255,255,255,0.1); }
        .card-label { font-size: 14px; color: rgba(255,255,255,0.4); font-weight: 500; }
        .card-value { font-size: 32px; font-weight: 800; margin: 4px 0 0 0; }

        .data-section { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 24px; padding: 30px; }
        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
        .section-title { font-size: 18px; font-weight: 700; margin: 0; }
        .download-btn { background: #ff6b00; border: none; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 10px; transition: all 0.2s ease; }
        .download-btn:hover { background: #ff8533; transform: translateY(-1px); }
        .download-btn:disabled { background: rgba(255,107,0,0.4); cursor: not-allowed; transform: none; opacity: 0.6; }

        .loading-spinner {
          width: 24px;
          height: 24px;
          border: 3px solid rgba(255, 107, 0, 0.1);
          border-top-color: #ff6b00;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 12px auto;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .table-container { overflow-x: auto; }
        .data-table { width: 100%; border-collapse: collapse; min-width: 700px; }
        .data-table th { text-align: left; padding: 15px 10px; font-size: 12px; color: rgba(255,255,255,0.3); text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .data-table td { padding: 20px 10px; font-size: 14px; border-bottom: 1px solid rgba(255,255,255,0.02); }
        .name-cell { font-weight: 600; color: #fff; }
        .score-cell { font-weight: 700; color: #ff6b00; }
        .date-cell { color: rgba(255,255,255,0.5); }
        
        .rank-badge { width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; }
        .rank-1 { background: rgba(255,215,0,0.2); color: #ffd700; border: 1px solid rgba(255,215,0,0.3); }
        .rank-2 { background: rgba(192,192,192,0.2); color: #c0c0c0; border: 1px solid rgba(192,192,192,0.3); }
        .rank-3 { background: rgba(205,127,50,0.2); color: #cd7f32; border: 1px solid rgba(205,127,50,0.3); }

        .mobile-navbar { display: none; }
        .sidebar-overlay { display: none; }

        @media (max-width: 1024px) {
          .dashboard-sidebar { transform: translateX(-100%); }
          .dashboard-sidebar.is-open { transform: translateX(0); }
          .sidebar-close { display: block; }
          .dashboard-main { margin-left: 0; padding: 90px 16px 40px 16px; width: 100%; max-width: 100%; box-sizing: border-box; overflow-x: hidden; }
          .mobile-navbar {
            display: flex; position: fixed; top: 0; left: 0; right: 0; height: 70px; background: #0a0518;
            padding: 0 20px; align-items: center; justify-content: space-between; z-index: 100; border-bottom: 1px solid rgba(255,107,0,0.1);
          }
          .mobile-logo { height: 30px; }
          .mobile-menu-toggle { background: none; border: none; cursor: pointer; }
          .sidebar-overlay { display: block; position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); z-index: 150; }
        }

        @media (max-width: 768px) {
          .main-header { flex-direction: column; align-items: flex-start; gap: 16px; margin-bottom: 28px; }
          .main-title { font-size: 24px; }
          .main-subtitle { font-size: 12px; }
          .header-utils { width: 100%; justify-content: space-between; gap: 12px; }
          .header-search { width: 100%; flex: 1; height: 40px; }
          .util-btn { width: 40px; height: 40px; }
          
          .section-header { display: flex; flex-direction: row; justify-content: space-between; align-items: center; gap: 12px; width: 100%; }
          .section-title { font-size: 14px; font-weight: 700; }
          .download-btn { width: auto !important; justify-content: center; padding: 6px 10px; font-size: 11px; gap: 4px; border-radius: 8px; }

          /* Metrics three-cards in one row optimization on mobile */
          .metrics-grid {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 8px !important;
            margin-bottom: 20px;
          }
          .metric-card {
            padding: 10px 8px !important;
            border-radius: 12px !important;
          }
          .card-top {
            margin-bottom: 8px !important;
            display: flex;
            justify-content: flex-start;
          }
          .card-icon-box {
            width: 28px !important;
            height: 28px !important;
            border-radius: 8px !important;
          }
          .card-icon-box svg {
            width: 14px !important;
            height: 14px !important;
          }
          .card-badge {
            display: none !important; /* Hide badge on mobile to save space */
          }
          .card-label {
            font-size: 9px !important;
            color: rgba(255,255,255,0.4);
            text-transform: uppercase;
            letter-spacing: 0.02em;
          }
          .card-value {
            font-size: 13px !important;
            font-weight: 800;
            margin-top: 2px !important;
          }
          
          /* Data section spacing */
          .data-section { padding: 12px; border-radius: 16px; width: 100%; max-width: 100%; box-sizing: border-box; }

          /* Horizontal table scrolling on mobile */
          .table-container {
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch;
            width: 100% !important;
            max-width: 100% !important;
            display: block !important;
            margin-top: 10px;
          }
          
          .data-table {
            min-width: 850px !important; /* Keep full table structural sizing scrollable horizontally */
            width: 100% !important;
          }
          
          .data-table th, .data-table td {
            padding: 12px 8px !important;
            font-size: 12px !important;
          }
        }

        @media (max-width: 480px) {
          .dashboard-main { padding: 85px 12px 30px 12px; }
          .main-header { gap: 12px; }
          .header-utils { gap: 8px; }
          .header-search { height: 38px; }
          .util-btn { width: 38px; height: 38px; }
          
          /* Login Card responsive scaling */
          .login-box { padding: 24px 16px; border-radius: 20px; }
          .login-title { font-size: 20px; }
          .login-subtitle { font-size: 11px; }
          .login-logo { height: 32px; margin-bottom: 12px; }
          .login-hint { padding-top: 12px; margin-top: 16px; }
        }

        /* Coming Soon Panel Styling */
        .coming-soon-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: calc(100vh - 200px);
          text-align: center;
          padding: 40px;
          background: rgba(255, 255, 255, 0.01);
          border: 1px dashed rgba(255, 255, 255, 0.05);
          border-radius: 24px;
          gap: 16px;
          margin-top: 20px;
        }
        .coming-soon-icon {
          color: #ff6b00;
          filter: drop-shadow(0 0 10px rgba(255, 107, 0, 0.3));
          animation: bounce-y 2.5s ease-in-out infinite;
        }
        .coming-soon-title {
          font-size: 28px;
          margin: 0;
          color: #fff;
          letter-spacing: 0.05em;
        }
        .coming-soon-subtitle {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.4);
          max-width: 400px;
          margin: 0;
          line-height: 1.5;
        }
        .coming-soon-badge {
          font-size: 11px;
          color: #00ffff;
          border: 1.5px solid #00ffff;
          background: rgba(0, 255, 255, 0.05);
          padding: 6px 16px;
          border-radius: 20px;
          letter-spacing: 0.1em;
          box-shadow: 0 0 15px rgba(0, 255, 255, 0.2);
        }
        @keyframes bounce-y {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        /* TV Fullwidth Custom Overrides */
        .dashboard-sidebar.tv-hidden {
          display: none !important;
        }
        /* Boost z-index of visible sidebar to sit on top of fullscreen TVView container */
        .dashboard-sidebar:not(.tv-hidden) {
          z-index: 2100 !important;
        }
        .sidebar-overlay {
          z-index: 2050 !important;
        }
        .dashboard-main.tv-fullwidth {
          margin-left: 0 !important;
          padding: 20px !important;
          width: 100% !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
