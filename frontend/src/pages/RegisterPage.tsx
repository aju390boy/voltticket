import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { authApi } from '../services/api';
import { useAuthStore } from '../stores/authStore';

const schema = z
  .object({
    name:            z.string().min(2, 'Name must be at least 2 characters'),
    email:           z.string().email('Invalid email address'),
    password:        z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path:    ['confirmPassword'],
  });

type RegisterForm = z.infer<typeof schema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<RegisterForm>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: RegisterForm) => {
    try {
      const { confirmPassword, ...payload } = data;
      const res = await authApi.register(payload);
      login(res.data.user, res.data.accessToken, res.data.refreshToken);
      toast.success('Account created! Welcome to VoltTicket ⚡');
      navigate('/');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Registration failed. Please try again.');
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
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(250,248,240,0.55)', backdropFilter: 'blur(2px)' }} />

      {/* Centered form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, position: 'relative', zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ width: '100%', maxWidth: 460 }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              style={{ fontSize: 48, display: 'inline-block', marginBottom: 12 }}
            >⚡</motion.div>
            <h1 style={{ fontSize: 28, marginBottom: 6 }}>Create your account</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Join 2M+ fans on VoltTicket</p>
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(24px)',
            borderRadius: 24,
            padding: 36,
            boxShadow: '0 8px 48px rgba(139,101,8,0.18), 0 2px 12px rgba(139,101,8,0.08)',
            border: '1px solid rgba(201,168,76,0.25)',
          }}>
            {/* Google Sign Up */}
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
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign up with Google
            </motion.button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>or register with email</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="input" placeholder="John Doe" {...register('name')} />
                {errors.name && <div className="form-error">{errors.name.message}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Email address</label>
                <input className="input" type="email" placeholder="you@example.com" {...register('email')} />
                {errors.email && <div className="form-error">{errors.email.message}</div>}
              </div>
              <div className="grid-2" style={{ gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input className="input" type="password" placeholder="Min 6 characters" {...register('password')} />
                  {errors.password && <div className="form-error">{errors.password.message}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm Password</label>
                  <input className="input" type="password" placeholder="Repeat password" {...register('confirmPassword')} />
                  {errors.confirmPassword && <div className="form-error">{errors.confirmPassword.message}</div>}
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                type="submit"
                className="btn btn-primary btn-lg"
                style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
                disabled={isSubmitting}
              >
                {isSubmitting ? '⏳ Creating account...' : '✨ Create Account →'}
              </motion.button>
            </form>

            <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text-muted)' }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: 'var(--gold-600)', textDecoration: 'none', fontWeight: 600 }}>
                Sign in →
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
