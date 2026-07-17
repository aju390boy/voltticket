import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BookingAnimationProps {
  isVisible: boolean;
  isSuccess?: boolean;
  onComplete?: () => void;
}

// Confetti particle
function Particle({ delay, x, color }: { delay: number; x: number; color: string }) {
  return (
    <motion.div
      initial={{ y: -20, x, opacity: 1, scale: 1, rotate: 0 }}
      animate={{ y: 400, x: x + (Math.random() - 0.5) * 200, opacity: 0, scale: 0.3, rotate: 720 }}
      transition={{ duration: 1.8, delay, ease: 'easeIn' }}
      style={{
        position: 'absolute',
        top: '30%',
        left: '50%',
        width: 10,
        height: 10,
        background: color,
        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
        zIndex: 10,
      }}
    />
  );
}

// Lightning bolt SVG
function LightningBolt() {
  return (
    <motion.svg
      width="80" height="180" viewBox="0 0 80 180"
      initial={{ pathLength: 0, opacity: 0, y: -60 }}
      animate={{ pathLength: 1, opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      style={{ filter: 'drop-shadow(0 0 24px #E8B923) drop-shadow(0 0 48px #C9A84C)' }}
    >
      <motion.path
        d="M50 0 L20 90 L45 90 L30 180 L70 70 L45 70 Z"
        fill="url(#boltGrad)"
        stroke="#FFF8E8"
        strokeWidth="2"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      />
      <defs>
        <linearGradient id="boltGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FDF0C4" />
          <stop offset="50%" stopColor="#E8B923" />
          <stop offset="100%" stopColor="#C9A84C" />
        </linearGradient>
      </defs>
    </motion.svg>
  );
}

// Animated ticket
function TicketShape({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0.3, opacity: 0, rotateX: 90 }}
          animate={{ scale: 1, opacity: 1, rotateX: 0 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
          style={{
            width: 280,
            background: 'linear-gradient(135deg, #FFFDF5 0%, #FEF9EC 100%)',
            borderRadius: 16,
            padding: '24px',
            boxShadow: '0 20px 60px rgba(201,168,76,0.4), 0 0 0 2px rgba(201,168,76,0.3)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Scan line animation */}
          <motion.div
            initial={{ y: -10 }}
            animate={{ y: 200 }}
            transition={{ duration: 0.8, ease: 'linear', delay: 0.3 }}
            style={{
              position: 'absolute',
              left: 0, right: 0, height: 3,
              background: 'linear-gradient(90deg, transparent, #E8B923, transparent)',
              boxShadow: '0 0 12px #E8B923',
              zIndex: 5,
            }}
          />

          {/* Perforated edge */}
          <div style={{
            position: 'absolute', left: 0, right: 0, top: '55%',
            height: 1, borderTop: '2px dashed rgba(201,168,76,0.4)',
          }} />
          <div style={{
            position: 'absolute', left: -14, top: '50%', transform: 'translateY(-50%)',
            width: 28, height: 28, borderRadius: '50%',
            background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(10px)',
            border: '1px solid rgba(201,168,76,0.2)',
          }} />
          <div style={{
            position: 'absolute', right: -14, top: '50%', transform: 'translateY(-50%)',
            width: 28, height: 28, borderRadius: '50%',
            background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(10px)',
            border: '1px solid rgba(201,168,76,0.2)',
          }} />

          {/* Ticket content */}
          <div style={{ textAlign: 'center', paddingBottom: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⚡</div>
            <div style={{
              fontFamily: 'Playfair Display',
              fontSize: 18, fontWeight: 800,
              background: 'linear-gradient(135deg, #C9A84C, #E8B923)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              marginBottom: 4,
            }}>VoltTicket</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>The Resonance World Tour</div>
          </div>

          <div style={{ paddingTop: 16, textAlign: 'center' }}>
            {/* QR code placeholder */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8, type: 'spring' }}
              style={{
                width: 80, height: 80, margin: '0 auto',
                background: '#1A1509',
                borderRadius: 8,
                display: 'grid',
                gridTemplateColumns: 'repeat(6, 1fr)',
                gap: 2,
                padding: 8,
              }}
            >
              {Array.from({ length: 36 }).map((_, i) => (
                <div key={i} style={{
                  background: Math.random() > 0.4 ? '#1A1509' : '#FEF9EC',
                  borderRadius: 1,
                }} />
              ))}
            </motion.div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8, fontFamily: 'monospace' }}>
              VT-{Math.random().toString(36).slice(2, 8).toUpperCase()}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function BookingAnimation({ isVisible, isSuccess, onComplete }: BookingAnimationProps) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!isVisible) { setPhase(0); return; }
    const t1 = setTimeout(() => setPhase(1), 100);
    const t2 = setTimeout(() => setPhase(2), 600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [isVisible]);

  useEffect(() => {
    if (isSuccess && phase >= 2) {
      setPhase(3);
      const t = setTimeout(() => { onComplete?.(); }, 2200);
      return () => clearTimeout(t);
    }
  }, [isSuccess, phase, onComplete]);

  const confettiColors = ['#E8B923', '#C9A84C', '#FDF0C4', '#B8860B', '#FFFFFF', '#F7D96B'];
  const confettiItems = Array.from({ length: 28 }, (_, i) => ({
    delay: i * 0.06,
    x: (Math.random() - 0.5) * 300,
    color: confettiColors[i % confettiColors.length],
  }));

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(250, 248, 240, 0.95)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {/* Background glow rings */}
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute', width: 400, height: 400,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(201,168,76,0.15) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          {/* Phase 1 — Lightning bolt */}
          <AnimatePresence>
            {phase === 1 && (
              <motion.div
                initial={{ opacity: 0, y: -40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.5 }}
                transition={{ duration: 0.3 }}
                style={{ marginBottom: 20 }}
              >
                <LightningBolt />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Phase 2+ — Ticket */}
          <TicketShape show={phase >= 2} />

          {/* Phase 3 — Success confetti + message */}
          <AnimatePresence>
            {phase === 3 && (
              <>
                {confettiItems.map((c, i) => (
                  <Particle key={i} delay={c.delay} x={c.x} color={c.color} />
                ))}
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                  style={{ marginTop: 24, textAlign: 'center' }}
                >
                  <motion.div
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 0.4, repeat: 2 }}
                    style={{
                      fontSize: 48, marginBottom: 12,
                      filter: 'drop-shadow(0 0 16px #E8B923)',
                    }}
                  >🎉</motion.div>
                  <div style={{
                    fontFamily: 'Playfair Display', fontSize: 26, fontWeight: 800,
                    background: 'linear-gradient(135deg, #C9A84C, #E8B923, #B8860B)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    marginBottom: 8,
                  }}>
                    Tickets Confirmed!
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                    Redirecting to your order...
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Processing text (phases 1-2) */}
          <AnimatePresence>
            {phase < 3 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ marginTop: 32, textAlign: 'center' }}
              >
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 500 }}
                >
                  {phase <= 1 ? '⚡ Securing your seats...' : '🎟️ Generating your tickets...'}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
