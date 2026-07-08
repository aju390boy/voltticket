import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/');
    setOpen(false);
  };

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const navLinks = [
    { to: '/',       label: 'Events',     show: true },
    { to: '/orders', label: 'My Tickets', show: isAuthenticated },
    { to: '/admin',  label: '⚙ Admin',    show: user?.role === 'admin' },
  ];

  return (
    <nav className="navbar">
      <div className="container">
        <div className="navbar-inner">
          {/* Brand */}
          <Link to="/" className="navbar-brand" onClick={() => setOpen(false)}>
            <span style={{ fontSize: 24 }}>⚡</span>
            <span className="navbar-logo">VoltTicket</span>
          </Link>

          {/* Desktop nav */}
          <div className="navbar-nav" style={{ display: 'flex' }}>
            {navLinks.filter(l => l.show).map(l => (
              <Link key={l.to} to={l.to} className={`nav-link ${isActive(l.to) ? 'active' : ''}`}>
                {l.label}
              </Link>
            ))}

            {isAuthenticated ? (
              <>
                <span style={{
                  fontSize: 13, color: 'var(--text-muted)',
                  padding: '0 8px', borderLeft: '1px solid var(--border-subtle)', marginLeft: 8,
                }}>
                  {user?.name}
                </span>
                {user?.role === 'vip' && <span className="badge badge-vip">⭐ VIP</span>}
                <button className="btn btn-secondary btn-sm" onClick={handleLogout}>Logout</button>
              </>
            ) : (
              <>
                <Link to="/login"    className="btn btn-secondary btn-sm">Login</Link>
                <Link to="/register" className="btn btn-primary btn-sm">Sign Up</Link>
              </>
            )}
          </div>

          {/* Hamburger button (mobile only) */}
          <button
            onClick={() => setOpen(o => !o)}
            aria-label="Toggle menu"
            style={{
              display: 'none',
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 8, color: 'var(--text-primary)',
            }}
            className="hamburger-btn"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {open
                ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>
              }
            </svg>
          </button>
        </div>

        {/* Mobile dropdown */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22 }}
              style={{
                overflow: 'hidden',
                borderTop: '1px solid var(--border-subtle)',
                display: 'none',
              }}
              className="mobile-menu"
            >
              <div style={{ padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {navLinks.filter(l => l.show).map(l => (
                  <Link
                    key={l.to} to={l.to}
                    className={`nav-link ${isActive(l.to) ? 'active' : ''}`}
                    onClick={() => setOpen(false)}
                    style={{ display: 'block', padding: '10px 8px' }}
                  >
                    {l.label}
                  </Link>
                ))}

                <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: 8, paddingTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {isAuthenticated ? (
                    <>
                      <span style={{ fontSize: 13, color: 'var(--text-muted)', flex: 1, alignSelf: 'center' }}>
                        {user?.name}
                        {user?.role === 'vip' && ' ⭐'}
                      </span>
                      <button className="btn btn-secondary btn-sm" onClick={handleLogout}>Logout</button>
                    </>
                  ) : (
                    <>
                      <Link to="/login"    className="btn btn-secondary btn-sm" onClick={() => setOpen(false)} style={{ flex: 1, justifyContent: 'center' }}>Login</Link>
                      <Link to="/register" className="btn btn-primary btn-sm"   onClick={() => setOpen(false)} style={{ flex: 1, justifyContent: 'center' }}>Sign Up</Link>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
