import React, { useEffect, useRef } from 'react';

const FULL_DASH = 314.16;

const STATUS_LABELS = [
  'Initializing...',
  'Loading Assets...',
  'Almost There...',
  'Preparing Arena...',
  'Ready to Play!',
];

const Loader = ({ progress = 0 }) => {
  const ringRef = useRef(null);
  const barRef = useRef(null);
  const knobRef = useRef(null);
  const pctRef = useRef(null);
  const statusRef = useRef(null);

  useEffect(() => {
    const v = Math.min(100, Math.max(0, progress));

    if (ringRef.current) {
      ringRef.current.style.strokeDashoffset = (FULL_DASH - (FULL_DASH * v) / 100).toFixed(1);
    }
    if (barRef.current) {
      barRef.current.style.width = v + '%';
    }
    if (knobRef.current) {
      knobRef.current.style.display = v > 3 ? 'block' : 'none';
    }
    if (pctRef.current) {
      pctRef.current.textContent = Math.round(v) + '%';
    }
    if (statusRef.current) {
      statusRef.current.textContent = STATUS_LABELS[Math.min(4, Math.floor(v / 20))];
    }
  }, [progress]);

  return (
    <div style={styles.root}>
      {/* Perspective grid */}
      <div style={styles.gridBg} />

      {/* Scanlines */}
      <div style={styles.scanlines} />

      {/* Orbs */}
      <div style={styles.orbOrange} />
      <div style={styles.orbPurple} />

      {/* Floor glow line */}
      <div style={styles.floorLine} />

      {/* Content */}
      <div style={styles.content}>

        {/* Logo + ring */}
        <div style={styles.spinnerWrap}>
          <svg width="110" height="110" style={styles.svg}>
            <circle cx="55" cy="55" r="50" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5" />
            <circle
              ref={ringRef}
              cx="55" cy="55" r="50"
              fill="none"
              stroke="#ff6b00"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={FULL_DASH}
              strokeDashoffset={FULL_DASH}
              style={{
                transform: 'rotate(-90deg)',
                transformOrigin: '55px 55px',
                transition: 'stroke-dashoffset 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                filter: 'drop-shadow(0 0 8px rgba(255,107,0,0.9))',
              }}
            />
          </svg>

          {/* Purple spinning ring */}
          <div style={styles.spinRing} />

          {/* Logo circle */}
          <div style={styles.logoCircle}>
            <img
              src="/images/mygtrans.png"
              alt="myG"
              style={styles.logoImg}
              onError={(e) => {
                e.target.style.display = 'none';
                const fallback = e.target.parentElement.querySelector('.logo-fallback');
                if (fallback) fallback.style.display = 'flex';
              }}
            />
            <div
              className="logo-fallback"
              style={styles.logoFallback}
            >
              myG
            </div>
          </div>
        </div>

        {/* PLAY & WIN title */}
        <div style={styles.titleWrap}>
          <span style={styles.titleOrange}>PLAY</span>
          <span style={styles.titleAmp}>&amp;</span>
          <span style={{ ...styles.titleOrange, animationDelay: '0.3s' }}>WIN</span>
        </div>

        {/* Divider */}
        <div style={styles.divider} />

        {/* Loading bar */}
        <div style={styles.progressSection}>
          <div style={styles.barTrack}>
            <div ref={barRef} style={styles.barFill}>
              <div ref={knobRef} style={{ ...styles.barKnob, display: 'none' }} />
            </div>
          </div>
          <div style={styles.barMeta}>
            <span ref={statusRef} style={styles.statusText}>
              {STATUS_LABELS[0]}
            </span>
            <span ref={pctRef} style={styles.pctLabel}>0%</span>
          </div>
        </div>

        {/* Crafted By GameFaktory Branding */}
        <a
          href="https://www.gamefaktory.com"
          target="_blank"
          rel="noopener noreferrer"
          style={styles.craftedWrap}
          className="crafted-brand-interactive"
        >
          <span style={styles.craftedText}>CRAFTED BY</span>
          <img src="/images/gflogo.webp" alt="GameFaktory" style={styles.craftedLogo} />
        </a>

      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Luckiest+Guy&display=swap');

        .crafted-brand-interactive {
          transition: transform 0.2s ease, opacity 0.2s ease;
        }
        .crafted-brand-interactive:hover {
          transform: scale(1.05);
          opacity: 1;
        }
        .crafted-brand-interactive:active {
          transform: scale(0.97);
        }

        @keyframes myg-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes myg-pulse-orb {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.1); }
        }
        @keyframes myg-logo-float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-6px); }
        }
        @keyframes myg-scanlines {
          0%   { background-position: 0 0; }
          100% { background-position: 0 4px; }
        }
        @keyframes myg-title-glow {
          0%, 100% {
            text-shadow:
              0 0 20px rgba(255,107,0,0.5),
              0 0 50px rgba(255,107,0,0.2),
              -2px -2px 0 #7a3000,
               2px -2px 0 #7a3000,
              -2px  2px 0 #7a3000,
               2px  2px 0 #7a3000;
          }
          50% {
            text-shadow:
              0 0 35px rgba(255,107,0,0.9),
              0 0 80px rgba(255,107,0,0.4),
              -2px -2px 0 #7a3000,
               2px -2px 0 #7a3000,
              -2px  2px 0 #7a3000,
               2px  2px 0 #7a3000;
          }
        }
        @keyframes myg-amp-glow {
          0%, 100% { text-shadow: 0 0 15px #bf80ff, 0 0 40px rgba(155,48,255,0.5); }
          50%       { text-shadow: 0 0 30px #bf80ff, 0 0 70px rgba(155,48,255,0.8); }
        }
        @keyframes myg-bar-glow {
          0%, 100% { box-shadow: 0 0 10px 2px rgba(255,107,0,0.6); }
          50%       { box-shadow: 0 0 22px 5px rgba(255,107,0,0.9); }
        }
      `}</style>
    </div>
  );
};

const styles = {
  root: {
    position: 'fixed',
    inset: 0,
    zIndex: 100,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#03010a',
    overflow: 'hidden',
    userSelect: 'none',
    fontFamily: "'Luckiest Guy', system-ui, sans-serif",
  },
  gridBg: {
    position: 'absolute',
    inset: 0,
    opacity: 0.15,
    backgroundImage:
      'linear-gradient(rgba(255,107,0,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,107,0,0.3) 1px, transparent 1px)',
    backgroundSize: '28px 28px',
    transform: 'perspective(600px) rotateX(58deg) translateY(-18%) scaleX(1.4)',
    transformOrigin: 'center bottom',
    pointerEvents: 'none',
  },
  scanlines: {
    position: 'absolute',
    inset: 0,
    backgroundImage:
      'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)',
    animation: 'myg-scanlines 0.3s steps(1) infinite',
    opacity: 0.35,
    pointerEvents: 'none',
  },
  orbOrange: {
    position: 'absolute',
    top: -80,
    left: -80,
    width: 320,
    height: 320,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(255,107,0,0.2) 0%, transparent 70%)',
    animation: 'myg-pulse-orb 4s ease-in-out infinite 2s',
    pointerEvents: 'none',
  },
  orbPurple: {
    position: 'absolute',
    bottom: -100,
    right: -80,
    width: 360,
    height: 360,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(155,48,255,0.25) 0%, transparent 70%)',
    animation: 'myg-pulse-orb 4s ease-in-out infinite',
    pointerEvents: 'none',
  },
  floorLine: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    background: 'linear-gradient(90deg, transparent 0%, #9b30ff 30%, #ff6b00 50%, #9b30ff 70%, transparent 100%)',
    opacity: 0.6,
  },
  content: {
    position: 'relative',
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 24,
    width: '100%',
    maxWidth: 360,
    padding: '40px 28px',
  },
  spinnerWrap: {
    position: 'relative',
    width: 110,
    height: 110,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
    inset: 0,
    overflow: 'visible',
  },
  spinRing: {
    position: 'absolute',
    inset: 8,
    borderRadius: '50%',
    border: '2px solid transparent',
    borderTopColor: '#9b30ff',
    borderLeftColor: 'rgba(155,48,255,0.4)',
    animation: 'myg-spin 1.8s linear infinite',
    opacity: 0.8,
  },

  logoImg: {
    width: '120px',
    height: '120px',
    objectFit: 'contain',
    filter: 'drop-shadow(0 0 8px rgba(255,107,0,0.9))',
  },
  logoFallback: {
    display: 'none',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    fontSize: 18,
    color: '#ff6b00',
    letterSpacing: -1,
    textShadow: '0 0 12px rgba(255,107,0,0.9)',
  },
  titleWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 0,
    textAlign: 'center',
    lineHeight: 0.95,
  },
  titleOrange: {
    fontSize: 58,
    color: '#ff6b00',
    letterSpacing: 2,
    WebkitTextStroke: '1.5px #7a3000',
    animation: 'myg-title-glow 2.5s ease-in-out infinite',
  },
  titleAmp: {
    fontSize: 44,
    color: '#bf80ff',
    letterSpacing: 1,
    animation: 'myg-amp-glow 2.5s ease-in-out infinite',
  },
  divider: {
    height: 2,
    width: 120,
    background: 'linear-gradient(90deg, transparent, #9b30ff 40%, #ff6b00 60%, transparent)',
    borderRadius: 1,
  },
  progressSection: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  barTrack: {
    position: 'relative',
    height: 6,
    background: 'rgba(255,255,255,0.09)',
    borderRadius: 99,
    overflow: 'visible',
  },
  barFill: {
    height: '100%',
    width: '0%',
    borderRadius: 99,
    background: 'linear-gradient(90deg, #cc4a00, #ff6b00, #ffaa55)',
    transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    animation: 'myg-bar-glow 2s ease-in-out infinite',
    position: 'relative',
  },
  barKnob: {
    position: 'absolute',
    right: -7,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 16,
    height: 16,
    borderRadius: '50%',
    background: '#fff',
    border: '2.5px solid #ff6b00',
    boxShadow: '0 0 12px rgba(255,107,0,0.9)',
  },
  barMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: '0.3em',
    textTransform: 'uppercase',
    fontFamily: 'monospace',
  },
  pctLabel: {
    fontSize: 14,
    color: '#ff6b00',
    fontFamily: 'monospace',
    fontWeight: 700,
    textShadow: '0 0 10px rgba(255,107,0,0.6)',
  },
  craftedWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    marginTop: 24,
    textDecoration: 'none',
    cursor: 'pointer',
  },
  craftedText: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.35)',
    letterSpacing: '0.25em',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  craftedLogo: {
    height: 24,
    width: 'auto',
    objectFit: 'contain',
    filter: 'invert(1) drop-shadow(0 0 8px rgba(255, 255, 255, 0.4))',
  },
};

export default Loader;