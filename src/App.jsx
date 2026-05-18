import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Game from './components/Game';
import Dashboard from './pages/Dashboard';
import { loginAnonymously } from './firebase/config';

function GamePage() {
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
  useEffect(() => {
    loginAnonymously().catch(() => {});
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<GamePage />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
        `}
      </style>
    </Router>
  );
}



