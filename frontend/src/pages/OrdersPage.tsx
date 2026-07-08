import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ordersApi } from '../services/api';

export function OrdersPage() {
  const { id: orderId } = useParams<{ id?: string }>();

  const { data, isLoading } = useQuery({
    queryKey: orderId ? ['order', orderId] : ['my-orders'],
    queryFn: () =>
      orderId
        ? ordersApi.getOne(orderId).then((r) => ({ orders: [r.data.order] }))
        : ordersApi.getMyOrders().then((r) => r.data),
  });

  const orders = data?.orders || [];

  return (
    <div>
      {/* Page header with ticket art */}
      <div style={{
        backgroundImage: 'url(/images/ticket_art.png)',
        backgroundSize: 'cover', backgroundPosition: 'center',
        minHeight: 180, position: 'relative', display: 'flex', alignItems: 'center',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(250,248,240,0.82)', backdropFilter: 'blur(3px)' }} />
        <div className="container" style={{ position: 'relative', zIndex: 1, paddingTop: 40, paddingBottom: 32 }}>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="section-eyebrow">Your Collection</div>
            <h1 style={{ fontSize: 32, marginBottom: 6 }}>🎫 My Tickets</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Your complete ticket purchase history</p>
          </motion.div>
        </div>
      </div>

      <div className="container" style={{ paddingTop: 40, paddingBottom: 80 }}>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
          <div className="spinner" />
        </div>
      ) : orders.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="card"
          style={{ textAlign: 'center', padding: '64px 32px' }}
        >
          <img src="/images/ticket_art.png" style={{ width: 120, height: 120, objectFit: 'contain', marginBottom: 20, opacity: 0.85 }} alt="tickets" />
          <h3 style={{ fontSize: 22, marginBottom: 10 }}>No tickets yet</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: 28, fontSize: 15 }}>
            Browse our events and grab your first tickets before they sell out!
          </p>
          <Link to="/" className="btn btn-primary">Browse Events →</Link>
        </motion.div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {orders.map((order: any, idx: number) => (
            <motion.div
              key={order._id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              className="card"
              style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}
            >
              {/* Left: Event info */}
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4, fontFamily: 'Space Grotesk' }}>
                  {order.eventId?.title || 'Event'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--gold-600)', marginBottom: 10, fontWeight: 600 }}>
                  {order.eventId?.artist}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
                  📍 {order.eventId?.venue}, {order.eventId?.venueCity}
                </div>
                {order.eventId?.date && (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
                    📅{' '}
                    {new Date(order.eventId.date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                )}
                {/* Seat tags */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {order.seatIds?.map((seat: any) => (
                    <span key={seat._id || seat} className="badge badge-upcoming" style={{ fontSize: 10 }}>
                      {seat.label || seat}
                    </span>
                  ))}
                </div>
              </div>

              {/* Right: Amount + status */}
              <div style={{ textAlign: 'right', minWidth: 120 }}>
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 800,
                    fontFamily: 'Space Grotesk',
                    color: 'var(--accent-purple-light)',
                    marginBottom: 8,
                  }}
                >
                  ${order.totalAmount}
                </div>
                <span
                  className={`badge ${
                    order.status === 'confirmed'
                      ? 'badge-live'
                      : order.status === 'failed'
                      ? 'badge-sold'
                      : order.status === 'refunded'
                      ? 'badge-locked'
                      : 'badge-upcoming'
                  }`}
                >
                  {order.status}
                </span>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10 }}>
                  {new Date(order.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: 4 }}>
                  #{String(order._id).slice(-8)}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
      </div> {/* /container */}
    </div>
  );
}
