import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import { 
  Users, 
  TrendingUp, 
  Activity, 
  Trophy, 
  Heart, 
  Clock, 
  BarChart3, 
  UserMinus, 
  Flame,
  Gamepad2
} from 'lucide-react';

const AnalyticsView = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPlayersToday: 0,
    totalGamesToday: 0,
    avgHighScoreToday: 0,
    peakScoreToday: 0,
    avgScorePerGame: 0,
    outOfLivesCount: 0
  });

  const [outOfLivesPlayers, setOutOfLivesPlayers] = useState([]);
  const [recentPlayersToday, setRecentPlayersToday] = useState([]);
  const [hourlyDistribution, setHourlyDistribution] = useState(Array(24).fill(0));

  const fetchTodayAnalytics = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const allUsers = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        allUsers.push({
          id: doc.id,
          name: data.name || 'Anonymous',
          phone: data.phone || doc.id || 'N/A',
          age: data.age || 'N/A',
          livesLeft: data.livesLeft !== undefined ? Number(data.livesLeft) : (data.lives_left !== undefined ? Number(data.lives_left) : 3),
          scores: data.scores || [],
          lastPlayedAt: data.lastPlayedAt || data.playedAt || data.createdAt || 'N/A'
        });
      });

      // Get Today's Date range boundaries
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      // Filtering and building stats
      let todayPlayers = [];
      let todayScores = [];
      let outOfLivesList = [];
      let recentPlays = [];
      const hourlyCounts = Array(24).fill(0);

      allUsers.forEach(user => {
        // Find user scores played today
        const scoresToday = user.scores.filter(s => {
          const playedTime = s.playedAt || s['played at'] || s.played_at;
          if (!playedTime) return false;
          const d = new Date(playedTime);
          return d >= startOfToday && d <= endOfToday;
        });

        // Check if overall lastPlayedAt falls within today as a fallback
        let playedToday = scoresToday.length > 0;
        let lastPlayedDate = null;
        
        if (user.lastPlayedAt && user.lastPlayedAt !== 'N/A') {
          const d = new Date(user.lastPlayedAt);
          if (d >= startOfToday && d <= endOfToday) {
            playedToday = true;
            lastPlayedDate = d;
          }
        }

        if (playedToday) {
          // Determine highscore today
          const highscoreToday = scoresToday.length > 0 
            ? Math.max(...scoresToday.map(s => Number(s.score || 0)))
            : Number(user.highscore || 0);

          // Determine total scores today
          const totalScoreToday = scoresToday.length > 0
            ? scoresToday.reduce((sum, s) => sum + Number(s.score || 0), 0)
            : Number(user.totalScore || 0);

          const lastPlayedTimeStr = lastPlayedDate 
            ? lastPlayedDate 
            : (scoresToday.length > 0 ? new Date(scoresToday[scoresToday.length - 1].playedAt) : new Date());

          const todayUserData = {
            id: user.id,
            name: user.name,
            phone: user.phone,
            age: user.age,
            livesLeft: user.livesLeft,
            highscoreToday: highscoreToday,
            totalScoreToday: totalScoreToday,
            lastPlayedAt: lastPlayedTimeStr,
            playCountToday: scoresToday.length || 1
          };

          todayPlayers.push(todayUserData);

          // Add to overall today scores pool
          scoresToday.forEach(s => {
            todayScores.push(Number(s.score || 0));
            const scoreTime = new Date(s.playedAt || s['played at'] || s.played_at);
            if (!isNaN(scoreTime.getTime())) {
              const hour = scoreTime.getHours();
              hourlyCounts[hour] = (hourlyCounts[hour] || 0) + 1;
            }
          });

          // If no explicitly split scores, count fallback
          if (scoresToday.length === 0) {
            todayScores.push(Number(user.highscore || 0));
            if (lastPlayedDate) {
              hourlyCounts[lastPlayedDate.getHours()] += 1;
            }
          }

          // Check if player has used all 3 lives (livesLeft === 0)
          if (user.livesLeft === 0) {
            outOfLivesList.push(todayUserData);
          }

          // Add as recent play entry
          recentPlays.push(todayUserData);
        }
      });

      // Ranks and calculations
      const totalPlayersCount = todayPlayers.length;
      const totalGamesCount = todayScores.length;
      const peakScore = todayScores.length > 0 ? Math.max(...todayScores) : 0;
      const sumHighscores = todayPlayers.reduce((sum, p) => sum + p.highscoreToday, 0);
      const avgHigh = totalPlayersCount > 0 ? Math.round(sumHighscores / totalPlayersCount) : 0;
      
      const sumAllScores = todayScores.reduce((sum, s) => sum + s, 0);
      const avgScore = totalGamesCount > 0 ? Math.round(sumAllScores / totalGamesCount) : 0;

      // Sort recent plays by date descending
      recentPlays.sort((a, b) => b.lastPlayedAt - a.lastPlayedAt);
      const top50Recent = recentPlays.slice(0, 50);

      // Sort out of lives by highscore descending
      outOfLivesList.sort((a, b) => b.highscoreToday - a.highscoreToday);

      setStats({
        totalPlayersToday: totalPlayersCount,
        totalGamesToday: totalGamesCount,
        avgHighScoreToday: avgHigh,
        peakScoreToday: peakScore,
        avgScorePerGame: avgScore,
        outOfLivesCount: outOfLivesList.length
      });

      setOutOfLivesPlayers(outOfLivesList);
      setRecentPlayersToday(top50Recent);
      setHourlyDistribution(hourlyCounts);
    } catch (e) {
      console.error("Error fetching today's analytics data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayAnalytics();
  }, []);

  const formatTime = (dateObj) => {
    if (!dateObj) return 'N/A';
    try {
      const d = new Date(dateObj);
      if (isNaN(d.getTime())) return 'N/A';
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return 'N/A';
    }
  };

  // Find max hourly player count to scale our graph nicely
  const maxHourlyCount = Math.max(...hourlyDistribution, 1);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Today's Analytics Menu</h1>
          <p style={styles.subtitle}>Comprehensive performance insights based strictly on today's gameplay metrics</p>
        </div>
        <button style={styles.refreshBtn} onClick={fetchTodayAnalytics} disabled={loading}>
          <Flame size={16} style={{ marginRight: '6px' }} />
          {loading ? 'Refreshing...' : 'Refresh Analytics'}
        </button>
      </header>

      {/* Stats Overview Grid */}
      <div style={styles.statsGrid}>
        {/* Card 1: Players Today */}
        <div style={styles.statCard}>
          <div style={styles.cardHeader}>
            <div style={{ ...styles.iconBox, background: 'rgba(255, 107, 0, 0.1)', color: '#ff6b00' }}>
              <Users size={20} />
            </div>
            <span style={styles.badge}>Today Only</span>
          </div>
          <div style={styles.cardContent}>
            <span style={styles.cardLabel}>Players Today</span>
            <h2 style={styles.cardVal}>{loading ? '...' : stats.totalPlayersToday}</h2>
          </div>
        </div>

        {/* Card 2: Total Sessions Played */}
        <div style={styles.statCard}>
          <div style={styles.cardHeader}>
            <div style={{ ...styles.iconBox, background: 'rgba(255, 107, 0, 0.1)', color: '#ff6b00' }}>
              <Gamepad2 size={20} />
            </div>
            <span style={styles.badge}>Today Only</span>
          </div>
          <div style={styles.cardContent}>
            <span style={styles.cardLabel}>Total Sessions Played</span>
            <h2 style={styles.cardVal}>{loading ? '...' : stats.totalGamesToday}</h2>
          </div>
        </div>

        {/* Card 3: Average High Score */}
        <div style={styles.statCard}>
          <div style={styles.cardHeader}>
            <div style={{ ...styles.iconBox, background: 'rgba(155, 48, 255, 0.1)', color: '#9b30ff' }}>
              <Trophy size={20} />
            </div>
            <span style={styles.badgePurple}>Avg High</span>
          </div>
          <div style={styles.cardContent}>
            <span style={styles.cardLabel}>Average High Score</span>
            <h2 style={styles.cardVal}>{loading ? '...' : stats.avgHighScoreToday.toLocaleString()}</h2>
          </div>
        </div>

        {/* Card 4: Average Score per Game */}
        <div style={styles.statCard}>
          <div style={styles.cardHeader}>
            <div style={{ ...styles.iconBox, background: 'rgba(155, 48, 255, 0.1)', color: '#9b30ff' }}>
              <Activity size={20} />
            </div>
            <span style={styles.badgePurple}>Avg Game</span>
          </div>
          <div style={styles.cardContent}>
            <span style={styles.cardLabel}>Average Score / Game</span>
            <h2 style={styles.cardVal}>{loading ? '...' : stats.avgScorePerGame.toLocaleString()}</h2>
          </div>
        </div>

        {/* Card 5: Highest Score Today */}
        <div style={styles.statCard}>
          <div style={styles.cardHeader}>
            <div style={{ ...styles.iconBox, background: 'rgba(46, 204, 113, 0.1)', color: '#2ecc71' }}>
              <Flame size={20} />
            </div>
            <span style={styles.badgeGreen}>Peak</span>
          </div>
          <div style={styles.cardContent}>
            <span style={styles.cardLabel}>Highest Score Today</span>
            <h2 style={styles.cardVal}>{loading ? '...' : stats.peakScoreToday.toLocaleString()}</h2>
          </div>
        </div>

        {/* Card 6: Out of Lives */}
        <div style={styles.statCard}>
          <div style={styles.cardHeader}>
            <div style={{ ...styles.iconBox, background: 'rgba(255, 59, 48, 0.1)', color: '#ff3b30' }}>
              <Heart size={20} fill="#ff3b30" />
            </div>
            <span style={styles.badgeRed}>Out of Lives</span>
          </div>
          <div style={styles.cardContent}>
            <span style={styles.cardLabel}>Used All 3 Lives</span>
            <h2 style={{ ...styles.cardVal, color: '#ff3b30' }}>{loading ? '...' : stats.outOfLivesCount}</h2>
          </div>
        </div>
      </div>

      {/* Hourly distribution graph */}
      <div style={styles.sectionCard}>
        <div style={styles.sectionHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BarChart3 size={20} color="#ff6b00" />
            <h3 style={styles.sectionTitle}>Player Count Distribution (Hour-by-Hour)</h3>
          </div>
          <span style={styles.sectionBadge}>Today's Hourly Load</span>
        </div>
        
        {loading ? (
          <div style={styles.loaderContainer}>
            <div className="loading-spinner"></div>
            <span style={{ color: 'rgba(255,255,255,0.4)', marginTop: '10px' }}>Generating graph...</span>
          </div>
        ) : (
          <div style={styles.graphContainer}>
            <div style={styles.chartWrapper}>
              {hourlyDistribution.map((count, hour) => {
                const heightPercent = (count / maxHourlyCount) * 80; // max height 80%
                const displayHourStr = hour === 0 ? '12 AM' : hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
                return (
                  <div key={hour} style={styles.barColumn} title={`${displayHourStr}: ${count} plays`}>
                    <div style={styles.barValue}>{count > 0 ? count : ''}</div>
                    <div style={{ ...styles.bar, height: `${Math.max(4, heightPercent)}%` }}>
                      {count > 0 && <div style={styles.barGlow}></div>}
                    </div>
                    <div style={styles.barLabel}>{hour % 4 === 0 ? displayHourStr : hour}</div>
                  </div>
                );
              })}
            </div>
            <div style={styles.chartLegend}>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>* X-Axis: Clock hours (0 - 23). Y-Axis: Total gameplay entries registered within that hour today.</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom tables grid */}
      <div style={styles.twoColumnGrid}>
        {/* Column 1: Top Players Who Used 3 Lives */}
        <div style={stats.outOfLivesCount > 0 ? styles.sectionCard : { ...styles.sectionCard, opacity: 0.85 }}>
          <div style={styles.sectionHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <UserMinus size={18} color="#ff3b30" />
              <h3 style={styles.sectionTitle}>Players Out of Lives (Used All 3)</h3>
            </div>
            <span style={styles.badgeRed}>{outOfLivesPlayers.length} Players</span>
          </div>

          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Player</th>
                  <th style={styles.th}>Phone</th>
                  <th style={styles.th} style={{ textAlign: 'right' }}>Today's High</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="3" style={styles.tdCenter}>Loading...</td>
                  </tr>
                ) : outOfLivesPlayers.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={styles.tdCenter}>No players are out of lives today.</td>
                  </tr>
                ) : (
                  outOfLivesPlayers.map((player) => (
                    <tr key={player.id} style={styles.tr}>
                      <td style={styles.td}>{player.name}</td>
                      <td style={{ ...styles.td, color: 'rgba(255,255,255,0.5)' }}>{player.phone}</td>
                      <td style={{ ...styles.td, color: '#ff3b30', fontWeight: '800', textAlign: 'right' }}>
                        {player.highscoreToday.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Column 2: Top 50 Recent Plays Today */}
        <div style={styles.sectionCard}>
          <div style={styles.sectionHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Clock size={18} color="#9b30ff" />
              <h3 style={styles.sectionTitle}>Top 50 Recent Players (Today)</h3>
            </div>
            <span style={styles.badgePurple}>Live Log</span>
          </div>

          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Player Name</th>
                  <th style={styles.th}>Time Played</th>
                  <th style={styles.th} style={{ textAlign: 'right' }}>Score Today</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="3" style={styles.tdCenter}>Loading...</td>
                  </tr>
                ) : recentPlayersToday.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={styles.tdCenter}>No gameplay activity logged today.</td>
                  </tr>
                ) : (
                  recentPlayersToday.map((player, idx) => (
                    <tr key={`${player.id}-${idx}`} style={styles.tr}>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: '600' }}>{player.name}</span>
                          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>{player.phone} (Age: {player.age})</span>
                        </div>
                      </td>
                      <td style={{ ...styles.td, color: 'rgba(255,255,255,0.6)' }}>{formatTime(player.lastPlayedAt)}</td>
                      <td style={{ ...styles.td, color: '#ff6b00', fontWeight: '800', textAlign: 'right' }}>
                        {player.highscoreToday.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    color: '#fff',
    minHeight: '100vh',
    background: '#04020a',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    paddingBottom: '20px'
  },
  title: {
    fontSize: '28px',
    fontWeight: '900',
    letterSpacing: '-0.02em',
    color: '#fff',
    margin: 0
  },
  subtitle: {
    fontSize: '14px',
    color: 'rgba(255, 255, 255, 0.45)',
    margin: '4px 0 0 0'
  },
  refreshBtn: {
    display: 'flex',
    alignItems: 'center',
    background: '#ff6b00',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    padding: '10px 16px',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s',
    outline: 'none',
    boxShadow: '0 4px 12px rgba(255, 107, 0, 0.15)'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '20px'
  },
  statCard: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '16px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    transition: 'transform 0.2s, border-color 0.2s',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  iconBox: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  badge: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#ff6b00',
    background: 'rgba(255,107,0,0.1)',
    padding: '4px 8px',
    borderRadius: '6px'
  },
  badgePurple: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#9b30ff',
    background: 'rgba(155,48,255,0.1)',
    padding: '4px 8px',
    borderRadius: '6px'
  },
  badgeRed: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#ff3b30',
    background: 'rgba(255,59,48,0.1)',
    padding: '4px 8px',
    borderRadius: '6px'
  },
  badgeGreen: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#2ecc71',
    background: 'rgba(46,204,113,0.1)',
    padding: '4px 8px',
    borderRadius: '6px'
  },
  cardContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  cardLabel: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '600'
  },
  cardVal: {
    fontSize: '26px',
    fontWeight: '900',
    margin: 0,
    color: '#fff'
  },
  sectionCard: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '20px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    paddingBottom: '16px'
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '800',
    margin: 0,
    letterSpacing: '-0.01em'
  },
  sectionBadge: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.5)',
    background: 'rgba(255,255,255,0.05)',
    padding: '4px 10px',
    borderRadius: '6px',
    fontWeight: '600'
  },
  graphContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid rgba(255,255,255,0.02)'
  },
  chartWrapper: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: '160px',
    padding: '10px 0',
    gap: '4px'
  },
  barColumn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
    position: 'relative'
  },
  barValue: {
    fontSize: '9px',
    fontWeight: '700',
    color: '#ff6b00',
    marginBottom: '4px'
  },
  bar: {
    width: '70%',
    minWidth: '6px',
    maxWidth: '18px',
    background: 'linear-gradient(180deg, #9b30ff 0%, #ff6b00 100%)',
    borderRadius: '4px 4px 0 0',
    position: 'relative',
    transition: 'height 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
  },
  barGlow: {
    position: 'absolute',
    inset: 0,
    background: 'inherit',
    filter: 'blur(4px)',
    opacity: 0.4,
    borderRadius: 'inherit'
  },
  barLabel: {
    fontSize: '9px',
    color: 'rgba(255,255,255,0.4)',
    marginTop: '6px',
    textAlign: 'center',
    whiteSpace: 'nowrap'
  },
  chartLegend: {
    display: 'flex',
    justifyContent: 'flex-start',
    paddingTop: '6px',
    borderTop: '1px solid rgba(255,255,255,0.03)'
  },
  twoColumnGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '24px'
  },
  tableWrapper: {
    overflowY: 'auto',
    maxHeight: '320px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left'
  },
  th: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    padding: '10px 12px',
    borderBottom: '1px solid rgba(255,255,255,0.06)'
  },
  tr: {
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    transition: 'background 0.2s',
  },
  td: {
    padding: '12px',
    fontSize: '13px',
    color: '#fff'
  },
  tdCenter: {
    textAlign: 'center',
    padding: '30px',
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '600',
    fontSize: '13px'
  },
  loaderContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 0'
  }
};

export default AnalyticsView;
