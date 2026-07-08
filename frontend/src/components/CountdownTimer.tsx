import { useState, useEffect } from 'react';

interface CountdownTimerProps {
  targetDate: Date;
  label?: string;
  onComplete?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function CountdownTimer({
  targetDate,
  label = 'Sale starts in',
  onComplete,
  size = 'md',
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const calculate = () => {
      const diff = targetDate.getTime() - Date.now();
      if (diff <= 0) {
        setExpired(true);
        onComplete?.();
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };
    calculate();
    const id = setInterval(calculate, 1000);
    return () => clearInterval(id);
  }, [targetDate, onComplete]);

  if (expired) {
    return (
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontSize: size === 'lg' ? 24 : 18,
            fontWeight: 800,
            background: 'var(--gradient-primary)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontFamily: 'Space Grotesk',
          }}
        >
          🔥 SALE IS LIVE!
        </div>
      </div>
    );
  }

  const units: [string, number][] =
    timeLeft.days > 0
      ? [
          ['days', timeLeft.days],
          ['hrs', timeLeft.hours],
          ['min', timeLeft.minutes],
          ['sec', timeLeft.seconds],
        ]
      : [
          ['hrs', timeLeft.hours],
          ['min', timeLeft.minutes],
          ['sec', timeLeft.seconds],
        ];

  const digitSize = size === 'lg' ? 48 : size === 'md' ? 36 : 24;
  const boxPad = size === 'lg' ? '10px 20px' : size === 'md' ? '8px 14px' : '6px 10px';
  const minW = size === 'lg' ? 76 : size === 'md' ? 60 : 44;

  return (
    <div style={{ textAlign: 'center' }}>
      <div
        style={{
          fontSize: 11,
          color: 'var(--text-muted)',
          marginBottom: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: 'flex',
          gap: 6,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {units.map(([unit, value], i) => (
          <div key={unit} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 8,
                  padding: boxPad,
                  minWidth: minW,
                  fontFamily: 'Space Grotesk',
                  fontWeight: 800,
                  fontSize: digitSize,
                  color: 'var(--text-primary)',
                  lineHeight: 1,
                  boxShadow: 'var(--shadow-md)',
                }}
              >
                {String(value).padStart(2, '0')}
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: 'var(--text-muted)',
                  marginTop: 4,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  fontWeight: 600,
                }}
              >
                {unit}
              </div>
            </div>
            {i < units.length - 1 && (
              <span
                style={{
                  fontSize: digitSize * 0.6,
                  fontWeight: 800,
                  color: 'var(--text-muted)',
                  paddingBottom: 16,
                }}
              >
                :
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
