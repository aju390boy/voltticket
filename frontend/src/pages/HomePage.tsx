import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { eventsApi } from '../services/api';
import { CountdownTimer } from '../components/CountdownTimer';

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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, boxShadow: '0 12px 40px rgba(201,168,76,0.22)' }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      className="card"
      style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', cursor: 'pointer' }}
    >
      {/* Header image */}
      <div style={{
        height: 170,
        borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
        margin: '-24px -24px 20px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <img
          src={event.imageUrl || '/images/concert_banner.png'}
          onError={(e) => { (e.target as HTMLImageElement).src = '/images/concert_banner.png'; }}
          style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }}
          onMouseEnter={(e) => { (e.target as HTMLImageElement).style.transform = 'scale(1.06)'; }}
          onMouseLeave={(e) => { (e.target as HTMLImageElement).style.transform = 'scale(1)'; }}
        />
        {/* Gold shimmer overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, transparent 40%, rgba(250,248,240,0.7) 100%)',
        }} />
        <div style={{ position: 'absolute', top: 12, right: 12 }}>
          <span className={`badge badge-${
            event.status === 'live' ? 'live' : event.status === 'sold_out' ? 'sold' : 'upcoming'
          }`}>
            {event.status === 'live' ? '● LIVE' : event.status === 'sold_out' ? 'SOLD OUT' : 'UPCOMING'}
          </span>
        </div>
        {isAlmostGone && !isSoldOut && (
          <div style={{ position: 'absolute', top: 12, left: 12 }}>
            <span className="badge badge-locked">🔥 Almost Gone</span>
          </div>
        )}
      </div>

      <div
        style={{
          fontFamily: 'Space Grotesk',
          fontSize: 18,
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: 4,
        }}
      >
        {event.title}
      </div>
      <div style={{ fontSize: 13, color: 'var(--gold-600)', marginBottom: 10, fontWeight: 600 }}>
        {event.artist}
      </div>
      <div
        style={{
          fontSize: 13,
          color: 'var(--text-muted)',
          marginBottom: 3,
        }}
      >
        📍 {event.venue}, {event.venueCity}
      </div>
      <div
        style={{
          fontSize: 13,
          color: 'var(--text-muted)',
          marginBottom: 16,
        }}
      >
        📅{' '}
        {new Date(event.date).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })}
      </div>

      {/* Availability bar */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 6,
            fontSize: 12,
          }}
        >
          <span style={{ color: 'var(--text-muted)' }}>Availability</span>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
            {event.availableSeats.toLocaleString()} /{' '}
            {event.totalSeats.toLocaleString()}
          </span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{
              width: `${soldPercent}%`,
              background:
                soldPercent > 90
                  ? 'linear-gradient(90deg, #ef4444, #f97316)'
                  : soldPercent > 70
                  ? 'linear-gradient(90deg, #f59e0b, #eab308)'
                  : 'var(--gradient-primary)',
            }}
          />
        </div>
      </div>

      {!isSaleStarted && (
        <div style={{ marginBottom: 16 }}>
          <CountdownTimer targetDate={saleDate} size="sm" />
        </div>
      )}

      <div
        style={{
          marginTop: 'auto',
          display: 'flex',
          gap: 12,
          alignItems: 'center',
        }}
      >
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          From{' '}
          <strong
            style={{ color: 'var(--text-primary)', fontSize: 18 }}
          >
            ${minPrice}
          </strong>
        </div>
        <Link
          to={`/events/${event._id}`}
          className="btn btn-primary btn-sm"
          style={{ marginLeft: 'auto' }}
        >
          {isSoldOut ? 'Join Waitlist' : 'Get Tickets →'}
        </Link>
      </div>
    </motion.div>
  );
}

export function HomePage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['events'],
    queryFn: () => eventsApi.getAll().then((r) => r.data),
    refetchInterval: 30000,
  });

  const events: Event[] = data?.events || [];

  return (
    <div>
      {/* Hero */}
      <div style={{
        position: 'relative',
        overflow: 'hidden',
        minHeight: 480,
        display: 'flex',
        alignItems: 'center',
      }}>
        {/* Hero image */}
        <img
          src="/images/hero_banner.png"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          alt=""
        />
        {/* Cream overlay so text stays readable */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(250,248,240,0.72) 0%, rgba(250,248,240,0.90) 100%)',
        }} />

        <div className="container" style={{ position: 'relative', zIndex: 1, padding: '80px 24px 60px', textAlign: 'center', width: '100%' }}>
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

            {/* Live pill */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(201,168,76,0.12)', border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-full)', padding: '6px 18px',
              fontSize: 12, color: 'var(--gold-700)', marginBottom: 28, fontWeight: 600,
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%', background: '#059669',
                display: 'inline-block', animation: 'pulse-badge 2s infinite',
              }} />
              High-Concurrency Flash Sales — Live Now
            </div>

          <h1
            style={{
              fontSize: 'clamp(36px, 6vw, 72px)',
              fontWeight: 900,
              lineHeight: 1.1,
              marginBottom: 20,
            }}
          >
            Get Tickets Before
            <br />
            <span
              style={{
                background: 'var(--gradient-primary)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              They&apos;re Gone
            </span>
          </h1>
          <p
            style={{
              fontSize: 18,
              color: 'var(--text-secondary)',
              maxWidth: 520,
              margin: '0 auto 40px',
              lineHeight: 1.6,
            }}
          >
            Powered by distributed locks and real-time queuing. We handle
            50,000+ concurrent users so you never miss out.
          </p>

          {/* Feature pills */}
          <div
            style={{
              display: 'flex',
              gap: 12,
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            {[
              ['⚡', 'Real-time Seat Maps'],
              ['🔒', 'Distributed Locks'],
              ['📊', '50K Concurrent Users'],
              ['🎫', 'Instant QR Tickets'],
            ].map(([icon, label]) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-full)',
                  padding: '8px 16px',
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                }}
              >
                <span>{icon}</span> {label}
              </div>
            ))}
          </div>
        </motion.div>
        </div>  {/* /container */}
      </div>  {/* /hero */}

      {/* Events Grid */}
      <div className="container" style={{ paddingBottom: 80 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 32,
          }}
        >
          <h2 style={{ fontSize: 24 }}>🔥 Upcoming Events</h2>
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
                <div
                  className="skeleton"
                  style={{ height: 160, margin: '-24px -24px 20px', borderRadius: '12px 12px 0 0' }}
                />
                <div className="skeleton" style={{ height: 20, width: '70%', marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 14, width: '50%', marginBottom: 12 }} />
                <div className="skeleton" style={{ height: 6, marginBottom: 16 }} />
                <div className="skeleton" style={{ height: 36, borderRadius: 20 }} />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div
            style={{
              textAlign: 'center',
              padding: 64,
              color: 'var(--text-muted)',
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <div style={{ fontSize: 18, marginBottom: 8 }}>Could not load events</div>
            <div style={{ fontSize: 14 }}>Make sure the API server is running at http://localhost:3001</div>
          </div>
        ) : events.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: 64,
              color: 'var(--text-muted)',
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎭</div>
            <div style={{ fontSize: 18 }}>No events yet</div>
          </div>
        ) : (
          <div className="grid-3">
            {events.map((event, i) => (
              <EventCard key={event._id} event={event} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
