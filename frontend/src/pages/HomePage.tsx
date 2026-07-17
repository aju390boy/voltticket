import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { eventsApi } from '../services/api';
import { CountdownTimer } from '../components/CountdownTimer';
import { useScrollReveal, useStaggerReveal } from '../hooks/useScrollReveal';

interface Event {
  _id: string;
  title: string;
  artist: string;
  venue: string;
  venueCity: string;
  date: string;
  saleStartTime: string;
  status: string;
  availableSeats: number;
  totalSeats: number;
  soldSeats: number;
  imageUrl?: string;
  priceByTier: Record<string, number>;
}

function EventCard({ event, index }: { event: Event; index: number }) {
  const isSoldOut     = event.status === 'sold_out';
  const saleDate      = new Date(event.saleStartTime);
  const isSaleStarted = saleDate <= new Date();
  const minPrice      = Math.min(...Object.values(event.priceByTier));
  const soldPercent   = (event.soldSeats / event.totalSeats) * 100;
  const isAlmostGone  = event.availableSeats < 200;

  return (
    <motion.div
      className="card reveal"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6, boxShadow: '0 16px 48px rgba(201,168,76,0.25)' }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', transitionDelay: `${index * 80}ms` }}
    >
      {/* Header image */}
      <div style={{
        height: 180,
        borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
        margin: '-24px -24px 20px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <img
          src={event.imageUrl || '/images/concert_banner.png'}
          onError={(e) => { (e.target as HTMLImageElement).src = '/images/concert_banner.png'; }}
          style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.6s ease' }}
          onMouseEnter={(e) => { (e.target as HTMLImageElement).style.transform = 'scale(1.08)'; }}
          onMouseLeave={(e) => { (e.target as HTMLImageElement).style.transform = 'scale(1)'; }}
        />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, transparent 30%, rgba(250,248,240,0.75) 100%)',
        }} />
        <div style={{ position: 'absolute', top: 12, right: 12 }}>
          <span className={`badge badge-${event.status === 'live' ? 'live' : event.status === 'sold_out' ? 'sold' : 'upcoming'}`}>
            {event.status === 'live' ? '● LIVE' : event.status === 'sold_out' ? 'SOLD OUT' : 'UPCOMING'}
          </span>
        </div>
        {isAlmostGone && !isSoldOut && (
          <div style={{ position: 'absolute', top: 12, left: 12 }}>
            <span className="badge badge-locked">🔥 Almost Gone</span>
          </div>
        )}
      </div>

      <div style={{ fontFamily: 'Space Grotesk', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{event.title}</div>
      <div style={{ fontSize: 13, color: 'var(--gold-600)', marginBottom: 10, fontWeight: 600 }}>{event.artist}</div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 3 }}>📍 {event.venue}, {event.venueCity}</div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
        📅 {new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
          <span style={{ color: 'var(--text-muted)' }}>Availability</span>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
            {event.availableSeats.toLocaleString()} / {event.totalSeats.toLocaleString()}
          </span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{
            width: `${soldPercent}%`,
            background: soldPercent > 90 ? 'linear-gradient(90deg, #ef4444, #f97316)' : soldPercent > 70 ? 'linear-gradient(90deg, #f59e0b, #eab308)' : 'var(--gradient-primary)',
          }} />
        </div>
      </div>

      {!isSaleStarted && <div style={{ marginBottom: 16 }}><CountdownTimer targetDate={saleDate} size="sm" /></div>}

      <div style={{ marginTop: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          From <strong style={{ color: 'var(--text-primary)', fontSize: 20 }}>${minPrice}</strong>
        </div>
        <Link to={`/events/${event._id}`} className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }}>
          {isSoldOut ? 'Join Waitlist' : 'Get Tickets →'}
        </Link>
      </div>
    </motion.div>
  );
}

const HOW_IT_WORKS = [
  { icon: '⚡', step: '01', title: 'Flash Sale Opens', desc: 'The moment the sale starts, thousands compete simultaneously. Our distributed lock system ensures fair access for everyone.' },
  { icon: '🔒', step: '02', title: 'Seat Reserved Instantly', desc: 'Your chosen seat is locked for 5 minutes using Redis-powered distributed locks — no one else can grab it while you checkout.' },
  { icon: '🎟️', step: '03', title: 'QR Ticket Delivered', desc: 'After payment, your e-ticket with a unique QR code lands in your account instantly. Entry is contactless and instant.' },
];

export function HomePage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['events'],
    queryFn: () => eventsApi.getAll().then((r) => r.data),
    refetchInterval: 30000,
  });
  const events: Event[] = data?.events || [];

  // Parallax on hero image
  const heroImgRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const onScroll = () => {
      if (heroImgRef.current) {
        heroImgRef.current.style.transform = `translateY(${window.scrollY * 0.28}px)`;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Scroll reveals
  const hiwHeadingRef  = useScrollReveal<HTMLDivElement>();
  const hiwGridRef     = useStaggerReveal<HTMLDivElement>({ staggerDelay: 130 });
  const eventsHeadRef  = useScrollReveal<HTMLDivElement>();
  const statsBarRef    = useScrollReveal<HTMLDivElement>();

  return (
    <div>
      {/* ── HERO ─────────────────────────────────────────────── */}
      <div style={{ position: 'relative', overflow: 'hidden', minHeight: 520, display: 'flex', alignItems: 'center' }}>
        <img
          ref={heroImgRef}
          src="/images/hero_banner.png"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '115%', objectFit: 'cover', top: '-7.5%', willChange: 'transform' }}
          alt=""
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(250,248,240,0.55) 0%, rgba(250,248,240,0.92) 100%)' }} />

        <div className="container" style={{ position: 'relative', zIndex: 1, padding: '90px 24px 70px', textAlign: 'center', width: '100%' }}>
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>

            <motion.div
              animate={{ boxShadow: ['0 0 0 0 rgba(201,168,76,0.3)', '0 0 0 10px rgba(201,168,76,0)', '0 0 0 0 rgba(201,168,76,0)'] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'rgba(201,168,76,0.12)', border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-full)', padding: '6px 20px',
                fontSize: 12, color: 'var(--gold-700)', marginBottom: 28, fontWeight: 600,
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#059669', display: 'inline-block', animation: 'pulse-badge 2s infinite' }} />
              High-Concurrency Flash Sales — Live Now
            </motion.div>

            <h1 className="hero-title" style={{ fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 900, lineHeight: 1.1, marginBottom: 20 }}>
              Get Tickets Before
              <br />
              <span style={{ background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                They&apos;re Gone
              </span>
            </h1>

            <p className="hero-subtitle" style={{ fontSize: 18, color: 'var(--text-secondary)', maxWidth: 540, margin: '0 auto 40px', lineHeight: 1.7 }}>
              Powered by distributed locks and real-time queuing. We handle 50,000+ concurrent users so you never miss out.
            </p>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              {[['⚡', 'Real-time Seat Maps'], ['🔒', 'Distributed Locks'], ['📊', '50K Concurrent Users'], ['🎫', 'Instant QR Tickets']].map(([icon, label]) => (
                <div key={label} className="feature-pill"><span>{icon}</span> {label}</div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <div className="hiw-section">
        <div className="container">
          <div ref={hiwHeadingRef} className="reveal" style={{ textAlign: 'center', marginBottom: 48 }}>
            <div className="section-eyebrow">The Technology</div>
            <h2 style={{ fontSize: 'clamp(22px, 3vw, 32px)', marginBottom: 12 }}>How VoltTicket Works</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 15, maxWidth: 480, margin: '0 auto' }}>
              Enterprise-grade infrastructure that handles flash sales at massive scale
            </p>
          </div>
          <div ref={hiwGridRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
            {HOW_IT_WORKS.map((step) => (
              <div key={step.step} className="step-card reveal">
                <div className="step-number">{step.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold-500)', letterSpacing: '0.1em', marginBottom: 10, textTransform: 'uppercase' }}>
                  Step {step.step}
                </div>
                <h3 style={{ fontSize: 16, marginBottom: 10, fontFamily: 'Space Grotesk' }}>{step.title}</h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── EVENTS GRID ──────────────────────────────────────── */}
      <div className="container" style={{ paddingBottom: 80, paddingTop: 16 }}>
        <div ref={eventsHeadRef} className="reveal" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <div className="section-eyebrow">Now Available</div>
            <h2 className="section-title" style={{ fontSize: 24 }}>🔥 Upcoming Events</h2>
          </div>
          {!isLoading && (
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {events.length} event{events.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="grid-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card">
                <div className="skeleton" style={{ height: 180, margin: '-24px -24px 20px', borderRadius: '12px 12px 0 0' }} />
                <div className="skeleton" style={{ height: 20, width: '70%', marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 14, width: '50%', marginBottom: 12 }} />
                <div className="skeleton" style={{ height: 6, marginBottom: 16 }} />
                <div className="skeleton" style={{ height: 36, borderRadius: 20 }} />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div style={{ textAlign: 'center', padding: 64, color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <div style={{ fontSize: 18, marginBottom: 8 }}>Could not load events</div>
          </div>
        ) : events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 64, color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎭</div>
            <div style={{ fontSize: 18 }}>No events yet</div>
          </div>
        ) : (
          <div className="grid-3">
            {events.map((event, i) => <EventCard key={event._id} event={event} index={i} />)}
          </div>
        )}
      </div>

      {/* ── STATS BAR ────────────────────────────────────────── */}
      <div ref={statsBarRef} className="reveal" style={{ background: 'linear-gradient(135deg, #1A1509 0%, #2D2208 100%)', padding: '56px 0' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 32, textAlign: 'center' }}>
            {[
              { value: '50K+', label: 'Concurrent Users' },
              { value: '<50ms', label: 'Lock Acquisition' },
              { value: '99.9%', label: 'Uptime SLA' },
              { value: '1M+', label: 'Tickets Issued' },
            ].map((stat) => (
              <div key={stat.label}>
                <div style={{
                  fontFamily: 'Space Grotesk', fontSize: 36, fontWeight: 800,
                  background: 'linear-gradient(135deg, #FDF0C4, #E8B923)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 6,
                }}>{stat.value}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
