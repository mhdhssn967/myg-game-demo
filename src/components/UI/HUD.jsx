import React from 'react';

const HUD = ({ score }) => {
  return (
    <div className="absolute top-0 w-full flex justify-end items-start p-6 md:p-10 z-50 pointer-events-none">
      {/* Goofy Scoreboard */}
      <div 
        className="bg-[#5D4037] border-[4px] border-[#22C55E] shadow-[0_8px_0_rgba(0,0,0,0.3)] rounded-3xl px-8 py-4 flex flex-col items-center transform rotate-2 hover:rotate-0 transition-transform duration-300"
        style={{ filter: 'drop-shadow(4px 4px 0px rgba(0,0,0,0.2))' }}
      >
        <div className="font-goofy text-xs text-[#4Ade80] uppercase tracking-widest leading-none mb-1">
          Distance
        </div>
        <div className="font-goofy text-5xl text-white drop-shadow-[2px_2px_0_rgba(0,0,0,0.5)] tabular-nums">
          {Math.floor(score)}
        </div>
      </div>
      
      {/* Brand Label (Floating Left) */}
      <div className="absolute left-6 top-6 flex items-center gap-3 bg-white/20 backdrop-blur-sm border border-white/30 px-5 py-2 rounded-full shadow-lg">
         <div className="w-3 h-3 bg-[#4Ade80] rounded-full animate-pulse" />
         <span className="font-goofy text-white text-sm tracking-wide">MYG RUNNER</span>
      </div>
    </div>
  );
};

export default HUD;

