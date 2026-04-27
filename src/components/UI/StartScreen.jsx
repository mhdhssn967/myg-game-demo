import React from 'react';
import waveSprite from '../../assets/wave.png';

const StartScreen = ({ onStart }) => {
  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        {/* Top Glow Line */}
        <div style={styles.topGlow}></div>
        
        {/* Title Section */}
        <div style={styles.header}>
          <h1 style={styles.title}>MYG RUNNER</h1>
          <div style={styles.subtitleRow}>
             <div style={styles.subLine}></div>
             <span style={styles.subtitle}>THE DIGITAL HUB</span>
             <div style={styles.subLine}></div>
          </div>
        </div>
        
        {/* Waving Character Animation */}
        <div style={styles.characterSection}>
          <div style={styles.characterSprite}></div>
          <div style={styles.characterPlatform}></div>
        </div>
        
        {/* Controls Panel */}
        <div style={styles.controlsPanel}>
          <span style={styles.panelLabel}>GAME CONTROLS</span>
          
          <div style={styles.controlsList}>
            {/* Control 1 */}
            <div style={styles.controlItem}>
              <div style={styles.iconBoxOrange}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 13l5 5 5-5M7 6l5 5 5-5"/>
                </svg>
              </div>
              <div style={styles.controlText}>
                <span style={styles.controlSub}>TAP</span>
                <span style={styles.controlMain}>TO JUMP</span>
              </div>
            </div>
            
            {/* Control 2 */}
            <div style={styles.controlItem}>
              <div style={styles.iconBoxPurple}>
                <div style={{ position: 'relative' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 13l5 5 5-5M7 6l5 5 5-5"/>
                  </svg>
                </div>
              </div>
              <div style={styles.controlText}>
                <span style={styles.controlSub}>DOUBLE TAP</span>
                <span style={styles.controlMain}>TO JUMP HIGHER</span>
              </div>
            </div>
          </div>
        </div>

        {/* Start Button */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onStart();
          }}
          style={styles.startButton}
          className="start-button-interactive"
        >
          <span style={styles.buttonText}>CLICK HERE TO START</span>
          <svg style={styles.buttonIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>

        {/* Footer info */}
        <div style={styles.footer}>
           BEST EXPERIENCED IN LANDSCAPE
        </div>
      </div>

      <style>{`
        .start-button-interactive {
          transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.2s ease;
        }
        .start-button-interactive:hover {
          transform: scale(1.05);
          box-shadow: 0 0 30px rgba(255, 107, 0, 0.6);
        }
        .start-button-interactive:active {
          transform: scale(0.95);
        }
        @keyframes start-bounce-x {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(5px); }
        }
        @keyframes start-fade-in {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes wave-sprite {
          0% { background-position: 0% 0%; }
          5% { background-position: 25% 0%; }
          10% { background-position: 50% 0%; }
          15% { background-position: 75% 0%; }
          20% { background-position: 100% 0%; }
          25% { background-position: 0% 33.3%; }
          30% { background-position: 25% 33.3%; }
          35% { background-position: 50% 33.3%; }
          40% { background-position: 75% 33.3%; }
          45% { background-position: 100% 33.3%; }
          50% { background-position: 0% 66.6%; }
          55% { background-position: 25% 66.6%; }
          60% { background-position: 50% 66.6%; }
          65% { background-position: 75% 66.6%; }
          70% { background-position: 100% 66.6%; }
          75% { background-position: 0% 100%; }
          80% { background-position: 25% 100%; }
          85% { background-position: 50% 100%; }
          90% { background-position: 75% 100%; }
          95% { background-position: 100% 100%; }
        }
      `}</style>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000, // Very high to be sure
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    padding: '20px',
    fontFamily: "'Luckiest Guy', system-ui, sans-serif",
    userSelect: 'none',
    boxSizing: 'border-box',
  },
  container: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '24px',
    width: '100%',
    maxWidth: '400px',
    padding: '40px 30px',
    background: '#03010a',
    border: '2px solid #ff6b00',
    borderRadius: '32px',
    boxShadow: '0 0 100px rgba(255, 107, 0, 0.25)',
    animation: 'start-fade-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
    overflow: 'hidden',
    boxSizing: 'border-box',
  },
  characterSection: {
    position: 'relative',
    width: '120px',
    height: '120px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '-10px',
  },
  characterSprite: {
    width: '120px',
    height: '120px',
    backgroundImage: `url(${waveSprite})`,
    backgroundSize: '500% 400%',
    animation: 'wave-sprite 1.2s steps(1) infinite',
    filter: 'drop-shadow(0 0 10px rgba(255, 107, 0, 0.4))',
  },
  characterPlatform: {
    position: 'absolute',
    bottom: '10px',
    width: '60px',
    height: '6px',
    background: 'rgba(255, 107, 0, 0.2)',
    borderRadius: '50%',
    filter: 'blur(4px)',
  },
  topGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '3px',
    background: 'linear-gradient(90deg, transparent, #ff6b00, #9b30ff, transparent)',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  title: {
    fontSize: 'min(12vw, 48px)',
    color: '#ff6b00',
    lineHeight: 1,
    margin: 0,
    textShadow: '0 0 20px rgba(255, 107, 0, 0.5)',
    textAlign: 'center',
  },
  subtitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  subLine: {
    height: '2px',
    width: '20px',
    background: '#9b30ff',
    opacity: 0.5,
  },
  subtitle: {
    color: '#9b30ff',
    fontSize: '11px',
    letterSpacing: '0.3em',
    textTransform: 'uppercase',
  },
  controlsPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    width: '100%',
  },
  panelLabel: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: '9px',
    letterSpacing: '0.3em',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  controlsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  controlItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    background: 'rgba(255, 255, 255, 0.04)',
    padding: '12px 18px',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxSizing: 'border-box',
  },
  iconBoxOrange: {
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255, 107, 0, 0.12)',
    borderRadius: '10px',
    color: '#ff6b00',
    border: '1px solid rgba(255, 107, 0, 0.2)',
  },
  iconBoxPurple: {
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(155, 48, 255, 0.12)',
    borderRadius: '10px',
    color: '#9b30ff',
    border: '1px solid rgba(155, 48, 255, 0.2)',
  },
  controlText: {
    display: 'flex',
    flexDirection: 'column',
  },
  controlSub: {
    fontSize: '9px',
    color: 'rgba(255, 255, 255, 0.3)',
    fontFamily: 'system-ui, sans-serif',
    letterSpacing: '0.05em',
    fontWeight: 'bold',
  },
  controlMain: {
    color: 'white',
    fontSize: '16px',
    letterSpacing: '0.05em',
  },
  startButton: {
    width: '100%',
    marginTop: '8px',
    padding: '18px 24px',
    background: '#ff6b00',
    color: 'white',
    border: 'none',
    borderBottom: '4px solid #cc5500',
    borderRadius: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    boxShadow: '0 10px 25px rgba(255, 107, 0, 0.3)',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  buttonText: {
    fontSize: 'min(6vw, 22px)',
    letterSpacing: '0.05em',
  },
  buttonIcon: {
    width: '22px',
    height: '22px',
    animation: 'start-bounce-x 1s infinite',
  },
  footer: {
    color: 'rgba(255, 255, 255, 0.2)',
    fontSize: '8px',
    letterSpacing: '0.2em',
    fontFamily: 'system-ui, sans-serif',
    textTransform: 'uppercase',
  }
};

export default StartScreen;
