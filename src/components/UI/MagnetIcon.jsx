import React from 'react';

const MagnetIcon = ({ size = 40, color = '#ff0000', secondaryColor = '#ffffff' }) => {
  return (
    <div style={{
      width: size,
      height: size,
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      filter: 'drop-shadow(0 0 5px rgba(255,0,0,0.5))'
    }}>
      {/* U-Shape Magnet Body */}
      <div style={{
        width: size * 0.8,
        height: size * 0.8,
        border: `${size * 0.15}px solid ${color}`,
        borderTop: 'none',
        borderRadius: `0 0 ${size * 0.4}px ${size * 0.4}px`,
        position: 'relative'
      }}>
        {/* Left Tip */}
        <div style={{
          position: 'absolute',
          top: -size * 0.1,
          left: -size * 0.15,
          width: size * 0.15,
          height: size * 0.2,
          backgroundColor: secondaryColor,
          borderRadius: '2px 2px 0 0'
        }} />
        {/* Right Tip */}
        <div style={{
          position: 'absolute',
          top: -size * 0.1,
          right: -size * 0.15,
          width: size * 0.15,
          height: size * 0.2,
          backgroundColor: secondaryColor,
          borderRadius: '2px 2px 0 0'
        }} />
      </div>
    </div>
  );
};

export default MagnetIcon;
