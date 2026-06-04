import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Game from './components/Game';
import Dashboard from './pages/Dashboard';
import Leaderboard from './pages/Leaderboard';
import { auth, loginAnonymously, db } from './firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';
import { Lock, ShieldAlert, AlertTriangle, Check, Copy, Terminal } from 'lucide-react';

function ExpiredScreen() {
  return (
    <div className="expired-container select-none">
      <div className="expired-backdrop-glow"></div>
      <div className="expired-backdrop-glow-secondary"></div>
      
      <div className="expired-card">
        {/* Glowing badge */}
        <div className="warning-badge">
          <Lock size={32} className="warning-icon" />
        </div>

        <h1 className="expired-title font-inter">Application Expired</h1>
        <p className="expired-desc font-inter">
          The active session for this application has expired. Please contact your system administrator to restore access and services.
        </p>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        .font-inter {
          font-family: 'Inter', sans-serif;
        }

        .expired-container {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100vh;
          background: radial-gradient(circle at 50% 50%, #0c0817 0%, #030107 100%);
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          z-index: 99999;
          padding: 20px;
        }

        .expired-backdrop-glow {
          position: absolute;
          width: 800px;
          height: 800px;
          background: radial-gradient(circle, rgba(255, 107, 0, 0.08) 0%, rgba(139, 92, 246, 0.03) 50%, transparent 100%);
          top: 30%;
          left: 30%;
          transform: translate(-50%, -50%);
          filter: blur(80px);
          pointer-events: none;
          z-index: 1;
        }

        .expired-backdrop-glow-secondary {
          position: absolute;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(139, 92, 246, 0.06) 0%, rgba(255, 107, 0, 0.02) 50%, transparent 100%);
          bottom: 20%;
          right: 20%;
          transform: translate(50%, 50%);
          filter: blur(60px);
          pointer-events: none;
          z-index: 1;
        }

        .expired-card {
          position: relative;
          z-index: 10;
          max-width: 440px;
          width: 100%;
          background: rgba(18, 12, 33, 0.45);
          backdrop-filter: blur(30px) saturate(180%);
          -webkit-backdrop-filter: blur(30px) saturate(180%);
          border: 1px solid rgba(255, 107, 0, 0.15);
          border-radius: 28px;
          padding: 48px;
          text-align: center;
          box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.06);
          animation: cardEntry 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes cardEntry {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .warning-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: rgba(255, 107, 0, 0.08);
          border: 2px solid rgba(255, 107, 0, 0.3);
          box-shadow: 0 0 25px rgba(255, 107, 0, 0.15);
          margin-bottom: 24px;
          position: relative;
          animation: warningPulse 3s infinite ease-in-out;
        }

        .warning-icon {
          color: #ff6b00;
          filter: drop-shadow(0 0 4px rgba(255, 107, 0, 0.5));
        }

        @keyframes warningPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 25px rgba(255, 107, 0, 0.15); }
          50% { transform: scale(1.06); box-shadow: 0 0 40px rgba(255, 107, 0, 0.35); border-color: rgba(255, 107, 0, 0.5); }
        }

        .expired-title {
          font-size: 26px;
          font-weight: 800;
          color: #ffffff;
          margin: 0 0 12px 0;
          letter-spacing: -0.02em;
          background: linear-gradient(135deg, #ffffff 0%, #d1c4e9 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .expired-desc {
          font-size: 14px;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.5);
          margin: 0;
        }
      `}</style>
    </div>
  );
}

function GamePage() {
  useEffect(() => {
    const checkAndEnsureAnonymous = async () => {
      const user = auth.currentUser;
      if (user && !user.isAnonymous) {
        console.log("Admin email/password user detected on game root page. Switching to anonymous credentials...");
        try {
          await auth.signOut();
          await loginAnonymously();
        } catch (err) {
          console.error("Failed to switch to anonymous credentials:", err);
        }
      } else if (!user) {
        // Guarantee player has anonymous credentials on game startup
        try {
          await loginAnonymously();
        } catch (err) {
          console.error("Failed to initialize anonymous player session:", err);
        }
      }
    };
    checkAndEnsureAnonymous();
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full bg-[#030712] overflow-hidden select-none touch-none">
      <Game />
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Luckiest+Guy&display=swap');
          body { 
            margin: 0; 
            padding: 0;
            overflow: hidden; 
            background: #030712;
            touch-action: none;
            user-select: none;
            width: 100vw;
            height: 100vh;
            position: fixed;
          }
          #root { 
            width: 100%;
            height: 100%;
          }
          .font-goofy { font-family: 'Luckiest Guy', cursive; }
        `}
      </style>
    </div>
  );
}

export default function App() {
  const [isChecking, setIsChecking] = useState(true);
  const [isPaid, setIsPaid] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const docRef = doc(db, 'payment', 'paymentStatus');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      setIsChecking(false);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && data.paid === true) {
          setIsPaid(true);
          setError(null);
        } else {
          setIsPaid(false);
          setError(null);
        }
      } else {
        setIsPaid(false);
        setError('Document "payment/paymentStatus" not found in Firestore. Create a document under "payment" collection with ID "paymentStatus" and set field "paid: true" to unlock.');
      }
    }, (err) => {
      console.error("Firestore payment status listener error:", err);
      setIsChecking(false);
      setIsPaid(false);
      setError(err.message || String(err));
    });

    return () => unsubscribe();
  }, []);

  if (isChecking) {
    return (
      <div className="license-checking-screen">
        <div className="checking-content">
          <div className="loading-spinner"></div>
          <p className="checking-text font-inter">Verifying client license status...</p>
        </div>
        <style>{`
          .license-checking-screen {
            position: fixed;
            inset: 0;
            background: #03010a;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
          }
          .checking-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 16px;
          }
          .loading-spinner {
            width: 48px;
            height: 48px;
            border: 3px solid rgba(255, 107, 0, 0.1);
            border-radius: 50%;
            border-top-color: #ff6b00;
            animation: spin 1s linear infinite;
            filter: drop-shadow(0 0 8px rgba(255, 107, 0, 0.4));
          }
          .checking-text {
            color: rgba(255, 255, 255, 0.6);
            font-size: 14px;
            font-weight: 500;
            letter-spacing: 0.05em;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .font-inter {
            font-family: 'Inter', sans-serif;
          }
        `}</style>
      </div>
    );
  }

  // Bypass payment check to keep the game and dashboard enabled
  // if (!isPaid) {
  //   return <ExpiredScreen error={error} />;
  // }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<GamePage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
      </Routes>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
        `}
      </style>
    </Router>
  );
}




