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

  // 1. Fetch and sort leaderboard data - limited to top 50 players
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
          lastPlayedAt: lastPlayedAt
        });
      });

      // Sort by highscore descending (highest score first)
      fetchedPlayers.sort((a, b) => b.highscore - a.highscore);

      // Only slice top 50 players
      const top50 = fetchedPlayers.slice(0, 50);

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
      const rowHeight = firstRow ? firstRow.offsetHeight + 12 : 74; // exact height + 12px flex gap

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
  const remainingPlayers = players.slice(3); 
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
        {/* Sidebar Toggle Button */}
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

      {/* Floating QR Code at Top Right for players to scan and join instantly */}
      <div className="tv-top-right-qr">
        <div className="qr-wrapper">
          <img 
            src="/images/qr/mygplay_qr_brand.png" 
            alt="Scan to Play" 
            className="qr-img" 
            onError={(e) => {
              // Fallback to standard SVG if brand PNG fails
              e.target.src = "/images/qr/mygplay_qr.svg";
            }}
          />
        </div>
        <div className="qr-label font-goofy">
          <span>SCAN TO PLAY</span>
        </div>
      </div>

      {/* Header Cover Banner (Fully Visible & Uncropped) */}
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
        </div>
      ) : (
        <div className="tv-grid-layout">
          {/* TOP SECTION: THE PODIUM STAND (Spans full width) */}
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
                      <Coins size={22} className="score-badge-coin" />
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

              {/* 🥇 FIRST PLACE (TALLER, CROWNED, ULTRA BIG) */}
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
                      <Coins size={30} className="gold-coin-glow" />
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
                      <Coins size={22} className="score-badge-coin" />
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
          </div>

          {/* RIGHT SECTION: SINGLE-COLUMN LEADERBOARD LIST (Ranks 4-50) */}
          <div className="roster-container">
            <div className="roster-header">
              <span className="roster-header-title font-goofy">HALL OF FAME (TOP 50)</span>
              <span className="roster-count font-goofy">{players.length} PLAYERS REGISTERED</span>
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
                      <Coins size={22} className="score-coin" />
                      <span>{player.highscore.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

         
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Luckiest+Guy&family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap');

        /* Dashboard Container Settings */
        .tv-dashboard {
          background: #020107;
          height: calc(100vh - 80px);
          width: 100%;
          color: #fff;
          font-family: 'Inter', sans-serif;
          position: relative;
          padding: 24px;
          box-sizing: border-box;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        /* Fullscreen View Overrides */
        .tv-fullscreen {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          height: 100vh !important;
          min-height: 100vh !important;
          z-index: 2000;
          padding: 30px 40px;
          background: #020107;
          overflow: hidden;
        }

        /* Ambient Neons */
        .tv-glow {
          position: absolute;
          width: 500px;
          height: 500px;
          border-radius: 50%;
          filter: blur(160px);
          opacity: 0.12;
          pointer-events: none;
          z-index: 0;
        }
        .tv-glow.pink {
          top: -200px;
          left: -100px;
          background: #ff007f;
        }
        .tv-glow.orange {
          bottom: -150px;
          right: -100px;
          background: #ff6b00;
        }
        .tv-glow.blue {
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: #00ffff;
          width: 600px;
          height: 600px;
          opacity: 0.05;
        }

        /* Control Panel */
        .tv-controls {
          position: relative;
          z-index: 10;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          padding: 10px 20px;
          border-radius: 16px;
          backdrop-filter: blur(10px);
        }
        .tv-meta-info {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .live-badge {
          background: rgba(255, 59, 48, 0.15);
          color: #ff3b30;
          border: 1px solid rgba(255, 59, 48, 0.3);
          padding: 4px 12px;
          border-radius: 10px;
          font-weight: 800;
          font-size: 11px;
          letter-spacing: 0.08em;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .live-dot {
          width: 6px;
          height: 6px;
          background: #ff3b30;
          border-radius: 50%;
          animation: pulse 1.2s infinite;
        }
        .last-updated-text {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.4);
          font-weight: 500;
        }
        .tv-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .tv-btn {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.7);
          padding: 8px 16px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
        }
        .tv-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
          border-color: rgba(255, 255, 255, 0.2);
        }
        .tv-btn.active {
          color: #ff6b00;
          border-color: rgba(255, 107, 0, 0.3);
          background: rgba(255, 107, 0, 0.06);
        }
        .tv-btn.highlight {
          background: #ff6b00;
          border: none;
          color: #fff;
          box-shadow: 0 4px 12px rgba(255, 107, 0, 0.2);
        }
        .tv-btn.highlight:hover {
          background: #ff8533;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(255, 107, 0, 0.3);
        }

        /* Floating Controls at Top Left */
        .tv-top-left-controls {
          position: absolute;
          top: 24px;
          left: 24px;
          z-index: 100;
          display: flex;
          gap: 12px;
          transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        /* Shift right in fullscreen mode when sidebar overlaps the view */
        .tv-fullscreen .tv-top-left-controls.sidebar-visible {
          left: 304px; /* 280px sidebar width + 24px padding */
        }

        /* Floating QR Code Card at Top Right (Doubled Size) */
        .tv-top-right-qr {
          position: absolute;
          top: 24px;
          right: 24px;
          z-index: 100;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          background: rgba(10, 5, 24, 0.8);
          border: 2.5px solid #ff6b00;
          padding: 12px 14px;
          border-radius: 28px;
          backdrop-filter: blur(12px);
          box-shadow: 0 20px 45px rgba(0, 0, 0, 0.75), 0 0 25px rgba(255, 107, 0, 0.3);
          animation: qr-float 3.5s ease-in-out infinite;
          transition: all 0.3s ease;
        }
        .tv-top-right-qr:hover {
          transform: scale(1.03);
          border-color: #ff9e00;
          box-shadow: 0 20px 45px rgba(0, 0, 0, 0.85), 0 0 35px rgba(255, 107, 0, 0.45);
        }
        .qr-wrapper {
          background: #fff;
          padding: 10px;
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: inset 0 3px 6px rgba(0,0,0,0.15);
        }
        .qr-img {
          width: 160px; /* DOUBLE SIZE */
          height: 160px; /* DOUBLE SIZE */
          display: block;
        }
        .qr-label {
          font-size: 20px; /* DOUBLE SIZE */
          color: #ff6b00;
          letter-spacing: 0.12em;
          text-shadow: 0 0 10px rgba(255, 107, 0, 0.5);
          margin-top: 4px;
          text-align: center;
        }

        @keyframes qr-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }

        /* Header Cover Banner Styles (Uncropped Cover Banner) */
        .tv-header-cover {
          position: relative;
          z-index: 10;
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          margin: 0 auto;
          box-sizing: border-box;
          flex-shrink: 0;
        }
        .tv-cover-img {
          width: 100%;
          height: auto;
          max-height: 290px;
          object-fit: cover; /* Full image is shown uncropped */
          border-radius: 20px;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.6);
          border: 1.5px solid rgba(255, 255, 255, 0.04);
          transition: all 0.3s ease;
        }
        .tv-cover-img:hover {
          filter: drop-shadow(0 0 25px rgba(255, 107, 0, 0.15));
        }

        /* Side-by-Side Split TV Layout */
        .tv-grid-layout {
          position: relative;
          z-index: 10;
          flex: 1;
          display: flex;
          flex-direction: row; /* Side-by-side layout! */
          align-items: stretch;
          gap: 30px;
          min-height: 0;
          width: 100%;
        }

        /* 🏆 Podium Section Styles (Spans left side of screen) */
        .podium-container {
          background: rgba(10, 5, 24, 0.3);
          border: 1.5px solid rgba(255, 255, 255, 0.04);
          border-radius: 30px;
          padding: 30px 24px;
          display: flex;
          flex-direction: column;
          justify-content: center; /* Center podium stands vertically */
          align-items: center;
          box-shadow: 0 15px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03);
          backdrop-filter: blur(8px);
          flex: 1.5; /* Takes up left side (Gives more space to top 3) */
          min-width: 0;
          height: 100%;
        }
        .podium-header {
          font-size: 22px;
          text-align: center;
          margin: 0 0 16px 0;
          color: #ff6b00;
          letter-spacing: 0.12em;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          text-shadow: 0 0 10px rgba(255, 107, 0, 0.3);
        }
        .sparkle-icon {
          color: #00ffff;
          animation: pulse 1.5s infinite;
        }

        /* TV 3D Podium Stand Layout */
        .tv-podium {
          display: flex;
          align-items: flex-end;
          justify-content: center;
          gap: 20px; /* Reduced gap to fit beautifully side-by-side */
          width: 100%;
          margin: auto 0;
          padding-bottom: 10px;
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
          width: 90px;
          height: 90px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 25px rgba(0,0,0,0.5);
          z-index: 2;
          margin-bottom: 12px;
        }
        .avatar-stand .emoji {
          font-size: 38px;
        }
        .avatar-stand.gold {
          width: 115px;
          height: 115px;
          background: rgba(255, 215, 0, 0.15);
          border: 3.5px solid #ffd700;
          box-shadow: 0 0 35px rgba(255, 215, 0, 0.3);
        }
        .avatar-stand.silver {
          background: rgba(192, 192, 192, 0.15);
          border: 2px solid #c0c0c0;
          box-shadow: 0 0 20px rgba(192, 192, 192, 0.15);
        }
        .avatar-stand.bronze {
          background: rgba(205, 127, 50, 0.15);
          border: 2px solid #cd7f32;
          box-shadow: 0 0 20px rgba(205, 127, 50, 0.15);
        }

        .crown-holder {
          position: absolute;
          top: -46px;
          z-index: 5;
          animation: float-y 2.5s ease-in-out infinite;
        }
        .gold-crown {
          font-size: 48px;
          display: block;
        }
        .animate-crown {
          filter: drop-shadow(0 0 8px #ffd700);
        }

        .player-details {
          text-align: center;
          margin-bottom: 12px;
          z-index: 2;
          width: 100%;
        }
        .podium-rank-label {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.4);
          letter-spacing: 0.15em;
          display: block;
          margin-bottom: 4px;
        }
        .podium-rank-label.gold-glow {
          color: #ffd700;
          font-size: 15px;
          text-shadow: 0 0 8px rgba(255, 215, 0, 0.35);
        }
        
        /* 1. INCREASED Player Name weights (Ultra-Bold) */
        .podium-player-name {
          font-family: 'Inter', sans-serif !important;
          font-weight: 800 !important; /* INCREASED WEIGHT */
          font-size: 38px;
          color: #fff;
          margin: 0 0 10px 0;
          line-height: 1.1;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-transform: uppercase;
          text-shadow: 0 3px 6px rgba(0, 0, 0, 0.6);
          word-break: break-all;
          letter-spacing: 0.02em;
        }
        .podium-player-name.gold-name {
          font-size: 48px;
          color: #ffe680;
          font-weight: 900 !important; /* ULTRA BOLD CHAMPION */
          text-shadow: 0 0 15px rgba(255, 215, 0, 0.5);
        }

        /* 2. DECREASED Score values weights (Extra-Thin / Light) */
        .score-badge {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 8px 18px;
          border-radius: 24px;
          font-size: 22px;
          box-shadow: 0 6px 12px rgba(0,0,0,0.3);
        }
        .score-badge span {
          font-weight: 300 !important; /* DECREASED WEIGHT */
          font-family: 'Inter', sans-serif !important;
          letter-spacing: 0.05em;
        }
        .score-badge-coin {
          color: #fff;
          opacity: 0.9;
        }
        .score-badge.gold-score {
          background: rgba(255, 215, 0, 0.15);
          border: 1.5px solid rgba(255, 215, 0, 0.35);
          color: #ffd700;
          font-size: 28px;
          padding: 10px 28px;
          box-shadow: 0 6px 20px rgba(255, 215, 0, 0.15);
        }
        .score-badge.gold-score span {
          font-weight: 300 !important; /* DECREASED WEIGHT */
        }
        .score-badge.silver-score {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #fff;
        }
        .score-badge.bronze-score {
          background: rgba(205, 127, 50, 0.1);
          border: 1px solid rgba(205, 127, 50, 0.2);
          color: #ffaa66;
        }
        .gold-coin-glow {
          filter: drop-shadow(0 0 8px #ffd700);
        }

        /* 3D Pedestal stands */
        .pedestal {
          width: 100%;
          border-radius: 14px 14px 0 0;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          box-shadow: 0 10px 30px rgba(0,0,0,0.6);
        }
        .pedestal-number {
          font-size: 60px;
          color: rgba(255, 255, 255, 0.08);
          position: absolute;
          line-height: 1;
        }
        .gold-pedestal {
          height: 180px;
          background: linear-gradient(180deg, #b38600 0%, #332700 100%);
          border: 2.5px solid #ffd700;
          border-bottom: none;
        }
        .gold-pedestal .pedestal-number {
          font-size: 80px;
          color: rgba(255, 215, 0, 0.15);
        }
        .silver-pedestal {
          height: 130px;
          background: linear-gradient(180deg, #808080 0%, #1a1a1a 100%);
          border: 1.5px solid #c0c0c0;
          border-bottom: none;
        }
        .bronze-pedestal {
          height: 100px;
          background: linear-gradient(180deg, #8c5623 0%, #1f1207 100%);
          border: 1.5px solid #cd7f32;
          border-bottom: none;
        }

        .empty-column {
          justify-content: flex-end;
        }
        .pedestal.empty {
          background: rgba(255, 255, 255, 0.01);
          border: 1px dashed rgba(255, 255, 255, 0.05);
          height: 50px;
        }

        /* 📋 Single-Column Leaderboard List Section (Ranks 4-50) */
        .roster-container {
          background: rgba(10, 5, 24, 0.3);
          border: 1.5px solid rgba(255, 255, 255, 0.04);
          border-radius: 30px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          flex: 0.9; /* Compact right column for single vertical list */
          min-width: 0;
          height: 100%;
          min-height: 0; /* Essential for flex inner scrolling */
          box-shadow: 0 15px 40px rgba(0,0,0,0.5);
          backdrop-filter: blur(8px);
        }
        .roster-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid rgba(255, 255, 255, 0.05);
          padding-bottom: 14px;
          margin-bottom: 16px;
        }
        .roster-header-title {
          font-size: 20px;
          color: #00ffff;
          letter-spacing: 0.1em;
          text-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
        }
        .roster-count {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.4);
          letter-spacing: 0.08em;
          background: rgba(255,255,255,0.03);
          padding: 4px 12px;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.06);
        }

        /* Custom Scrollbox */
        .tv-roster-scroll-box {
          flex: 1;
          overflow-y: auto;
          scrollbar-width: none; /* Hide scrollbar Firefox */
          -ms-overflow-style: none; /* Hide scrollbar IE */
          padding-right: 4px;
        }
        .tv-roster-scroll-box::-webkit-scrollbar {
          display: none; /* Hide scrollbar Chrome/Safari */
        }

        /* 2-Column Grid Setup */
        .tv-roster-columns {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          min-height: 100%;
        }
        .tv-roster-column-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .tv-roster-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(255, 255, 255, 0.015);
          border: 1.5px solid rgba(255, 255, 255, 0.03);
          border-radius: 18px;
          padding: 14px 24px;
          transition: all 0.3s ease;
        }
        .tv-roster-row:hover {
          background: rgba(255, 255, 255, 0.035);
          border-color: rgba(255, 255, 255, 0.07);
        }
        .tv-roster-row.top-tier {
          background: rgba(255, 107, 0, 0.01);
          border-color: rgba(255, 107, 0, 0.05);
        }
        .tv-roster-row.rank-1 {
          background: rgba(255, 215, 0, 0.03);
          border-color: rgba(255, 215, 0, 0.15);
        }
        .tv-roster-row.rank-2 {
          background: rgba(255, 255, 255, 0.02);
          border-color: rgba(255, 255, 255, 0.08);
        }
        .tv-roster-row.rank-3 {
          background: rgba(205, 127, 50, 0.02);
          border-color: rgba(205, 127, 50, 0.1);
        }

        .tv-roster-rank {
          font-size: 20px;
          color: rgba(255, 255, 255, 0.3);
          width: 55px;
        }
        
        .tv-roster-name-wrap {
          flex: 1;
          min-width: 0;
        }
        
        /* 1. INCREASED Names weights in roster (Bold weight 700) */
        .tv-roster-name {
          font-family: 'Inter', sans-serif !important;
          font-weight: 700 !important; /* INCREASED WEIGHT */
          font-size: 26px;
          color: #fff;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: block;
        }
        .tv-roster-row.rank-1 .tv-roster-name {
          color: #ffe680;
        }
        .tv-roster-row.rank-2 .tv-roster-name {
          color: #fff;
        }
        .tv-roster-row.rank-3 .tv-roster-name {
          color: #ffcc99;
        }

        /* 2. DECREASED score weights (Thin/Light weight 300) */
        .tv-roster-score {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 24px;
          color: #ff6b00;
          font-family: 'Inter', sans-serif !important;
        }
        .tv-roster-score span {
          font-weight: 300 !important; /* DECREASED WEIGHT */
          letter-spacing: 0.05em;
        }
        .tv-roster-row.rank-1 .tv-roster-score {
          color: #ffd700;
          text-shadow: 0 0 8px rgba(255,215,0,0.25);
        }
        .tv-roster-row.rank-2 .tv-roster-score {
          color: #fff;
        }
        .tv-roster-row.rank-3 .tv-roster-score {
          color: #ffaa66;
        }
        .score-coin {
          width: 20px;
          height: 20px;
          filter: drop-shadow(0 0 4px rgba(255,107,0,0.4));
        }

        /* Auto-scroll prompt footer */
        .tv-roster-footer {
          border-top: 1.5px solid rgba(255, 255, 255, 0.04);
          padding-top: 12px;
          text-align: center;
        }
        .auto-scroll-hint {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.25);
          font-weight: 800;
          letter-spacing: 0.1em;
        }

        /* Loader */
        .tv-loader {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 20px;
        }
        .tv-spinner {
          width: 55px;
          height: 55px;
          border: 4px solid rgba(255, 107, 0, 0.1);
          border-top-color: #ff6b00;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        .tv-loader-text {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.5);
          letter-spacing: 0.15em;
        }

        /* Empty State */
        .tv-empty {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 12px;
        }
        .empty-icon {
          color: rgba(255, 255, 255, 0.1);
          animation: pulse 2s infinite;
        }
        .tv-empty h2 {
          font-size: 28px;
          margin: 0;
          color: #ff6b00;
          letter-spacing: 0.05em;
        }
        .tv-empty p {
          font-size: 16px;
          color: rgba(255,255,255,0.4);
          margin: 0;
          letter-spacing: 0.1em;
        }

        /* Animations */
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .spin-anim {
          animation: spin 3s linear infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        .animate-pulse {
          animation: pulse 2s infinite;
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 15px rgba(255, 215, 0, 0.2); }
          50% { box-shadow: 0 0 25px rgba(255, 215, 0, 0.35); }
        }
        .animate-pulse-glow {
          animation: pulse-glow 2.5s infinite;
        }
        @keyframes float-y {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes slide-up {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes slide-up-gold {
          from { transform: translateY(50px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up-gold {
          animation: slide-up-gold 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes fade-in-out {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        .animate-fade-in-out {
          animation: fade-in-out 3s infinite;
        }

        .font-goofy {
          font-family: 'Luckiest Guy', cursive;
        }

        /* Responsive Breakpoints */
        @media (max-width: 1024px) {
          .tv-dashboard {
            height: auto !important;
            min-height: calc(100vh - 80px) !important;
          }
          .tv-grid-layout {
            flex-direction: column; /* Stack panels vertically on tablet and smaller screens */
            height: auto;
            gap: 20px;
          }
          .podium-container {
            width: 100%;
            height: auto;
          }
          .roster-container {
            width: 100%;
            height: auto;
          }
          .tv-cover-img {
            max-height: 140px;
          }
          .tv-podium {
            gap: 20px;
          }
          .pedestal.gold-pedestal { height: 110px; }
          .pedestal.silver-pedestal { height: 80px; }
          .pedestal.bronze-pedestal { height: 60px; }
          .podium-player-name.gold-name { font-size: 34px; }
          .podium-player-name { font-size: 26px; }
          .tv-roster-columns {
            grid-template-columns: 1fr;
            gap: 15px;
          }
        }

        @media (max-width: 768px) {
          .tv-dashboard {
            padding: 12px;
          }
          .tv-controls {
            flex-direction: column;
            gap: 10px;
            align-items: flex-start;
          }
          .tv-actions {
            width: 100%;
            justify-content: space-between;
          }
          .tv-cover-img {
            max-height: 90px;
            border-radius: 12px;
          }
          .podium-container {
            padding: 12px;
            border-radius: 20px;
          }
          .roster-container {
            padding: 12px;
            border-radius: 20px;
          }
          .avatar-stand {
            width: 55px;
            height: 55px;
          }
          .avatar-stand .emoji { font-size: 24px; }
          .avatar-stand.gold { width: 70px; height: 70px; }
          .gold-crown { font-size: 26px; }
          .crown-holder { top: -22px; }
          .podium-player-name.gold-name { font-size: 22px; }
          .podium-player-name { font-size: 18px; }
          .score-badge { font-size: 14px; padding: 4px 10px; }
          .score-badge.gold-score { font-size: 16px; padding: 6px 12px; }
          .tv-roster-row {
            padding: 8px 12px;
            border-radius: 12px;
          }
          .tv-roster-name {
            font-size: 18px;
          }
          .tv-roster-score {
            font-size: 18px;
          }
          .tv-roster-rank {
            width: 32px;
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  );
};

export default TVView;
