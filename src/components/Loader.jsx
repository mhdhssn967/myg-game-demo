import React, { useEffect, useRef } from 'react';

const FULL_DASH = 364.4;

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
  const dotsRef = useRef([]);

  useEffect(() => {
    const v = Math.min(100, Math.max(0, progress));

    if (ringRef.current) {
      ringRef.current.style.strokeDashoffset = (FULL_DASH - (FULL_DASH * v) / 100).toFixed(1);
    }
    if (barRef.current) {
      barRef.current.style.width = v + '%';
    }
    if (knobRef.current) {
      knobRef.current.style.display = v > 2 ? 'block' : 'none';
    }
    if (pctRef.current) {
      pctRef.current.textContent = Math.round(v) + '%';
    }

    const lit = Math.min(4, Math.floor(v / 20));
    dotsRef.current.forEach((d, i) => {
      if (!d) return;
      if (i < lit) {
        d.style.background = '#ff6b00';
        d.style.boxShadow = '0 0 8px rgba(255,107,0,0.8)';
      } else if (i === lit && v > 0) {
        d.style.background = 'rgba(255,107,0,0.4)';
        d.style.boxShadow = 'none';
      } else {
        d.style.background = 'rgba(255,255,255,0.12)';
        d.style.boxShadow = 'none';
      }
    });

    if (statusRef.current) {
      statusRef.current.textContent = STATUS_LABELS[lit];
    }
  }, [progress]);

  return (
    <div style={styles.root}>
      {/* Glow orbs */}
      <div style={{ ...styles.orb, top: -100, left: -100, background: 'radial-gradient(circle, rgba(255,107,0,0.2) 0%, transparent 70%)' }} />
      <div style={{ ...styles.orb, bottom: -100, right: -100, background: 'radial-gradient(circle, rgba(155,48,255,0.2) 0%, transparent 70%)' }} />

      {/* Animated perspective grid */}
      <div style={styles.gridBg} />

      {/* Scanline overlay */}
      <div style={styles.scanlines} />

      {/* Content */}
      <div style={styles.content}>

        {/* Ring + logo */}
        <div style={styles.spinnerWrap}>
          <svg width="136" height="136" style={styles.svg}>
            {/* Tick marks */}
            {Array.from({ length: 24 }).map((_, i) => {
              const angle = (i / 24) * 360 - 90;
              const rad = (angle * Math.PI) / 180;
              const r1 = 62, r2 = i % 6 === 0 ? 55 : 58;
              return (
                <line
                  key={i}
                  x1={68 + r1 * Math.cos(rad)}
                  y1={68 + r1 * Math.sin(rad)}
                  x2={68 + r2 * Math.cos(rad)}
                  y2={68 + r2 * Math.sin(rad)}
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth={i % 6 === 0 ? 2 : 1}
                />
              );
            })}
            {/* Track */}
            <circle cx="68" cy="68" r="58" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
            {/* Progress arc */}
            <circle
              ref={ringRef}
              cx="68" cy="68" r="58"
              fill="none"
              stroke="#ff6b00"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={FULL_DASH}
              strokeDashoffset={FULL_DASH}
              style={{
                transform: 'rotate(-90deg)',
                transformOrigin: '68px 68px',
                transition: 'stroke-dashoffset 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                filter: 'drop-shadow(0 0 8px rgba(255,107,0,0.9))',
              }}
            />
          </svg>

          {/* Spinning purple ring */}
          <div style={styles.spinRing} />

          {/* Logo center */}
          <div style={styles.logoCircle}>
            <img
              src="/images/mygtrans.png"
              alt="myG"
              style={styles.logoImg}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentElement.querySelector('.logo-fallback').style.display = 'flex';
              }}
            />
            <div
              className="logo-fallback"
              style={{
                display: 'none',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '100%',
                fontSize: 20,
                fontFamily: "'Luckiest Guy', system-ui",
                color: '#ff6b00',
                letterSpacing: -1,
              }}
            >
              myG
            </div>
          </div>
        </div>

        {/* Slogan */}
        <div style={styles.sloganWrap}>
          <span style={styles.sloganOrange}>PLAY GAME</span>
          <span style={styles.sloganWhite}>EARN REWARDS</span>
          <div style={styles.divider} />
        </div>

        {/* Progress UI */}
        <div style={styles.progressSection}>
          {/* Status label */}
          <span ref={statusRef} style={styles.statusText}>
            {STATUS_LABELS[0]}
          </span>

          {/* Bar row */}
          <div style={styles.barRow}>
            <div style={styles.barTrack}>
              <div ref={barRef} style={styles.barFill}>
                <div ref={knobRef} style={{ ...styles.barKnob, display: 'none' }} />
              </div>
              {/* Tick labels */}
              <div style={styles.tickRow}>
                {['0', '25', '50', '75', '100'].map((t) => (
                  <span key={t} style={styles.tickLabel}>{t}</span>
                ))}
              </div>
            </div>
            <span ref={pctRef} style={styles.pctLabel}>0%</span>
          </div>

          {/* Segment dots */}
          <div style={styles.dotsRow}>
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                ref={(el) => (dotsRef.current[i] = el)}
                style={styles.dot}
              />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Luckiest+Guy&display=swap');

        @keyframes myg-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes myg-pulse-orb {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.08); }
        }
        @keyframes myg-logo-float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-6px); }
        }
        @keyframes myg-scanlines {
          0%   { background-position: 0 0; }
          100% { background-position: 0 4px; }
        }
        @keyframes myg-status-blink {
          0%, 80%, 100% { opacity: 0.4; }
          40%           { opacity: 1; }
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
  orb: {
    position: 'absolute',
    width: 380,
    height: 380,
    borderRadius: '50%',
    animation: 'myg-pulse-orb 4s ease-in-out infinite',
    pointerEvents: 'none',
  },
  gridBg: {
    position: 'absolute',
    inset: 0,
    opacity: 0.13,
    backgroundImage:
      'linear-gradient(rgba(255,107,0,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(255,107,0,0.25) 1px, transparent 1px)',
    backgroundSize: '28px 28px',
    transform: 'perspective(600px) rotateX(58deg) translateY(-18%) scaleX(1.4)',
    transformOrigin: 'center bottom',
    pointerEvents: 'none',
  },
  scanlines: {
    position: 'absolute',
    inset: 0,
    backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.18) 2px, rgba(0,0,0,0.18) 4px)',
    animation: 'myg-scanlines 0.3s steps(1) infinite',
    pointerEvents: 'none',
    opacity: 0.4,
  },
  content: {
    position: 'relative',
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 30,
    width: '100%',
    maxWidth: 340,
    padding: '40px 28px',
  },
  spinnerWrap: {
    position: 'relative',
    width: 136,
    height: 136,
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
    inset: 10,
    borderRadius: '50%',
    border: '2px solid transparent',
    borderTopColor: '#9b30ff',
    borderLeftColor: 'rgba(155,48,255,0.4)',
    animation: 'myg-spin 1.5s linear infinite',
    opacity: 0.8,
  },
  logoCircle: {
    position: 'absolute',
    width: 68,
    height: 68,
    borderRadius: '50%',
    background: 'rgba(255,107,0,0.1)',
    border: '2px solid rgba(255,107,0,0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    animation: 'myg-logo-float 2.4s ease-in-out infinite',
    boxShadow: '0 0 20px rgba(255,107,0,0.3), inset 0 0 20px rgba(255,107,0,0.05)',
  },
  logoImg: {
    width: '80%',
    height: '80%',
    objectFit: 'contain',
    filter: 'drop-shadow(0 0 8px rgba(255,107,0,0.9))',
  },
  sloganWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    textAlign: 'center',
  },
  sloganOrange: {
    fontSize: 42,
    color: '#ff6b00',
    lineHeight: 1,
    letterSpacing: 2,
    textShadow: '0 0 30px rgba(255,107,0,0.6), 0 0 60px rgba(255,107,0,0.2)',
  },
  sloganWhite: {
    fontSize: 30,
    color: '#ffffff',
    lineHeight: 1,
    letterSpacing: 3,
    textShadow: '0 0 20px rgba(255,255,255,0.15)',
  },
  divider: {
    marginTop: 12,
    height: 2,
    width: 90,
    background: 'linear-gradient(90deg, transparent, #9b30ff 40%, #ff6b00 60%, transparent)',
    borderRadius: 1,
  },
  progressSection: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  statusText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: '0.35em',
    textTransform: 'uppercase',
    fontFamily: 'monospace',
    animation: 'myg-status-blink 2s ease-in-out infinite',
  },
  barRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  barTrack: {
    flex: 1,
    position: 'relative',
    height: 5,
    background: 'rgba(255,255,255,0.08)',
    borderRadius: 99,
  },
  barFill: {
    height: '100%',
    width: '0%',
    borderRadius: 99,
    background: 'linear-gradient(90deg, #cc4a00, #ff6b00, #ffaa55)',
    position: 'relative',
    transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 0 12px rgba(255,107,0,0.7)',
  },
  barKnob: {
    position: 'absolute',
    right: -6,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 14,
    height: 14,
    borderRadius: '50%',
    background: '#fff',
    border: '2.5px solid #ff6b00',
    boxShadow: '0 0 10px rgba(255,107,0,0.9)',
  },
  tickRow: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'space-between',
  },
  tickLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.18)',
    fontFamily: 'monospace',
  },
  pctLabel: {
    fontSize: 15,
    color: '#ff6b00',
    fontFamily: 'monospace',
    minWidth: 44,
    textAlign: 'right',
    fontWeight: 700,
    textShadow: '0 0 10px rgba(255,107,0,0.6)',
  },
  dotsRow: {
    display: 'flex',
    gap: 7,
    marginTop: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.12)',
    transition: 'background 0.3s ease, box-shadow 0.3s ease',
  },
};

export default Loader;