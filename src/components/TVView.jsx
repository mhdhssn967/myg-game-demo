import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import { Trophy, Tv, Maximize2, Minimize2, Coins, RefreshCw, Sparkles, Menu } from 'lucide-react';

const TVView = ({ hideSidebar, setHideSidebar }) => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);
  const listRef = useRef(null);

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

  // 1. Fetch and sort leaderboard data - limited to top 50 players in current clock hour
  const fetchLeaderboardData = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const fetchedPlayers = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();

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

        // Schema-agnostic fallback parsing
        fetchedPlayers.push({
          id: doc.id,
          name: data.name || 'Anonymous',
          highscore: Number(data.highscore || data.totalScore || data.highScore || 0),
          totalScore: Number(data.totalScore || data.highscore || 0),
          lastPlayedAt: lastPlayedAt,
          rawScores: data.scores || []
        });
      });

      // Filter by the current clock hour (e.g. 7-8, 8-9, etc.)
      const now = new Date();
      const startOfHour = new Date(now);
      startOfHour.setMinutes(0, 0, 0);
      startOfHour.setMilliseconds(0);
      const endOfHour = new Date(now);
      endOfHour.setMinutes(59, 59, 999);

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

          // Sort to find the latest playedAt within the current hour
          const sortedScores = [...filteredScores].sort((a, b) => new Date(b.playedAt || b['played at'] || b.played_at) - new Date(a.playedAt || a['played at'] || a.played_at));
          const hourlyLast = sortedScores[0].playedAt || sortedScores[0]['played at'] || sortedScores[0].played_at;

          hourlyPlayers.push({
            ...player,
            highscore: hourlyHigh,
            totalScore: hourlyTotal,
            lastPlayedAt: hourlyLast
          });
        } else {
          // Fallback: check if the overall lastPlayedAt is within the current hour
          if (player.lastPlayedAt && player.lastPlayedAt !== 'N/A') {
            const d = new Date(player.lastPlayedAt);
            if (d >= startOfHour && d <= endOfHour) {
              hourlyPlayers.push(player);
            }
          }
        }
      });

      // Sort by highscore descending (highest score first)
      hourlyPlayers.sort((a, b) => b.highscore - a.highscore);

      // Only slice top 50 players
      const top50 = hourlyPlayers.slice(0, 50);

      // Assign ranks
      const rankedPlayers = top50.map((player, index) => ({
        ...player,
        rank: index + 1
      }));

      setPlayers(rankedPlayers);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching player data for TV view:', err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Poll Firestore every 10 seconds for real-time TV updates
  useEffect(() => {
    fetchLeaderboardData();
    const pollInterval = setInterval(fetchLeaderboardData, 10000);
    return () => clearInterval(pollInterval);
  }, []);

  // 3. Step-by-Step Smooth Auto-scrolling (Move up exactly one player row every 2 seconds)
  useEffect(() => {
    if (loading || players.length <= 3 || !isAutoScrolling) return;

    let scrollInterval;
    const container = listRef.current;

    const stepScroll = () => {
      if (!container) return;

      const firstRow = container.querySelector('.tv-roster-row');
      const rowHeight = firstRow ? firstRow.offsetHeight + 8 : 52; // exact height + 8px flex gap

      // Check if we are near the bottom of the list
      const isAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 16;

      if (isAtBottom) {
        // Reset back to top smoothly when reaching bottom
        container.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        // Smoothly scroll down by exactly one player row
        container.scrollBy({ top: rowHeight, behavior: 'smooth' });
      }
    };

    // Delay the initial start by 2.5s to let the page settle
    const initialDelay = setTimeout(() => {
      // Start stepped scrolling every 2 seconds
      scrollInterval = setInterval(stepScroll, 2000);
    }, 2500);

    return () => {
      clearInterval(scrollInterval);
      clearTimeout(initialDelay);
    };
  }, [players, loading, isAutoScrolling]);

  // 4. Handle Fullscreen API (With bulletproof virtual fullscreen fallback)
  const toggleFullscreen = async () => {
    try {
      if (!isFullscreen) {
        const element = document.querySelector('.tv-dashboard') || document.documentElement;
        if (element.requestFullscreen) {
          await element.requestFullscreen();
        } else if (element.webkitRequestFullscreen) {
          element.webkitRequestFullscreen();
        } else if (element.mozRequestFullScreen) {
          element.mozRequestFullScreen();
        } else if (element.msRequestFullscreen) {
          element.msRequestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
          document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
          document.msExitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (err) {
      console.warn('Native browser fullscreen request was blocked or failed, using virtual fullscreen:', err);
      setIsFullscreen(!isFullscreen);
    }
  };

  // Watch for system/escape fullscreen changes to keep state synced
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const topThree = players.slice(0, 3);

  // Split remaining players (up to rank 50) into 2 equal columns (side-by-side)
  const remainingPlayers = players;
  const midIndex = Math.ceil(remainingPlayers.length / 2);
  const leftColPlayers = remainingPlayers.slice(0, midIndex);
  const rightColPlayers = remainingPlayers.slice(midIndex);

  return (
    <div className={`tv-dashboard ${isFullscreen ? 'tv-fullscreen' : ''}`}>
      {/* Dynamic Cyberpunk Neon Background */}
      <div className="tv-glow pink"></div>
      <div className="tv-glow orange"></div>
      <div className="tv-glow blue"></div>

      {/* Floating Controls at Top Left */}
      <div className={`tv-top-left-controls ${!hideSidebar ? 'sidebar-visible' : ''}`}>
        <button
          className={`tv-btn ${!hideSidebar ? 'active' : ''}`}
          onClick={() => setHideSidebar(!hideSidebar)}
          title="Toggle Dashboard Sidebar Menu"
        >
          <Menu size={14} />
          <span>{hideSidebar ? 'Show Menu' : 'Hide Menu'}</span>
        </button>

        <button
          className="tv-btn highlight"
          onClick={toggleFullscreen}
          title="Toggle Fullscreen for TV Display"
        >
          {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          <span>{isFullscreen ? 'Exit Full' : 'Fullscreen'}</span>
        </button>
      </div>

      {/* Header Cover Banner */}
      <header className="tv-header-cover">
        <img src="/images/cover.webp" alt="myG Champions Stand Cover" className="tv-cover-img" />
      </header>

      {loading ? (
        <div className="tv-loader">
          <div className="tv-spinner"></div>
          <span className="tv-loader-text font-goofy">CONNECTING TO THE DATABASE...</span>
        </div>
      ) : players.length === 0 ? (
        <div className="tv-empty font-goofy">
          <Trophy size={64} className="empty-icon" />
          <h2>NO SCORES REGISTERED YET!</h2>
          <p>BE THE FIRST TO MAKE HISTORY!</p>
          
          {/* QR Code always shown under the empty message */}
          <div className="tv-bottom-left-qr" style={{ marginTop: '24px', alignSelf: 'center' }}>
            <div className="qr-wrapper">
              <img
                src="/images/qr/mygplay_qr_brand.png"
                alt="Scan to Play"
                className="qr-img"
                onError={(e) => { e.target.src = "/images/qr/mygplay_qr.svg"; }}
              />
            </div>
            <div className="qr-label font-goofy">
              <span>SCAN TO PLAY</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="tv-grid-layout">

          {/* LEFT: PODIUM */}
          <div className="podium-container">

            <div className="tv-podium">
              {/* 🥈 SECOND PLACE */}
              {topThree[1] ? (
                <div className="podium-column silver-podium animate-slide-up">
                  <div className="avatar-stand silver">
                    <span className="emoji">🥈</span>
                  </div>
                  <div className="player-details">
                    <span className="podium-rank-label font-goofy">2ND PLACE</span>
                    <h2 className="podium-player-name">{topThree[1].name}</h2>
                    <div className="score-badge silver-score">
                      <Coins size={18} className="score-badge-coin" />
                      <span>{topThree[1].highscore.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="pedestal silver-pedestal">
                    <span className="pedestal-number font-goofy">2</span>
                  </div>
                </div>
              ) : (
                <div className="podium-column silver-podium empty-column">
                  <div className="pedestal silver-pedestal empty"></div>
                </div>
              )}

              {/* 🥇 FIRST PLACE */}
              {topThree[0] ? (
                <div className="podium-column gold-podium animate-slide-up-gold">
                  <div className="crown-holder">
                    <span className="gold-crown animate-crown">👑</span>
                  </div>
                  <div className="avatar-stand gold animate-pulse-glow">
                    <span className="emoji">🥇</span>
                  </div>
                  <div className="player-details">
                    <span className="podium-rank-label gold-glow font-goofy">CHAMPION</span>
                    <h2 className="podium-player-name gold-name">{topThree[0].name}</h2>
                    <div className="score-badge gold-score animate-pulse">
                      <Coins size={26} className="gold-coin-glow" />
                      <span>{topThree[0].highscore.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="pedestal gold-pedestal">
                    <span className="pedestal-number font-goofy">1</span>
                  </div>
                </div>
              ) : (
                <div className="podium-column gold-podium empty-column">
                  <div className="pedestal gold-pedestal empty"></div>
                </div>
              )}

              {/* 🥉 THIRD PLACE */}
              {topThree[2] ? (
                <div className="podium-column bronze-podium animate-slide-up">
                  <div className="avatar-stand bronze">
                    <span className="emoji">🥉</span>
                  </div>
                  <div className="player-details">
                    <span className="podium-rank-label font-goofy">3RD PLACE</span>
                    <h2 className="podium-player-name">{topThree[2].name}</h2>
                    <div className="score-badge bronze-score">
                      <Coins size={18} className="score-badge-coin" />
                      <span>{topThree[2].highscore.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="pedestal bronze-pedestal">
                    <span className="pedestal-number font-goofy">3</span>
                  </div>
                </div>
              ) : (
                <div className="podium-column bronze-podium empty-column">
                  <div className="pedestal bronze-pedestal empty"></div>
                </div>
              )}
            </div>

            {/* QR Code — Bottom Left of podium panel */}
            <div className="tv-bottom-left-qr">
              <div className="qr-wrapper">
                <img
                  src="/images/qr/mygplay_qr_brand.png"
                  alt="Scan to Play"
                  className="qr-img"
                  onError={(e) => { e.target.src = "/images/qr/mygplay_qr.svg"; }}
                />
              </div>
              <div className="qr-label font-goofy">
                <span>SCAN TO PLAY</span>
              </div>
            </div>

          </div>

          {/* RIGHT: LEADERBOARD LIST (Ranks 4+) */}
          <div className="roster-container">
            <div className="roster-header">
              <span className="roster-header-title font-goofy">HOURLY CHAMPIONS ({getCurrentHourBlock()})</span>
              <span className="roster-count font-goofy">{players.length} ACTIVE PLAYERS</span>
            </div>

            <div className="tv-roster-scroll-box" ref={listRef}>
              <div className="tv-roster-column-list">
                {remainingPlayers.map((player) => (
                  <div
                    key={player.id}
                    className={`tv-roster-row rank-${player.rank}`}
                  >
                    <div className="tv-roster-rank font-goofy">
                      #{player.rank}
                    </div>
                    <div className="tv-roster-name-wrap">
                      <span className="tv-roster-name">{player.name}</span>
                    </div>
                    <div className="tv-roster-score">
                      <Coins size={18} className="score-coin" />
                      <span>{player.highscore.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Hourly Winner Announcement Ticker */}
      <footer className="tv-footer-ticker">
        <div className="ticker-badge font-goofy">
          <Trophy size={16} className="ticker-trophy" />
          <span>HOURLY REWARDS</span>
        </div>
        <div className="ticker-wrap">
          <div className="ticker-content">
            WINNERS ARE SELECTED EVERY HOUR! THE TOP PLAYER FROM EACH HOUR WINS EXCITING REWARDS!
          </div>
        </div>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Luckiest+Guy&family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap');

        .tv-dashboard {
          background: #020107;
          height: calc(100vh - 80px);
          width: 100%;
          color: #fff;
          font-family: 'Inter', sans-serif;
          position: relative;
          padding: 16px 20px;
          box-sizing: border-box;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .tv-fullscreen {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          height: 100vh !important;
          z-index: 2000;
          padding: 16px 24px;
          background: #020107;
          overflow: hidden;
        }

        /* Ambient Neons */
        .tv-glow {
          position: absolute;
          width: 500px; height: 500px;
          border-radius: 50%;
          filter: blur(160px);
          opacity: 0.12;
          pointer-events: none;
          z-index: 0;
        }
        .tv-glow.pink  { top: -200px; left: -100px; background: #ff007f; }
        .tv-glow.orange { bottom: -150px; right: -100px; background: #ff6b00; }
        .tv-glow.blue  { top: 50%; left: 50%; transform: translate(-50%,-50%); background: #00ffff; width: 600px; height: 600px; opacity: 0.05; }

        /* Controls */
        .tv-top-left-controls {
          position: absolute;
          top: 16px; left: 20px;
          z-index: 100;
          display: flex;
          gap: 10px;
        }
        .tv-fullscreen .tv-top-left-controls.sidebar-visible { left: 304px; }
        .tv-btn {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.7);
          padding: 7px 14px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 7px;
          transition: all 0.2s ease;
        }
        .tv-btn:hover { background: rgba(255,255,255,0.08); color:#fff; border-color: rgba(255,255,255,0.2); }
        .tv-btn.active { color: #ff6b00; border-color: rgba(255,107,0,0.3); background: rgba(255,107,0,0.06); }
        .tv-btn.highlight { background: #ff6b00; border: none; color: #fff; box-shadow: 0 4px 12px rgba(255,107,0,0.2); }
        .tv-btn.highlight:hover { background: #ff8533; transform: translateY(-1px); }

        /* ── BANNER ── tighter height so podium gets more room */
        .tv-header-cover {
          position: relative;
          z-index: 10;
          width: 100%;
          flex-shrink: 0;
        }
        .tv-cover-img {
          width: 100%;
          height: auto;
          max-height: 180px;          /* KEY: was 290px — shrunk banner so podium fits */
          object-fit: cover;
          border-radius: 16px;
          box-shadow: 0 10px 28px rgba(0,0,0,0.6);
          border: 1.5px solid rgba(255,255,255,0.04);
        }

        /* ── MAIN GRID: side-by-side ── */
        .tv-grid-layout {
          position: relative;
          z-index: 10;
          flex: 1;
          display: flex;
          flex-direction: row;
          align-items: stretch;
          gap: 16px;
          min-height: 0;
        }

        /* ── PODIUM PANEL ── */
        .podium-container {
          background: rgba(10,5,24,0.3);
          border: 1.5px solid rgba(255,255,255,0.04);
          border-radius: 24px;
          padding: 20px 16px 16px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;   /* podium up top, QR pinned bottom */
          align-items: center;
          box-shadow: 0 15px 40px rgba(0,0,0,0.5);
          backdrop-filter: blur(8px);
          flex: 1.4;
          min-width: 0;
          position: relative;
        }

        /* Podium stand row */
        .tv-podium {
          display: flex;
          align-items: flex-end;
          justify-content: center;
          gap: 12px;
          width: 100%;
          flex: 1;
          min-height: 0;
        }

        .podium-column {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          min-width: 0;
        }

        .avatar-stand {
          width: 60px; height: 60px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 8px 20px rgba(0,0,0,0.5);
          z-index: 2;
          margin-bottom: 8px;
        }
        .avatar-stand .emoji { font-size: 26px; }
        .avatar-stand.gold   { width: 76px; height: 76px; background: rgba(255,215,0,0.15); border: 3px solid #ffd700; box-shadow: 0 0 30px rgba(255,215,0,0.3); }
        .avatar-stand.silver { background: rgba(192,192,192,0.15); border: 2px solid #c0c0c0; }
        .avatar-stand.bronze { background: rgba(205,127,50,0.15);  border: 2px solid #cd7f32; }
        .avatar-stand.gold .emoji { font-size: 32px; }

        .crown-holder {
          position: absolute;
          top: -28px;
          z-index: 5;
          animation: float-y 2.5s ease-in-out infinite;
        }
        .gold-crown { font-size: 30px; display: block; }
        .animate-crown { filter: drop-shadow(0 0 8px #ffd700); }

        .player-details {
          text-align: center;
          margin-bottom: 10px;
          z-index: 2;
          width: 100%;
        }
        .podium-rank-label {
          font-size: 11px;
          color: rgba(255,255,255,0.4);
          letter-spacing: 0.14em;
          display: block;
          margin-bottom: 2px;
        }
        .podium-rank-label.gold-glow { color: #ffd700; font-size: 13px; text-shadow: 0 0 8px rgba(255,215,0,0.35); }

        .podium-player-name {
          font-family: 'Inter', sans-serif !important;
          font-weight: 800 !important;
          font-size: 20px;
          color: #fff;
          margin: 0 0 5px 0;
          line-height: 1.1;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-transform: uppercase;
          text-shadow: 0 2px 5px rgba(0,0,0,0.6);
          word-break: break-all;
        }
        .podium-player-name.gold-name {
          font-size: 28px;
          color: #ffe680;
          font-weight: 900 !important;
          text-shadow: 0 0 14px rgba(255,215,0,0.5);
        }

        .score-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 14px;
        }
        .score-badge span { font-weight: 300 !important; font-family: 'Inter', sans-serif !important; }
        .score-badge-coin { opacity: 0.9; }
        .score-badge.gold-score   { background: rgba(255,215,0,0.15); border: 1.5px solid rgba(255,215,0,0.35); color: #ffd700; font-size: 18px; padding: 7px 18px; }
        .score-badge.gold-score span { font-weight: 300 !important; }
        .score-badge.silver-score { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff; }
        .score-badge.bronze-score { background: rgba(205,127,50,0.1); border: 1px solid rgba(205,127,50,0.2); color: #ffaa66; }
        .gold-coin-glow { filter: drop-shadow(0 0 8px #ffd700); }

        /* Pedestals */
        .pedestal {
          width: 100%;
          border-radius: 12px 12px 0 0;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          box-shadow: 0 8px 24px rgba(0,0,0,0.6);
        }
        .pedestal-number { font-size: 38px; color: rgba(255,255,255,0.08); position: absolute; line-height: 1; }
        .gold-pedestal   { height: 120px; background: linear-gradient(180deg,#b38600 0%,#332700 100%); border: 2.5px solid #ffd700; border-bottom: none; }
        .gold-pedestal .pedestal-number { font-size: 52px; color: rgba(255,215,0,0.15); }
        .silver-pedestal { height: 85px;  background: linear-gradient(180deg,#808080 0%,#1a1a1a 100%); border: 1.5px solid #c0c0c0; border-bottom: none; }
        .bronze-pedestal { height: 65px;  background: linear-gradient(180deg,#8c5623 0%,#1f1207 100%); border: 1.5px solid #cd7f32; border-bottom: none; }
        .empty-column { justify-content: flex-end; }
        .pedestal.empty { background: rgba(255,255,255,0.01); border: 1px dashed rgba(255,255,255,0.05); height: 50px; }

        /* ── QR — pinned to bottom of podium panel ── */
        .tv-bottom-left-qr {
          display: flex;
          flex-direction: row;          /* horizontal: QR image + label side-by-side */
          align-items: center;
          gap: 12px;
          background: rgba(10,5,24,0.85);
          border: 2px solid #ff6b00;
          padding: 10px 18px 10px 10px;
          border-radius: 18px;
          backdrop-filter: blur(12px);
          box-shadow: 0 10px 28px rgba(0,0,0,0.8), 0 0 18px rgba(255,107,0,0.2);
          align-self: flex-start;       /* don't stretch full width */
          animation: qr-float 3.5s ease-in-out infinite;
          flex-shrink: 0;
        }
        .tv-bottom-left-qr:hover { transform: scale(1.02); border-color: #ff9e00; }
        .qr-wrapper {
          background: #fff;
          padding: 6px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .qr-img { width: 100px; height: 100px; display: block; }
        .qr-label {
          font-size: 18px;
          color: #ff6b00;
          letter-spacing: 0.08em;
          text-shadow: 0 0 8px rgba(255,107,0,0.5);
          white-space: nowrap;
        }
        @keyframes qr-float {
          0%,100% { transform: translateY(0); }
          50%      { transform: translateY(-4px); }
        }

        /* ── LEADERBOARD PANEL ── */
        .roster-container {
          background: rgba(10,5,24,0.3);
          border: 1.5px solid rgba(255,255,255,0.04);
          border-radius: 24px;
          padding: 18px 16px;
          display: flex;
          flex-direction: column;
          flex: 0.85;
          min-width: 0;
          height: 100%;
          min-height: 0;
          box-shadow: 0 15px 40px rgba(0,0,0,0.5);
          backdrop-filter: blur(8px);
        }
        .roster-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid rgba(255,255,255,0.05);
          padding-bottom: 12px;
          margin-bottom: 12px;
        }
        .roster-header-title {
          font-size: 18px;
          color: #00ffff;
          letter-spacing: 0.1em;
          text-shadow: 0 0 10px rgba(0,255,255,0.3);
        }
        .roster-count {
          font-size: 10px;
          color: rgba(255,255,255,0.4);
          letter-spacing: 0.08em;
          background: rgba(255,255,255,0.03);
          padding: 4px 10px;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.06);
        }

        .tv-roster-scroll-box {
          flex: 1;
          overflow-y: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .tv-roster-scroll-box::-webkit-scrollbar { display: none; }

        .tv-roster-column-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .tv-roster-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(255,255,255,0.015);
          border: 1.5px solid rgba(255,255,255,0.03);
          border-radius: 12px;
          padding: 7px 14px;
          transition: all 0.3s ease;
        }
        .tv-roster-row:hover { background: rgba(255,255,255,0.035); border-color: rgba(255,255,255,0.07); }
        .tv-roster-row.rank-1 { background: rgba(255,215,0,0.03); border-color: rgba(255,215,0,0.15); }
        .tv-roster-row.rank-2 { background: rgba(255,255,255,0.02); border-color: rgba(255,255,255,0.08); }
        .tv-roster-row.rank-3 { background: rgba(205,127,50,0.02); border-color: rgba(205,127,50,0.1); }

        .tv-roster-rank { font-size: 14px; color: rgba(255,255,255,0.3); width: 36px; }
        .tv-roster-name-wrap { flex: 1; min-width: 0; }
        .tv-roster-name {
          font-family: 'Inter', sans-serif !important;
          font-weight: 700 !important;
          font-size: 16px;
          color: #fff;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: block;
        }
        .tv-roster-row.rank-1 .tv-roster-name { color: #ffe680; }
        .tv-roster-row.rank-3 .tv-roster-name { color: #ffcc99; }

        .tv-roster-score {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 16px;
          color: #ff6b00;
          font-family: 'Inter', sans-serif !important;
        }
        .tv-roster-score span { font-weight: 300 !important; letter-spacing: 0.04em; }
        .tv-roster-row.rank-1 .tv-roster-score { color: #ffd700; }
        .tv-roster-row.rank-2 .tv-roster-score { color: #fff; }
        .tv-roster-row.rank-3 .tv-roster-score { color: #ffaa66; }
        .score-coin { filter: drop-shadow(0 0 4px rgba(255,107,0,0.4)); }

        /* Loader / Empty */
        .tv-loader { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; }
        .tv-spinner { width: 50px; height: 50px; border: 4px solid rgba(255,107,0,0.1); border-top-color: #ff6b00; border-radius: 50%; animation: spin 1s linear infinite; }
        .tv-loader-text { font-size: 13px; color: rgba(255,255,255,0.5); letter-spacing: 0.15em; }
        .tv-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 12px; }
        .empty-icon { color: rgba(255,255,255,0.1); animation: pulse 2s infinite; }
        .tv-empty h2 { font-size: 26px; margin: 0; color: #ff6b00; }
        .tv-empty p  { font-size: 14px; color: rgba(255,255,255,0.4); margin: 0; }

        /* ── TICKER ── */
        .tv-footer-ticker {
          position: relative;
          z-index: 10;
          display: flex;
          align-items: center;
          background: rgba(10,5,24,0.7);
          border: 2px solid rgba(255,107,0,0.35);
          border-left: 5px solid #ff6b00;
          padding: 7px 14px;
          border-radius: 14px;
          backdrop-filter: blur(10px);
          gap: 14px;
          flex-shrink: 0;
          overflow: hidden;
          box-shadow: 0 8px 24px rgba(0,0,0,0.5);
        }
        .ticker-badge {
          background: #ff6b00;
          color: #fff;
          padding: 5px 10px;
          border-radius: 9px;
          font-size: 12px;
          letter-spacing: 0.08em;
          display: flex;
          align-items: center;
          gap: 7px;
          box-shadow: 0 0 14px rgba(255,107,0,0.4);
          flex-shrink: 0;
          animation: badge-pulse 2s infinite;
        }
        .ticker-trophy { animation: spin 3s linear infinite; }
        .ticker-wrap { flex: 1; overflow: hidden; display: flex; align-items: center; }
        .ticker-content {
          font-family: 'Inter', sans-serif !important;
          font-weight: 800;
          font-size: 22px;
          color: #ffffff;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          white-space: nowrap;
          animation: ticker-scroll 25s linear infinite;
        }

        /* ── Animations ── */
        @keyframes spin          { to { transform: rotate(360deg); } }
        @keyframes pulse         { 0%,100%{opacity:.5} 50%{opacity:1} }
        @keyframes pulse-glow    { 0%,100%{box-shadow:0 0 15px rgba(255,215,0,.2)} 50%{box-shadow:0 0 25px rgba(255,215,0,.35)} }
        @keyframes float-y       { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes slide-up      { from{transform:translateY(30px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes slide-up-gold { from{transform:translateY(50px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes ticker-scroll { 0%{transform:translateX(100%)} 100%{transform:translateX(-100%)} }
        @keyframes badge-pulse   { 0%,100%{transform:scale(1);box-shadow:0 0 15px rgba(255,107,0,.4)} 50%{transform:scale(1.03);box-shadow:0 0 25px rgba(255,107,0,.6)} }
        .animate-pulse          { animation: pulse 2s infinite; }
        .animate-pulse-glow     { animation: pulse-glow 2.5s infinite; }
        .animate-slide-up       { animation: slide-up 1s cubic-bezier(.16,1,.3,1) forwards; }
        .animate-slide-up-gold  { animation: slide-up-gold 1.2s cubic-bezier(.16,1,.3,1) forwards; }
        .font-goofy             { font-family: 'Luckiest Guy', cursive; }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .tv-dashboard { height: auto !important; min-height: calc(100vh - 80px) !important; padding: 12px; gap: 10px; }
          .tv-grid-layout { flex-direction: column; height: auto; gap: 14px; }
          .podium-container, .roster-container { width: 100%; height: auto; }
          .tv-cover-img { max-height: 100px; }
          .tv-bottom-left-qr { display: none !important; }
          .gold-pedestal  { height: 100px; }
          .silver-pedestal{ height: 72px;  }
          .bronze-pedestal{ height: 56px;  }
          .podium-player-name.gold-name { font-size: 22px; }
          .podium-player-name { font-size: 17px; }
        }
        @media (max-width: 480px) {
          .tv-cover-img { max-height: 72px; border-radius: 10px; }
          .avatar-stand { width: 50px; height: 50px; }
          .avatar-stand .emoji { font-size: 22px; }
          .avatar-stand.gold { width: 64px; height: 64px; }
          .gold-crown { font-size: 24px; }
          .crown-holder { top: -20px; }
          .podium-player-name.gold-name { font-size: 18px; }
          .podium-player-name { font-size: 14px; }
          .score-badge { font-size: 12px; padding: 3px 8px; }
          .score-badge.gold-score { font-size: 14px; padding: 5px 10px; }
          .tv-roster-row { padding: 6px 10px; }
          .tv-roster-name { font-size: 14px; }
          .tv-roster-score { font-size: 14px; }
          .tv-roster-rank { width: 28px; font-size: 12px; }
          .ticker-content { font-size: 17px; }
        }
      `}</style>
    </div>
  );
};

export default TVView;
