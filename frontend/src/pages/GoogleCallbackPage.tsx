import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

export function GoogleCallbackPage() {
  const navigate  = useNavigate();
  const { login } = useAuthStore();

  useEffect(() => {
    const params       = new URLSearchParams(window.location.search);
    const accessToken  = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    const name         = params.get('name');
    const email        = params.get('email');
    const role         = params.get('role') as 'user' | 'vip' | 'admin' | 'guest';
    const userId       = params.get('userId');
    const error        = params.get('error');

    if (error || !accessToken || !refreshToken || !userId) {
      toast.error('Google sign-in failed. Please try again.');
      navigate('/login');
      return;
    }

    // Use the same login() function the email login uses
    login(
      { id: userId, name: name ?? 'User', email: email ?? '', role: role ?? 'user' },
      accessToken,
      refreshToken,
    );

    toast.success(`Welcome, ${name ?? 'there'}! ⚡`);

    // Small delay so the store can persist before navigation
    setTimeout(() => {
      navigate(role === 'admin' ? '/admin' : '/', { replace: true });
    }, 100);
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 20,
      background: 'var(--bg-primary)',
    }}>
      <div style={{ fontSize: 48 }}>⚡</div>
      <div className="spinner" />
      <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginTop: 8 }}>
        Signing you in with Google...
      </p>
    </div>
  );
}
