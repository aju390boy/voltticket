import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { eventsApi, seatsApi, checkoutApi } from '../services/api';
import { SeatMap } from '../components/SeatMap';
import { SeatHoldTimer } from '../components/SeatHoldTimer';
import { CountdownTimer } from '../components/CountdownTimer';
import { BookingAnimation } from '../components/BookingAnimation';
import { useSeatStore } from '../stores/seatStore';
import { useAuthStore } from '../stores/authStore';
import { useEventSocket } from '../hooks/useSocket';

export function EventPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const {
    selectedSeatIds,
    seatLocks,
    seats,
    selectSeat,
    deselectSeat,
    setSeats,
    clearSelection,
    clearLocks,
    addLock,
    removeLock,
  } = useSeatStore();

  const [isPolling, setIsPolling] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const pollingRef = useRef(false);

  useEventSocket(eventId!);

  const { data: event } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventsApi.getOne(eventId!).then((r) => r.data.event),
    enabled: !!eventId,
  });

  const { isLoading: seatsLoading, data: seatsData } = useQuery({
    queryKey: ['seats', eventId],
    queryFn: () => eventsApi.getSeats(eventId!).then((r) => r.data),
    enabled: !!eventId,
  });

  // v5: onSuccess removed — use useEffect
  useEffect(() => {
    if (seatsData?.seats) setSeats(seatsData.seats);
  }, [seatsData, setSeats]);

  const reserveMutation = useMutation({
    mutationFn: (seatId: string) => seatsApi.reserve(seatId, eventId!),
    onSuccess: (data, seatId) => {
      addLock({
        seatId,
        token: data.data.token,
        expiresAt: data.data.expiresAt,
      });
      selectSeat(seatId);
      toast.success(
        `Seat ${data.data.seat?.label || ''} reserved! 5 min to complete checkout.`
      );
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Could not reserve seat — try another');
    },
  });

  const releaseMutation = useMutation({
    mutationFn: ({ seatId, token }: { seatId: string; token: string }) =>
      seatsApi.release(seatId, eventId!, token),
    onSuccess: (_, { seatId }) => {
      removeLock(seatId);
      deselectSeat(seatId);
      toast.success('Seat released');
    },
    onError: () => toast.error('Failed to release seat'),
  });

  const checkoutMutation = useMutation({
    mutationFn: () => {
      const lockTokens = Object.fromEntries(
        seatLocks.map((l) => [l.seatId, l.token])
      );
      return checkoutApi.initiate({
        eventId,
        seatIds: selectedSeatIds,
        lockTokens,
      });
    },
    onSuccess: async (data) => {
      const { orderId, jobId } = data.data;
      setIsPolling(true);
      pollingRef.current = true;

      for (let i = 0; i < 30; i++) {
        if (!pollingRef.current) break;
        await new Promise((r) => setTimeout(r, 2000));
        try {
          const { data: job } = await checkoutApi.getJobStatus(jobId);
          if (job.state === 'completed') {
            setBookingSuccess(true);
            // Navigate after animation completes
            setTimeout(() => {
              clearSelection();
              clearLocks();
              navigate(`/orders/${orderId}`);
            }, 2400);
            return;
          } else if (job.state === 'failed') {
            setIsPolling(false);
            pollingRef.current = false;
            toast.error(`Order failed: ${job.failedReason}`);
            break;
          }
        } catch {
          break;
        }
      }
      setIsPolling(false);
      pollingRef.current = false;
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Checkout failed');
    },
  });

  useEffect(() => {
    return () => {
      pollingRef.current = false;
    };
  }, []);

  const handleSeatSelect = useCallback(
    (seatId: string, action: 'select' | 'deselect') => {
      if (!isAuthenticated) {
        toast.error('Please log in to select seats');
        navigate('/login');
        return;
      }
      if (action === 'select') {
        reserveMutation.mutate(seatId);
      } else {
        const lock = seatLocks.find((l) => l.seatId === seatId);
        if (lock) {
          releaseMutation.mutate({ seatId, token: lock.token });
        } else {
          deselectSeat(seatId);
        }
      }
    },
    [isAuthenticated, seatLocks, reserveMutation, releaseMutation, navigate, deselectSeat]
  );

  const selectedSeats = selectedSeatIds
    .map((id) => seats[id])
    .filter(Boolean);
  const totalAmount = selectedSeats.reduce((sum, s) => sum + (s?.price ?? 0), 0);

  const earliestExpiry =
    seatLocks.length > 0
      ? seatLocks.reduce(
          (min, l) => (l.expiresAt < min ? l.expiresAt : min),
          seatLocks[0].expiresAt
        )
      : null;

  const saleDate = event ? new Date(event.saleStartTime) : null;
  const isSaleStarted = saleDate ? saleDate <= new Date() : true;
  const isSoldOut = event?.status === 'sold_out';

  return (
    <div>
      {/* Event hero banner */}
      {event && (
        <div style={{
          position: 'relative', minHeight: 220, display: 'flex', alignItems: 'flex-end',
          backgroundImage: `url(${event.imageUrl || '/images/concert_banner.png'})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, rgba(250,248,240,0.3) 0%, rgba(250,248,240,0.88) 100%)',
          }} />
          <div className="container" style={{ position: 'relative', zIndex: 1, paddingBottom: 28, paddingTop: 60 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
              <span className={`badge badge-${event.status}`}>
                {event.status === 'live' ? '● LIVE' : event.status === 'sold_out' ? 'SOLD OUT' : event.status.toUpperCase()}
              </span>
              <span className="badge badge-vip">{event.artist}</span>
            </div>
            <h1 style={{ fontSize: 'clamp(22px, 4vw, 38px)', marginBottom: 6 }}>{event.title}</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
              📍 {event.venue}, {event.venueCity} &nbsp;·&nbsp; 📅 {new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
      )}

      <div className="container" style={{ paddingTop: 32, paddingBottom: 64 }}>
      {/* Event Header */}
      {event ? (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: 32 }}
        >
          <div
            style={{
              display: 'flex',
              gap: 16,
              flexWrap: 'wrap',
              alignItems: 'flex-start',
            }}
          >
            <div style={{ flex: 1, minWidth: 260 }}>
              <div
                style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}
              >
                <span className={`badge badge-${event.status}`}>
                  {event.status === 'live'
                    ? '● LIVE'
                    : event.status === 'sold_out'
                    ? 'SOLD OUT'
                    : event.status.toUpperCase()}
                </span>
                <span className="badge badge-upcoming">{event.artist}</span>
              </div>
              <h1 style={{ fontSize: 'clamp(24px, 4vw, 36px)', marginBottom: 8 }}>
                {event.title}
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 4 }}>
                📍 {event.venue}, {event.venueCity}
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                📅{' '}
                {new Date(event.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 800,
                  fontFamily: 'Space Grotesk',
                  color: 'var(--accent-purple-light)',
                }}
              >
                {event.availableSeats?.toLocaleString()}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                seats available
              </div>
              <div style={{ marginTop: 8 }}>
                <div className="progress-bar" style={{ width: 120, marginLeft: 'auto' }}>
                  <div
                    className="progress-fill"
                    style={{
                      width: `${(event.soldSeats / event.totalSeats) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Countdown if sale not started */}
          {!isSaleStarted && saleDate && (
            <div
              style={{
                marginTop: 24,
                padding: 24,
                background: 'var(--bg-card)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-lg)',
                textAlign: 'center',
              }}
            >
              <CountdownTimer targetDate={saleDate} size="lg" label="Sale opens in" />
            </div>
          )}
        </motion.div>
      ) : (
        <div
          style={{
            height: 120,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div className="spinner" />
        </div>
      )}

      {/* Booking animation overlay */}
      <BookingAnimation
        isVisible={isPolling || checkoutMutation.isPending}
        isSuccess={bookingSuccess}
      />

      <div className="event-layout">
        {/* Seat Map */}
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <h2 style={{ fontSize: 18 }}>Select Your Seats</h2>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Max 4 seats per order
            </span>
          </div>

          {seatsLoading ? (
            <div
              style={{
                height: 400,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div className="spinner" />
            </div>
          ) : (
            <SeatMap
              eventId={eventId!}
              onSeatSelect={handleSeatSelect}
              maxSelectCount={4}
            />
          )}
        </div>

        {/* Sidebar — desktop only */}
        <div className="event-sidebar-desktop" style={{ position: 'sticky', top: 80 }}>
          {/* Hold Timer */}
          <AnimatePresence>
            {earliestExpiry && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                style={{ marginBottom: 16 }}
              >
                <SeatHoldTimer
                  expiresAt={earliestExpiry}
                  onExpire={() => {
                    clearSelection();
                    clearLocks();
                    toast.error('Seat reservation expired — please reselect');
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Order Summary */}
          <div className="card">
            <h3 style={{ fontSize: 16, marginBottom: 16 }}>Order Summary</h3>

            {selectedSeats.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '24px 0',
                  color: 'var(--text-muted)',
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>💺</div>
                <div style={{ fontSize: 13 }}>
                  Click a seat on the map to select it
                </div>
              </div>
            ) : (
              <>
                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}
                >
                  {selectedSeats.map((seat) => (
                    <div
                      key={seat._id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 12px',
                        background: 'var(--bg-secondary)',
                        borderRadius: 8,
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: 13,
                            color: 'var(--text-primary)',
                          }}
                        >
                          {seat.label}
                        </div>
                        <div
                          style={{ fontSize: 11, color: 'var(--text-muted)' }}
                        >
                          {seat.tier} · {seat.section}
                        </div>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                          }}
                        >
                          ${seat.price}
                        </span>
                        <button
                          onClick={() =>
                            handleSeatSelect(seat._id, 'deselect')
                          }
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            fontSize: 16,
                            lineHeight: 1,
                            padding: 2,
                          }}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="divider" />

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 4,
                    fontSize: 13,
                    color: 'var(--text-muted)',
                  }}
                >
                  <span>Subtotal</span>
                  <span>${totalAmount}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 16,
                    fontSize: 13,
                    color: 'var(--text-muted)',
                  }}
                >
                  <span>Service fee</span>
                  <span>${(totalAmount * 0.1).toFixed(2)}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 18,
                    fontWeight: 800,
                    fontFamily: 'Space Grotesk',
                    marginBottom: 20,
                  }}
                >
                  <span>Total</span>
                  <span style={{ color: 'var(--accent-purple-light)' }}>
                    ${(totalAmount * 1.1).toFixed(2)}
                  </span>
                </div>
              </>
            )}

            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', display: isAdmin ? 'none' : 'inline-flex' }}
              disabled={selectedSeats.length === 0 || isPolling || checkoutMutation.isPending || isSoldOut || !isSaleStarted}
              onClick={() => checkoutMutation.mutate()}
            >
              {isPolling || checkoutMutation.isPending ? (
                <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Processing...</>
              ) : isSoldOut ? 'Join Waitlist' : !isSaleStarted ? 'Sale Not Started' : selectedSeats.length === 0 ? 'Select Seats First' : `Checkout — $${(totalAmount * 1.1).toFixed(2)}`}
            </button>

            {/* Admin cannot book — show notice */}
            {isAdmin && (
              <div style={{
                padding: '16px 20px',
                background: 'var(--gold-100)',
                border: '1.5px solid var(--border-medium)',
                borderRadius: 14,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>👨‍💼</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--gold-700)', marginBottom: 4 }}>Admin View</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Admins cannot purchase tickets. Use the{' '}
                  <a href="/admin" style={{ color: 'var(--gold-600)', fontWeight: 600 }}>Admin Dashboard</a>
                  {' '}to manage events.
                </div>
              </div>
            )}

            {!isAuthenticated && (
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
                You&apos;ll be asked to log in before checkout
              </p>
            )}

          </div>

          {/* Tier Price Guide */}
          {event?.priceByTier && (
            <div className="card" style={{ marginTop: 16 }}>
              <h4 style={{ fontSize: 13, marginBottom: 12, color: 'var(--text-secondary)' }}>
                Ticket Tiers
              </h4>
              {Object.entries(event.priceByTier as Record<string, number>).map(
                ([tier, price]) => (
                  <div
                    key={tier}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 13,
                      padding: '6px 0',
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                  >
                    <span style={{ color: 'var(--text-secondary)' }}>{tier}</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      ${price}
                    </span>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile bottom checkout bar */}
      {!isAdmin && (
        <div className="mobile-checkout-bar">
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {selectedSeats.length > 0 ? `${selectedSeats.length} seat${selectedSeats.length > 1 ? 's' : ''} selected` : 'No seats selected'}
            </div>
            {selectedSeats.length > 0 && (
              <div style={{ fontWeight: 800, fontSize: 18, fontFamily: 'Space Grotesk', color: 'var(--gold-600)' }}>
                ${(totalAmount * 1.1).toFixed(2)}
              </div>
            )}
          </div>
          <button
            className="btn btn-primary"
            disabled={selectedSeats.length === 0 || isPolling || checkoutMutation.isPending || isSoldOut || !isSaleStarted}
            onClick={() => checkoutMutation.mutate()}
            style={{ minWidth: 140 }}
          >
            {isPolling || checkoutMutation.isPending ? '⚡ Processing...' : isSoldOut ? 'Sold Out' : !isSaleStarted ? 'Not Started' : selectedSeats.length === 0 ? 'Select Seats' : 'Checkout →'}
          </button>
        </div>
      )}

      {/* Waitlist Section for sold-out events */}
      {isSoldOut && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            marginTop: 32,
            padding: 32,
            background:
              'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(37,99,235,0.1))',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-lg)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
          <h3 style={{ marginBottom: 8 }}>This Event is Sold Out</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
            Join the waitlist and we&apos;ll notify you if tickets become
            available.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => {
              eventsApi
                .joinWaitlist(eventId!)
                .then(() => toast.success('Added to waitlist!'))
                .catch(() => toast.error('Failed to join waitlist'));
            }}
          >
            Join Waitlist
          </button>
        </motion.div>
      )}
      </div> {/* /container */}
    </div>
  );
}
