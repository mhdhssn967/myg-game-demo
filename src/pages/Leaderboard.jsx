import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import { Trophy, ChevronLeft, Award, Sparkles, Coins } from 'lucide-react';

const Leaderboard = () => {
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPlayerPhone, setCurrentPlayerPhone] = useState('');

  // 1. Fetch current player's phone from local storage to highlight them
  useEffect(() => {
    const stored = window.localStorage.getItem('myg_user_profile');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed?.phone) {
          setCurrentPlayerPhone(parsed.phone);
        }
      } catch (e) {
        console.warn('Error reading stored profile:', e);
      }
    }
  }, []);

  // 2. Fetch and sort leaderboard data in real-time
  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const roster = [];
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const phone = docSnap.id;
          
          // Skip documents without names or scores
          if (data.name && (data.highscore !== undefined || data.totalScore !== undefined)) {
            const highscore = Number(data.highscore || data.totalScore || 0);
            roster.push({
              phone,
              name: data.name,
              highscore,
            });
          }
        });

        // Sort by peak coin highscore descending
        roster.sort((a, b) => b.highscore - a.highscore);
        
        // Add rank positions
        const rankedRoster = roster.map((player, index) => ({
          ...player,
          rank: index + 1
        }));

        setPlayers(rankedRoster);
      } catch (err) {
        console.error('Failed to fetch leaderboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  // Split top-3 for podium and others for standard list
  const topThree = players.slice(0, 3);
  const regularPlayers = players.slice(3);

  // Find current player in the entire list for bottom floating badge
  const currentPlayerRecord = players.find(p => p.phone === currentPlayerPhone);

  return (
    <div className="leaderboard-overlay">
      {/* Background glow effects */}
      <div className="bg-glow purple"></div>
      <div className="bg-glow orange"></div>

      <div className="leaderboard-wrapper">
        {/* Floating Back Action Header */}
        <header className="leaderboard-header">
          <button className="back-btn" onClick={() => navigate('/')}>
            <ChevronLeft size={18} />
            <span>BACK TO GAME</span>
          </button>
          
          <div className="header-title-box">
            <Trophy className="header-trophy" size={32} />
            <h1 className="header-title font-goofy">MYG CHAMPIONS</h1>
            <p className="header-subtitle">Real-time Hall of Fame Leaderboard</p>
          </div>
        </header>

        {loading ? (
          <div className="loader-container">
            <div className="cyber-spinner"></div>
            <p className="loader-text">RETRIEVING CHAMPIONS...</p>
          </div>
        ) : players.length === 0 ? (
          <div className="empty-state">
            <Award className="empty-icon" size={48} />
            <h3 className="empty-title">NO RUNS LOGGED YET</h3>
            <p className="empty-subtitle">Be the first to secure a spot in the hall of fame!</p>
            <button className="cta-start-btn font-goofy" onClick={() => navigate('/')}>PLAY NOW</button>
          </div>
        ) : (
          <div className="leaderboard-content">
            
            {/* 🏆 Podium Section (Top 3 Players) */}
            {topThree.length > 0 && (
              <div className="podium-section">
                
                {/* 🥈 Second Place (Silver) */}
                {topThree[1] && (
                  <div className={`podium-card silver ${topThree[1].phone === currentPlayerPhone ? 'current-player-glow' : ''}`}>
                    <div className="podium-rank font-goofy">2</div>
                    <div className="podium-avatar silver">
                      <span>🥈</span>
                    </div>
                    <h3 className="podium-name">{topThree[1].name}</h3>
                    <div className="podium-score">
                      <Coins size={14} className="coin-glow" />
                      <span>{topThree[1].highscore.toLocaleString()}</span>
                    </div>
                  </div>
                )}

                {/* 🥇 First Place (Gold - Taller & Crowned!) */}
                {topThree[0] && (
                  <div className={`podium-card gold ${topThree[0].phone === currentPlayerPhone ? 'current-player-glow' : ''}`}>
                    <div className="crown-badge">👑</div>
                    <div className="podium-rank font-goofy">1</div>
                    <div className="podium-avatar gold">
                      <span>🥇</span>
                    </div>
                    <h3 className="podium-name">{topThree[0].name}</h3>
                    <div className="podium-score">
                      <Coins size={16} className="coin-glow" />
                      <span>{topThree[0].highscore.toLocaleString()}</span>
                    </div>
                  </div>
                )}

                {/* 🥉 Third Place (Bronze) */}
                {topThree[2] && (
                  <div className={`podium-card bronze ${topThree[2].phone === currentPlayerPhone ? 'current-player-glow' : ''}`}>
                    <div className="podium-rank font-goofy">3</div>
                    <div className="podium-avatar bronze">
                      <span>🥉</span>
                    </div>
                    <h3 className="podium-name">{topThree[2].name}</h3>
                    <div className="podium-score">
                      <Coins size={14} className="coin-glow" />
                      <span>{topThree[2].highscore.toLocaleString()}</span>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* 👤 Current Player Standing Card - Rendered directly below the podium stand */}
            {currentPlayerRecord ? (
              <div className="player-highlight-card">
                <div className="highlight-tag font-goofy">YOUR RANK</div>
                <div className="highlight-card-content">
                  <div className="highlight-rank-box">
                    <span className="highlight-rank-label">RANK</span>
                    <span className="highlight-rank-value font-goofy">#{currentPlayerRecord.rank}</span>
                  </div>
                  <div className="highlight-info-box">
                    <span className="highlight-name-label">PLAYER NAME</span>
                    <span className="highlight-name-value">{currentPlayerRecord.name}</span>
                  </div>
                  <div className="highlight-score-box">
                    <span className="highlight-score-label">HIGH SCORE</span>
                    <div className="highlight-score-value">
                      <Coins size={16} className="coin-glow" />
                      <span>{currentPlayerRecord.highscore.toLocaleString()} Coins</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="player-highlight-card unregistered">
                <div className="highlight-tag font-goofy">YOUR RANK</div>
                <p className="unregistered-text">Register & play a game to see your name, rank, and highscore here!</p>
              </div>
            )}

            {/* 📋 Scrollable Leaderboard List (All Players) */}
            <div className="roster-section">
              <h2 className="section-label">LEADERBOARD</h2>
              
              <div className="roster-list">
                {players.map((player) => (
                  <div 
                    key={player.phone} 
                    className={`roster-row ${player.phone === currentPlayerPhone ? 'roster-row-self' : ''}`}
                  >
                    <div className="roster-rank font-goofy">
                      {player.rank === 1 ? '🥇' : player.rank === 2 ? '🥈' : player.rank === 3 ? '🥉' : `#${player.rank}`}
                    </div>
                    
                    <div className="roster-player-info">
                      <div className="roster-avatar-circle">
                        {player.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="roster-name">{player.name}</span>
                      {player.phone === currentPlayerPhone && (
                        <span className="self-tag font-goofy">YOU</span>
                      )}
                    </div>

                    <div className="roster-score-box">
                      <Coins size={14} className="coin-glow" />
                      <span>{player.highscore.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Floating Sticky HUD showing local player's current rank */}
      

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Luckiest+Guy&family=Inter:wght@400;500;600;700;800&display=swap');
        
        .leaderboard-overlay {
          position: fixed;
          inset: 0;
          background: #03010a;
          color: #fff;
          font-family: 'Inter', sans-serif;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          z-index: 1000;
          padding: 24px 16px 80px 16px;
          box-sizing: border-box;
        }

        .bg-glow {
          position: fixed;
          width: 400px;
          height: 400px;
          border-radius: 50%;
          filter: blur(120px);
          opacity: 0.15;
          pointer-events: none;
          z-index: 0;
        }
        .bg-glow.purple {
          top: -100px;
          left: -100px;
          background: #9b30ff;
        }
        .bg-glow.orange {
          bottom: -100px;
          right: -100px;
          background: #ff6b00;
        }

        .leaderboard-wrapper {
          position: relative;
          z-index: 1;
          width: 100%;
          maxWidth: 600px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        /* Header block */
        .leaderboard-header {
          display: flex;
          flex-direction: column;
          gap: 20px;
          align-items: center;
          text-align: center;
          margin-top: 10px;
        }

        .back-btn {
          align-self: flex-start;
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(155, 48, 255, 0.08);
          border: 1.5px solid rgba(155, 48, 255, 0.3);
          color: #b366ff;
          padding: 8px 14px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          outline: none;
        }
        .back-btn:hover {
          background: rgba(155, 48, 255, 0.16);
          border-color: #9b30ff;
          transform: translateX(-2px);
          box-shadow: 0 0 15px rgba(155, 48, 255, 0.2);
        }

        .header-title-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        .header-trophy {
          color: #ffb700;
          filter: drop-shadow(0 0 10px rgba(255, 183, 0, 0.5));
          margin-bottom: 4px;
          animation: float-y 3s ease-in-out infinite;
        }
        .header-title {
          font-size: 32px;
          color: #fff;
          margin: 0;
          letter-spacing: 0.05em;
          text-shadow: 0 0 15px rgba(255, 255, 255, 0.15);
        }
        .header-subtitle {
          font-size: 13px;
          color: rgba(255,255,255,0.4);
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          font-weight: 700;
        }

        /* Podium Layout */
        .podium-section {
          display: flex;
          align-items: flex-end;
          justify-content: center;
          gap: 12px;
          margin-top: 10px;
          width: 100%;
        }

        .podium-card {
          flex: 1;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 20px;
          padding: 16px 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          position: relative;
          box-sizing: border-box;
          min-width: 0;
        }

        .podium-card.silver {
          min-height: 165px;
          border-color: rgba(192, 192, 192, 0.2);
        }
        .podium-card.gold {
          min-height: 195px;
          border-color: rgba(255, 215, 0, 0.3);
          background: linear-gradient(180deg, rgba(255, 215, 0, 0.04) 0%, rgba(255,255,255,0.01) 100%);
          box-shadow: 0 10px 30px rgba(255, 215, 0, 0.05);
        }
        .podium-card.bronze {
          min-height: 155px;
          border-color: rgba(205, 127, 50, 0.2);
        }

        .crown-badge {
          position: absolute;
          top: -22px;
          font-size: 24px;
          animation: bounce-y 2s infinite;
        }

        .podium-rank {
          font-size: 16px;
          color: rgba(255,255,255,0.25);
          margin-bottom: 4px;
        }
        .gold .podium-rank { color: #ffd700; }
        .silver .podium-rank { color: #c0c0c0; }
        .bronze .podium-rank { color: #cd7f32; }

        .podium-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          margin-bottom: 10px;
        }
        .podium-avatar.gold { background: rgba(255, 215, 0, 0.15); border: 1px solid #ffd700; }
        .podium-avatar.silver { background: rgba(192, 192, 192, 0.15); border: 1px solid #c0c0c0; }
        .podium-avatar.bronze { background: rgba(205, 127, 50, 0.15); border: 1px solid #cd7f32; }

        .podium-name {
          font-size: 13px;
          font-weight: 800;
          color: #ffffff;
          margin: 0 0 6px 0;
          width: 100%;
          word-break: break-word;
          text-align: center;
          line-height: 1.25;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
        }
        .gold .podium-name {
          font-size: 15px;
          color: #ffe680;
          text-shadow: 0 0 8px rgba(255, 215, 0, 0.4);
        }
        .silver .podium-name {
          color: #e6e6e6;
        }
        .bronze .podium-name {
          color: #ffd2a6;
        }

        /* Highlights/Standing Card below stand */
        .player-highlight-card {
          background: linear-gradient(135deg, rgba(155, 48, 255, 0.12) 0%, rgba(255, 107, 0, 0.05) 100%);
          border: 2px dashed #9b30ff;
          border-radius: 20px;
          padding: 16px 20px;
          position: relative;
          box-sizing: border-box;
          margin-top: 10px;
          margin-bottom: 5px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          box-shadow: 0 0 20px rgba(155, 48, 255, 0.15);
        }
        .player-highlight-card.unregistered {
          border-color: rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.01);
          padding: 24px 14px;
          border-style: solid;
        }
        .unregistered-text {
          font-size: 13px;
          color: rgba(255,255,255,0.4);
          margin: 0;
          text-align: center;
          font-weight: 500;
        }
        .highlight-tag {
          position: absolute;
          top: -10px;
          left: 20px;
          background: #9b30ff;
          color: #fff;
          font-size: 9px;
          padding: 2px 8px;
          border-radius: 6px;
          letter-spacing: 0.1em;
          box-shadow: 0 4px 10px rgba(155, 48, 255, 0.3);
        }
        .highlight-card-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          width: 100%;
        }
        .highlight-rank-box, .highlight-info-box, .highlight-score-box {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .highlight-rank-box {
          flex: 0 0 60px;
        }
        .highlight-info-box {
          flex: 1;
          min-width: 0;
        }
        .highlight-score-box {
          align-items: flex-end;
        }
        .highlight-rank-label, .highlight-name-label, .highlight-score-label {
          font-size: 8px;
          color: rgba(255,255,255,0.4);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-weight: 700;
        }
        .highlight-rank-value {
          font-size: 20px;
          color: #b366ff;
        }
        .highlight-name-value {
          font-size: 16px;
          font-weight: 800;
          color: #fff;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .highlight-score-value {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 18px;
          font-weight: 800;
          color: #ff6b00;
        }

        .podium-score {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #ffd700;
          font-weight: 800;
          font-size: 12px;
        }
        .silver .podium-score { color: #fff; }
        .bronze .podium-score { color: #cd7f32; }

        /* Highlight own podium/row */
        .current-player-glow {
          border-color: #9b30ff !important;
          background: rgba(155, 48, 255, 0.05) !important;
          box-shadow: 0 0 20px rgba(155, 48, 255, 0.2) !important;
        }

        /* Roster list */
        .roster-section {
          background: rgba(255,255,255,0.01);
          border: 1px solid rgba(255,255,255,0.03);
          border-radius: 24px;
          padding: 20px 16px;
          box-sizing: border-box;
        }

        .section-label {
          font-size: 10px;
          color: rgba(255,255,255,0.3);
          letter-spacing: 0.15em;
          margin: 0 0 16px 4px;
          font-weight: bold;
        }

        .roster-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .roster-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.04);
          border-radius: 16px;
          padding: 12px 16px;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }
        .roster-row:hover {
          border-color: rgba(155, 48, 255, 0.2);
          transform: translateY(-1px);
        }

        .roster-row-self {
          border-color: rgba(155, 48, 255, 0.5) !important;
          background: rgba(155, 48, 255, 0.04) !important;
        }

        .roster-rank {
          font-size: 15px;
          color: rgba(255,255,255,0.3);
          width: 36px;
        }
        .roster-row-self .roster-rank {
          color: #b366ff;
        }

        .roster-player-info {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .roster-avatar-circle {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 800;
          color: #b366ff;
        }
        .roster-row-self .roster-avatar-circle {
          background: rgba(155, 48, 255, 0.15);
          border-color: #9b30ff;
          color: #fff;
        }

        .roster-name {
          font-size: 14px;
          font-weight: 600;
          color: #fff;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .self-tag {
          background: rgba(155, 48, 255, 0.2);
          color: #b366ff;
          border: 1px solid rgba(155, 48, 255, 0.3);
          font-size: 9px;
          padding: 2px 6px;
          border-radius: 6px;
          letter-spacing: 0.05em;
          flex-shrink: 0;
        }

        .roster-score-box {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 800;
          font-size: 14px;
          color: #ff6b00;
        }
        .roster-row-self .roster-score-box {
          color: #b366ff;
          text-shadow: 0 0 10px rgba(155, 48, 255, 0.2);
        }

        .coin-glow {
          filter: drop-shadow(0 0 4px currentColor);
        }

        /* Sticky bottom standings */
        .player-sticky-rank {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(180deg, transparent 0%, rgba(3, 1, 10, 0.95) 30%);
          padding: 24px 16px 20px 16px;
          display: flex;
          justify-content: center;
          pointer-events: none;
          z-index: 100;
        }

        .sticky-wrap {
          background: rgba(155, 48, 255, 0.15);
          border: 1.5px solid #9b30ff;
          color: #fff;
          padding: 10px 20px;
          border-radius: 30px;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 0 30px rgba(155, 48, 255, 0.3);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          pointer-events: auto;
          letter-spacing: 0.02em;
        }

        .sparkle-glow {
          color: #ffd700;
          animation: float-y 2s ease-in-out infinite;
        }

        /* Loader & Empty states */
        .loader-container, .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 60px 20px;
          background: rgba(255,255,255,0.01);
          border: 1px solid rgba(255,255,255,0.03);
          border-radius: 24px;
        }

        .cyber-spinner {
          width: 44px;
          height: 44px;
          border: 3px solid rgba(155, 48, 255, 0.1);
          border-top-color: #9b30ff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 20px;
        }
        .loader-text {
          font-size: 11px;
          letter-spacing: 0.15em;
          color: rgba(255,255,255,0.4);
          font-weight: 700;
        }

        .empty-icon {
          color: rgba(255,255,255,0.2);
          margin-bottom: 16px;
        }
        .empty-title {
          font-size: 16px;
          font-weight: 700;
          margin: 0 0 6px 0;
          color: #fff;
        }
        .empty-subtitle {
          font-size: 12px;
          color: rgba(255,255,255,0.4);
          margin: 0 0 24px 0;
        }
        
        .cta-start-btn {
          background: #ff6b00;
          color: #white;
          border: none;
          border-bottom: 3px solid #cc5500;
          padding: 10px 24px;
          border-radius: 12px;
          font-size: 14px;
          cursor: pointer;
          box-shadow: 0 5px 15px rgba(255, 107, 0, 0.3);
          transition: all 0.2s;
        }
        .cta-start-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 0 20px rgba(255, 107, 0, 0.5);
        }

        /* Animations */
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes float-y {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes bounce-y {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
        .font-goofy {
          font-family: 'Luckiest Guy', cursive;
        }
      `}</style>
    </div>
  );
};

export default Leaderboard;
