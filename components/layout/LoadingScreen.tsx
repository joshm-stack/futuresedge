'use client';
import { useEffect, useState } from 'react';

export default function LoadingScreen() {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setFadeOut(true), 1800);
    const hide = setTimeout(() => setVisible(false), 2300);
    return () => { clearTimeout(timer); clearTimeout(hide); };
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'linear-gradient(160deg, #07091a 0%, #050710 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 0.5s ease',
        pointerEvents: fadeOut ? 'none' : 'all',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700&display=swap');

        @keyframes ringPulse {
          0%   { opacity: 0.5; transform: translate(-50%, -50%) scale(0.85); }
          100% { opacity: 0;   transform: translate(-50%, -50%) scale(1.15); }
        }

        @keyframes barFill {
          0%   { width: 0%;   }
          75%  { width: 85%;  }
          95%  { width: 96%;  }
          100% { width: 100%; }
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes iconPop {
          0%   { opacity: 0; transform: scale(0.7); }
          60%  { transform: scale(1.08); }
          100% { opacity: 1; transform: scale(1); }
        }

        .ls-ring {
          position: absolute;
          border-radius: 50%;
          border: 1px solid rgba(61,127,255,0.2);
          top: 50%;
          left: 50%;
          animation: ringPulse 2.4s ease-out infinite;
        }

        .ls-icon {
          animation: iconPop 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards;
        }

        .ls-text {
          animation: fadeUp 0.5s ease forwards;
          animation-delay: 0.4s;
          opacity: 0;
        }

        .ls-bar {
          animation: barFill 1.8s ease-in-out forwards;
          animation-delay: 0.3s;
        }
      `}</style>

      {/* Ambient glow */}
      <div style={{
        position: 'absolute',
        width: 400,
        height: 400,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(61,127,255,0.1) 0%, transparent 65%)',
        top: '40%',
        left: '50%',
        transform: 'translate(-50%, -55%)',
        pointerEvents: 'none',
      }} />

      {/* Content */}
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>

        {/* Rings + Icon */}
        <div style={{ position: 'relative', width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
          <div className="ls-ring" style={{ width: 110, height: 110, animationDelay: '0s' }} />
          <div className="ls-ring" style={{ width: 140, height: 140, animationDelay: '0.7s' }} />
          <div className="ls-ring" style={{ width: 170, height: 170, animationDelay: '1.4s' }} />

          {/* Icon */}
          <div className="ls-icon" style={{
            width: 76,
            height: 76,
            borderRadius: 21,
            background: 'linear-gradient(145deg, #192240 0%, #0d1530 50%, #080d20 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.07), 0 12px 36px rgba(61,127,255,0.25), 0 4px 12px rgba(0,0,0,0.5)',
            position: 'relative',
            zIndex: 1,
          }}>
            <svg width="38" height="38" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
              <polyline
                points="1,17 6,11 11,14 17,6 21,4"
                stroke="#7ab4ff"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <polyline
                points="17,2 21,4 19,8"
                stroke="#7ab4ff"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </div>
        </div>

        {/* Wordmark */}
        <div className="ls-text" style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: '-0.025em',
            color: '#e8eeff',
            lineHeight: 1,
          }}>
            Futures<span style={{
              background: 'linear-gradient(135deg, #3d7fff, #7ab4ff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>Edge</span>
          </div>
          <div style={{
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.18)',
            marginTop: 8,
          }}>
            Your Trading Edge
          </div>
        </div>

        {/* Progress bar */}
        <div style={{
          width: 100,
          height: 2,
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 2,
          overflow: 'hidden',
          marginTop: 32,
        }}>
          <div className="ls-bar" style={{
            height: '100%',
            width: 0,
            background: 'linear-gradient(90deg, #2563eb, #7ab4ff)',
            borderRadius: 2,
          }} />
        </div>
      </div>
    </div>
  );
}
