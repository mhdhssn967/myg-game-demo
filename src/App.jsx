import React from 'react';
import Game from './components/Game';

export default function App() {
  return (
    <div className="fixed inset-0 w-full h-full bg-[#030712] overflow-hidden select-none touch-none">
      {/* 2D High Performance Runner */}
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



