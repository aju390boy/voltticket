import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import toast from 'react-hot-toast';
import { adminApi, eventsApi } from '../services/api';
import { useAdminSocket } from '../hooks/useSocket';

const PIE_COLORS = ['#C9A84C', '#B8860B', '#059669', '#E8B923', '#DC2626'];

const TOOLTIP_STYLE = {
  background: '#FFFFFF',
  border: '1px solid rgba(201,168,76,0.3)',
  borderRadius: 10,
  color: '#1A1509',
  fontSize: 12,
  boxShadow: '0 4px 16px rgba(139,101,8,0.12)',
};

const EMPTY_FORM = {
  title: '', artist: '', venue: '', venueCity: '', description: '',
  date: '', saleStartTime: '', totalSeats: 1000, imageUrl: '',
  status: 'upcoming',
  priceByTier: { GA: 50, LOWER: 100, UPPER: 80, VIP: 250, BACKSTAGE: 500 },
};

export function AdminDashboard() {
  const [selectedEventId, setSelectedEventId] = useState('');
  const [revenueHistory, setRevenueHistory] = useState<{ time: string; revenue: number; orders: number }[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'events'>('dashboard');
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const adminSocketRef = useAdminSocket();

  const { data: eventsData, refetch: refetchEvents } = useQuery({
    queryKey: ['events'],
    queryFn: () => eventsApi.getAll().then((r) => r.data),
  });

  useEffect(() => {
    if (!selectedEventId && eventsData?.events?.[0]) {
      setSelectedEventId(eventsData.events[0]._id);
    }
  }, [eventsData, selectedEventId]);

  const { data: stats } = useQuery({
    queryKey: ['admin-stats', selectedEventId],
    queryFn: () => adminApi.getStats(selectedEventId).then((r) => r.data),
    enabled: !!selectedEventId,
    refetchInterval: 5000,
  });

  const { data: queueStats } = useQuery({
    queryKey: ['queue-stats'],
    queryFn: () => adminApi.getQueueStats().then((r) => r.data),
    refetchInterval: 2000,
  });

  const { data: auditData } = useQuery({
    queryKey: ['audit-log'],
    queryFn: () => adminApi.getAuditLog().then((r) => r.data),
    refetchInterval: 10000,
  });

  // Real-time metrics
  useEffect(() => {
    const sock = adminSocketRef.current;
    if (!sock) return;
    sock.on('metrics-update', (metrics: any) => {
      setRevenueHistory((prev) => [
        ...prev.slice(-30),
        {
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          revenue: metrics.revenue ?? 0,
          orders: metrics.orders ?? 0,
        },
      ]);
    });
    return () => { sock.off('metrics-update'); };
  }, [adminSocketRef.current]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => eventsApi.create(data),
    onSuccess: () => { toast.success('✅ Event created!'); refetchEvents(); resetForm(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Create failed'),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => eventsApi.update(id, data),
    onSuccess: () => { toast.success('✅ Event updated!'); refetchEvents(); resetForm(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Update failed'),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => eventsApi.delete(id),
    onSuccess: () => { toast.success('🗑️ Event deleted'); refetchEvents(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Delete failed'),
  });

  const resetForm = () => { setForm(EMPTY_FORM); setEditingEvent(null); setShowForm(false); };

  const openEdit = (event: any) => {
    setEditingEvent(event);
    setForm({
      title: event.title,
      artist: event.artist,
      venue: event.venue,
      venueCity: event.venueCity,
      description: event.description || '',
      date: new Date(event.date).toISOString().slice(0, 16),
      saleStartTime: new Date(event.saleStartTime).toISOString().slice(0, 16),
      totalSeats: event.totalSeats,
      imageUrl: event.imageUrl || '',
      status: event.status,
      priceByTier: event.priceByTier,
    });
    setShowForm(true);
    setActiveTab('events');
  };

  const handleSubmit = () => {
    if (!form.title || !form.artist || !form.date) {
      toast.error('Title, Artist, and Date are required');
      return;
    }
    if (editingEvent) {
      updateMutation.mutate({ id: editingEvent._id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const event = stats?.event;
  const queue = queueStats;
  const tierData = event?.revenueByTier
    ? Object.entries(event.revenueByTier).map(([name, value]) => ({ name, value: value as number })).filter((d) => d.value > 0)
    : [];

  const circuitColor = queue?.stripeCircuit === 'closed' ? '#059669' : queue?.stripeCircuit === 'open' ? '#DC2626' : '#E8B923';

  const tabStyle = (tab: string) => ({
    padding: '10px 24px', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600,
    border: 'none', transition: 'all 0.2s',
    background: activeTab === tab ? 'linear-gradient(135deg, #C9A84C, #B8860B)' : 'transparent',
    color: activeTab === tab ? '#FFF8E8' : 'var(--text-secondary)',
    boxShadow: activeTab === tab ? '0 4px 12px rgba(201,168,76,0.35)' : 'none',
  });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Hero header with admin banner */}
      <div style={{
        backgroundImage: 'url(/images/admin_banner.png)',
        backgroundSize: 'cover', backgroundPosition: 'center',
        padding: '48px 0 32px', position: 'relative',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(250,248,240,0.75)', backdropFilter: 'blur(2px)' }} />
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}
          >
            <div>
              <div className="section-eyebrow">Operations Center</div>
              <h1 style={{ fontSize: 32, marginBottom: 4 }}>⚡ Admin Dashboard</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Real-time flash sale management</p>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <button style={tabStyle('dashboard')} onClick={() => setActiveTab('dashboard')}>📊 Dashboard</button>
              <button style={tabStyle('events')} onClick={() => setActiveTab('events')}>🎵 Events</button>
              {activeTab === 'dashboard' && (
                <>
                  <select value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)} className="input" style={{ width: 'auto', minWidth: 200 }}>
                    {eventsData?.events?.map((e: any) => (<option key={e._id} value={e._id}>{e.title}</option>))}
                  </select>
                  <button className="btn btn-secondary btn-sm" onClick={() => adminApi.pauseSale(selectedEventId).then(() => toast.success('Sale paused'))}>⏸ Pause</button>
                  <button className="btn btn-primary btn-sm" onClick={() => adminApi.resumeSale(selectedEventId).then(() => toast.success('Sale resumed'))}>▶ Resume</button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <div className="container" style={{ paddingTop: 32, paddingBottom: 80 }}>
        <AnimatePresence mode="wait">

          {/* ── DASHBOARD TAB ─────────────────────────────────── */}
          {activeTab === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>

              {/* KPI Cards */}
              <div className="grid-4" style={{ marginBottom: 24 }}>
                {[
                  { label: 'Available', value: event?.availableCount?.toLocaleString() ?? '—', color: '#059669', icon: '🟢', sub: 'seats left' },
                  { label: 'Locked',    value: event?.lockedCount?.toLocaleString()    ?? '—', color: '#E8B923', icon: '🔒', sub: 'in checkout' },
                  { label: 'Sold',      value: event?.soldCount?.toLocaleString()      ?? '—', color: '#C9A84C', icon: '🎫', sub: 'tickets issued' },
                  { label: 'Revenue',   value: event ? `$${(event.totalRevenue ?? 0).toLocaleString()}` : '—', color: '#B8860B', icon: '💰', sub: 'total collected' },
                ].map((kpi, i) => (
                  <motion.div key={kpi.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="stat-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div className="stat-value" style={{ color: kpi.color, fontSize: 32 }}>{kpi.value}</div>
                        <div className="stat-label">{kpi.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{kpi.sub}</div>
                      </div>
                      <span style={{ fontSize: 28 }}>{kpi.icon}</span>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Queue Status */}
              {queue && (
                <div className="card" style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                    <h3 style={{ fontSize: 16 }}>🔄 BullMQ Queue Status</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Stripe Circuit:</span>
                      <span style={{ fontWeight: 700, color: circuitColor }}>● {queue.stripeCircuit?.toUpperCase() ?? 'UNKNOWN'}</span>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 16 }}>
                    {Object.entries(queue.checkout || {}).map(([state, count]) => (
                      <div key={state} style={{ textAlign: 'center', padding: '16px 8px', background: 'var(--bg-secondary)', borderRadius: 10 }}>
                        <div style={{ fontSize: 30, fontWeight: 800, fontFamily: 'Space Grotesk', color: state === 'failed' ? '#DC2626' : state === 'active' ? '#059669' : state === 'waiting' ? '#E8B923' : 'var(--text-primary)' }}>{count as number}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>{state}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Charts */}
              <div className="grid-2" style={{ marginBottom: 24 }}>
                <div className="card">
                  <h3 style={{ fontSize: 16, marginBottom: 20 }}>📈 Live Revenue</h3>
                  {revenueHistory.length > 1 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={revenueHistory}>
                        <defs>
                          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#C9A84C" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#C9A84C" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,168,76,0.12)" />
                        <XAxis dataKey="time" stroke="#A0906A" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                        <YAxis stroke="#A0906A" tick={{ fontSize: 9 }} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                        <Area type="monotone" dataKey="revenue" stroke="#C9A84C" fill="url(#revGrad)" strokeWidth={2} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ height: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--text-muted)', fontSize: 13 }}>
                      <div style={{ fontSize: 32 }}>📊</div>
                      Live data will appear here as sales happen
                    </div>
                  )}
                </div>
                <div className="card">
                  <h3 style={{ fontSize: 16, marginBottom: 20 }}>🎯 Revenue by Tier</h3>
                  {tierData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={tierData} cx="50%" cy="50%" innerRadius={48} outerRadius={78} dataKey="value" paddingAngle={3}>
                          {tierData.map((_, i) => (<Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />))}
                        </Pie>
                        <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [`$${v.toLocaleString()}`, 'Revenue']} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No sales yet</div>
                  )}
                </div>
              </div>

              {/* Audit Log */}
              <div className="card">
                <h3 style={{ fontSize: 16, marginBottom: 16 }}>📋 Recent Audit Log</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table className="table">
                    <thead><tr><th>Action</th><th>Type</th><th>Entity ID</th><th>User</th><th>Time</th></tr></thead>
                    <tbody>
                      {auditData?.logs?.slice(0, 20).map((log: any) => (
                        <tr key={log._id}>
                          <td><span className="badge badge-upcoming" style={{ fontSize: 10 }}>{log.action}</span></td>
                          <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{log.entityType}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>{String(log.entityId).slice(-8)}</td>
                          <td style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{log.userId ? String(log.userId).slice(-6) : 'system'}</td>
                          <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(log.createdAt).toLocaleTimeString()}</td>
                        </tr>
                      ))}
                      {(!auditData?.logs || auditData.logs.length === 0) && (
                        <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>No audit events yet</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── EVENTS MANAGEMENT TAB ─────────────────────────── */}
          {activeTab === 'events' && (
            <motion.div key="events" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>

              {/* Add / Edit Form */}
              <AnimatePresence>
                {showForm && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="card" style={{ marginBottom: 24, overflow: 'hidden' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                      <h3 style={{ fontSize: 18 }}>{editingEvent ? '✏️ Edit Event' : '➕ Create New Event'}</h3>
                      <button onClick={resetForm} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
                    </div>
                    <div className="grid-2" style={{ marginBottom: 16 }}>
                      {[
                        { label: 'Event Title *', key: 'title', placeholder: 'e.g. The Resonance World Tour' },
                        { label: 'Artist / Performer *', key: 'artist', placeholder: 'e.g. AURORA' },
                        { label: 'Venue Name', key: 'venue', placeholder: 'e.g. Madison Square Garden' },
                        { label: 'City', key: 'venueCity', placeholder: 'e.g. New York' },
                        { label: 'Event Date & Time *', key: 'date', placeholder: '', type: 'datetime-local' },
                        { label: 'Sale Start Time', key: 'saleStartTime', placeholder: '', type: 'datetime-local' },
                        { label: 'Total Seats', key: 'totalSeats', placeholder: '1000', type: 'number' },
                        { label: 'Image URL', key: 'imageUrl', placeholder: 'https://...' },
                      ].map((f) => (
                        <div key={f.key} className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">{f.label}</label>
                          <input className="input" type={f.type || 'text'} placeholder={f.placeholder}
                            value={form[f.key]} onChange={(e) => setForm((p: any) => ({ ...p, [f.key]: e.target.value }))} />
                        </div>
                      ))}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Description</label>
                      <textarea className="input" rows={3} placeholder="Event description..."
                        value={form.description} onChange={(e) => setForm((p: any) => ({ ...p, description: e.target.value }))}
                        style={{ resize: 'vertical' }} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Status</label>
                      <select className="input" value={form.status} onChange={(e) => setForm((p: any) => ({ ...p, status: e.target.value }))}>
                        {['upcoming', 'live', 'paused', 'ended', 'sold_out'].map((s) => (<option key={s} value={s}>{s}</option>))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Ticket Prices by Tier ($)</label>
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        {Object.keys(form.priceByTier).map((tier) => (
                          <div key={tier} style={{ flex: '1 1 100px' }}>
                            <label className="form-label" style={{ fontSize: 11 }}>{tier}</label>
                            <input className="input" type="number" value={form.priceByTier[tier]}
                              onChange={(e) => setForm((p: any) => ({ ...p, priceByTier: { ...p.priceByTier, [tier]: Number(e.target.value) } }))} />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                      <button className="btn btn-secondary" onClick={resetForm}>Cancel</button>
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        className="btn btn-primary" onClick={handleSubmit}
                        disabled={createMutation.isPending || updateMutation.isPending}
                      >
                        {editingEvent ? '💾 Save Changes' : '✨ Create Event'}
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Event List */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 22 }}>🎵 All Events ({eventsData?.events?.length ?? 0})</h2>
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  className="btn btn-primary" onClick={() => { setEditingEvent(null); setForm(EMPTY_FORM); setShowForm(true); }}
                >
                  ➕ Add New Event
                </motion.button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {eventsData?.events?.map((ev: any, i: number) => (
                  <motion.div key={ev._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="card" style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}
                  >
                    <img
                      src={ev.imageUrl || '/images/event_placeholder.png'}
                      onError={(e) => { (e.target as HTMLImageElement).src = '/images/event_placeholder.png'; }}
                      style={{ width: 80, height: 56, objectFit: 'cover', borderRadius: 10, flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{ev.title}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                        🎤 {ev.artist} · 📍 {ev.venue}, {ev.venueCity} · 📅 {new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span className={`badge badge-${ev.status}`}>{ev.status}</span>
                      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        {ev.availableSeats}/{ev.totalSeats} seats
                      </span>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(ev)}>✏️ Edit</button>
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        className="btn btn-danger btn-sm"
                        onClick={() => {
                          if (window.confirm(`Delete "${ev.title}"? This cannot be undone.`)) {
                            deleteMutation.mutate(ev._id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        🗑️ Delete
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
