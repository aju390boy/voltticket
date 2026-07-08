import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { authApi } from '../services/api';
import { useAuthStore } from '../stores/authStore';

const loginSchema = z.object({
  email:    z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    try {
      const res = await authApi.login(data);
      login(res.data.user, res.data.accessToken, res.data.refreshToken);
      toast.success(`Welcome back, ${res.data.user.name}! ⚡`);
      navigate(res.data.user.role === 'admin' ? '/admin' : '/');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Login failed. Check your credentials.');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      backgroundImage: 'url(/images/login_bg.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      position: 'relative',
    }}>
      {/* Overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(250,248,240,0.55)',
        backdropFilter: 'blur(2px)',
      }} />

      {/* Left: Branding */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '60px 80px',
        position: 'relative', zIndex: 1,
      }} className="hide-mobile">
        <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>⚡</div>
          <h1 style={{ fontSize: 48, lineHeight: 1.1, marginBottom: 20, color: '#1A1509' }}>
            The Premium<br />
            <span style={{
              background: 'linear-gradient(135deg, #C9A84C 0%, #E8B923 50%, #B8860B 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>Ticket Experience</span>
          </h1>
          <p style={{ fontSize: 18, color: '#5C4F2A', lineHeight: 1.7, maxWidth: 400 }}>
            Book your seats instantly. Beat the rush with distributed locks and real-time updates.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 40 }}>
            {[
              { icon: '🔒', text: 'Seats reserved in milliseconds' },
              { icon: '⚡', text: 'Real-time seat map updates' },
              { icon: '🎟️', text: 'E-tickets with QR codes' },
            ].map((f) => (
              <motion.div key={f.text}
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 15, color: '#5C4F2A' }}
              >
                <span style={{ fontSize: 22 }}>{f.icon}</span>
                {f.text}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right: Form */}
      <div style={{
        width: '100%', maxWidth: 480,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 32, position: 'relative', zIndex: 1,
      }}>
        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ width: '100%' }}
        >
          <div style={{
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(24px)',
            borderRadius: 24,
            padding: 40,
            boxShadow: '0 8px 48px rgba(139,101,8,0.18), 0 2px 12px rgba(139,101,8,0.08)',
            border: '1px solid rgba(201,168,76,0.25)',
          }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <h2 style={{ fontSize: 26, marginBottom: 6 }}>Welcome back</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Sign in to your VoltTicket account</p>
            </div>

            {/* Google Sign In */}
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => authApi.googleLogin()}
              style={{
                width: '100%', padding: '13px 20px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                background: '#FFFFFF', border: '1.5px solid rgba(201,168,76,0.4)',
                borderRadius: 12, cursor: 'pointer', fontSize: 15, fontWeight: 600,
                color: '#1A1509', marginBottom: 24,
                boxShadow: '0 2px 8px rgba(139,101,8,0.08)',
                transition: 'all 0.2s ease',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </motion.button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>or sign in with email</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="form-group">
                <label className="form-label">Email address</label>
                <input className="input" type="email" placeholder="you@example.com" {...register('email')} />
                {errors.email && <div className="form-error">{errors.email.message}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="input" type="password" placeholder="••••••••" {...register('password')} />
                {errors.password && <div className="form-error">{errors.password.message}</div>}
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                type="submit"
                className="btn btn-primary btn-lg"
                style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
                disabled={isSubmitting}
              >
                {isSubmitting ? '⏳ Signing in...' : 'Sign In →'}
              </motion.button>
            </form>

            <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--text-muted)' }}>
              Don't have an account?{' '}
              <Link to="/register" style={{ color: 'var(--gold-600)', textDecoration: 'none', fontWeight: 600 }}>
                Create one free →
              </Link>
            </p>

            {/* Demo credentials */}
            <div style={{
              marginTop: 24, padding: '14px 18px',
              background: 'var(--gold-100)', borderRadius: 12,
              border: '1px solid var(--border-subtle)',
            }}>
              <div style={{ fontSize: 11, color: 'var(--gold-700)', marginBottom: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                🔑 Demo Accounts
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 2, fontFamily: 'monospace' }}>
                <div>👤 user@volttticket.com / User123!</div>
                <div>⭐ vip@volttticket.com / Vip123!</div>
                <div>🔧 admin@volttticket.com / Admin123!</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <style>{`.hide-mobile { display: flex; } @media(max-width:768px){.hide-mobile{display:none;}}`}</style>
    </div>
  );
}
