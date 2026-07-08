import { useState, useEffect } from 'react';

interface SeatHoldTimerProps {
  expiresAt: string;
  onExpire: () => void;
  totalSeconds?: number;
}

export function SeatHoldTimer({
  expiresAt,
  onExpire,
  totalSeconds = 300,
}: SeatHoldTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    const calculate = () => {
      const diff = Math.max(
        0,
        Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)
      );
      setSecondsLeft(diff);
      if (diff <= 0) onExpire();
    };
    calculate();
    const id = setInterval(calculate, 1000);
    return () => clearInterval(id);
  }, [expiresAt, onExpire]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const isUrgent = secondsLeft < 60;
  const percentage = Math.max(0, secondsLeft / totalSeconds);

  return (
    <div
      style={{
        background: isUrgent
          ? 'rgba(239, 68, 68, 0.1)'
          : 'rgba(245, 158, 11, 0.1)',
        border: `1px solid ${
          isUrgent ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'
        }`,
        borderRadius: 12,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <span style={{ fontSize: 20 }}>{isUrgent ? '🚨' : '⏱️'}</span>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 12,
            color: isUrgent ? '#f87171' : '#fbbf24',
            fontWeight: 600,
            marginBottom: 6,
          }}
        >
          {isUrgent
            ? 'Hurry! Seat expiring soon'
            : 'Seat reserved for you'}
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{
              width: `${percentage * 100}%`,
              background: isUrgent
                ? 'var(--accent-red)'
                : 'var(--accent-amber)',
            }}
          />
        </div>
      </div>
      <div
        style={{
          fontFamily: 'Space Grotesk',
          fontWeight: 800,
          fontSize: 22,
          color: isUrgent ? '#f87171' : '#fbbf24',
          minWidth: 60,
          textAlign: 'right',
        }}
      >
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </div>
    </div>
  );
}
