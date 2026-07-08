import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

export const api = axios.create({
  baseURL: `${API_BASE}/api`,
  withCredentials: true,
});

// Inject token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401 && !err.config._retry) {
      err.config._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_BASE}/api/auth/refresh`, { refreshToken });
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
          err.config.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(err.config);
        } catch {
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  register:    (data: Record<string, unknown>) => api.post('/auth/register', data),
  login:       (data: Record<string, unknown>) => api.post('/auth/login', data),
  logout:      (refreshToken: string)          => api.post('/auth/logout', { refreshToken }),
  refresh:     (refreshToken: string)          => api.post('/auth/refresh', { refreshToken }),
  googleLogin: () => { window.location.href = `${API_BASE}/api/auth/google`; },
};

export const eventsApi = {
  getAll:      ()                    => api.get('/events'),
  getOne:      (id: string)          => api.get(`/events/${id}`),
  getSeats:    (id: string)          => api.get(`/events/${id}/seats`),
  joinWaitlist:(id: string, tier?: string) => api.post(`/events/${id}/waitlist`, { tier }),
  // Admin CRUD
  create:      (data: Record<string, unknown>) => api.post('/events', data),
  update:      (id: string, data: Record<string, unknown>) => api.put(`/events/${id}`, data),
  delete:      (id: string)          => api.delete(`/events/${id}`),
};

export const seatsApi = {
  reserve: (seatId: string, eventId: string) =>
    api.post(`/seats/${seatId}/reserve`, { eventId }),
  release: (seatId: string, eventId: string, token: string) =>
    api.delete(`/seats/${seatId}/release`, { data: { eventId, token } }),
};

export const checkoutApi = {
  initiate:     (data: Record<string, unknown>) => api.post('/checkout', data),
  getJobStatus: (jobId: string)                 => api.get(`/checkout/job/${jobId}`),
};

export const ordersApi = {
  getMyOrders: () => api.get('/orders'),
  getOne:      (id: string) => api.get(`/orders/${id}`),
};

export const adminApi = {
  getStats:     (eventId: string) => api.get(`/admin/stats?eventId=${eventId}`),
  getQueueStats:()                => api.get('/admin/queue-stats'),
  getAuditLog:  (page = 1)       => api.get(`/admin/audit-log?page=${page}`),
  pauseSale:    (eventId: string) => api.post(`/admin/events/${eventId}/pause`),
  resumeSale:   (eventId: string) => api.post(`/admin/events/${eventId}/resume`),
  refundOrder:  (orderId: string) => api.post(`/admin/orders/${orderId}/refund`),
  getEvents:    ()                => api.get('/admin/events'),
};
