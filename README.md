# ⚡ VoltTicket — High-Concurrency Flash Sale Ticket Engine

> A senior-engineer-grade distributed ticket system handling **50,000 concurrent users** with Redis locks, BullMQ queues, MongoDB transactions, and real-time Socket.IO updates.

---

## 🚀 Quick Start (Without Docker)

> **Prerequisites**: Node.js 18+, Redis (running locally), MongoDB (running locally)

### 1. Start Redis & MongoDB
Make sure Redis is running on `localhost:6379` and MongoDB on `localhost:27017`.

### 2. Backend
```bash
cd backend
npm install       # Already done
npm run seed      # Seed DB with 1 event + 1000 seats + 3 demo users
npm run dev       # Start API server on http://localhost:3001
```

### 3. Workers (separate terminal)
```bash
cd backend
npm run worker    # Start BullMQ workers (checkout, email, seat-release)
```

### 4. Frontend (separate terminal)
```bash
cd frontend
npm install       # Already done
npm run dev       # Start UI on http://localhost:5173
```

---

## 🐳 Quick Start (With Docker)

```bash
docker compose up --build
```

Services will be available at:
- **App**: http://localhost (via nginx)
- **API**: http://localhost:3001
- **Bull Board** (queue dashboard): http://localhost:3001/admin/queues
- **Mongo Express**: http://localhost:8081 (admin/admin123)

After containers are up, seed the database:
```bash
docker compose exec api npm run seed
```

---

## 🔑 Demo Accounts

| Role  | Email | Password |
|-------|-------|----------|
| User  | user@volttticket.com | User123! |
| VIP   | vip@volttticket.com | Vip123! |
| Admin | admin@volttticket.com | Admin123! |

---

## 🏗️ Architecture

```
Browser ──► Nginx ──► Express API (3001)
                          │
                    ┌─────┴─────┐
                 Redis        MongoDB
                 (locks)      (data)
                    │
                 BullMQ Queues
                 ├── checkout (10 concurrent)
                 ├── email    (20 concurrent)
                 └── seat-release (50 concurrent)
```

### 7-Layer Defense for Flash Sales
1. **CDN** — Static asset caching (nginx)
2. **Auth** — JWT + refresh tokens
3. **Rate Limiter** — Redis sliding window (10 req/10s per user)
4. **Backpressure Guard** — Rejects requests when queue > 5000 jobs
5. **Inventory Lock** — Redis atomic decrement (prevents overselling)
6. **Seat Lock** — `SET NX PX` Lua script (5-min hold)
7. **Checkout Saga** — Compensating transactions (auto-rollback on failure)

---

## 🔧 Environment Setup

### SendGrid (Email)
1. Create free account at [sendgrid.com](https://sendgrid.com)
2. Get API key → Settings → API Keys
3. Update `backend/.env`:
   ```env
   SENDGRID_API_KEY=your_real_key_here
   FROM_EMAIL=tickets@yourdomain.com
   ```

### Stripe (Payments)
Currently using **stripe-mock** (free, no account needed).  
To use real Stripe:
1. Create account at [stripe.com](https://stripe.com)
2. Get test key from Dashboard → Developers → API Keys
3. Update `backend/.env`:
   ```env
   STRIPE_SECRET_KEY=sk_test_your_real_key
   # Remove STRIPE_MOCK_HOST line
   ```

---

## 🎯 Key Engineering Concepts Demonstrated

| Concept | Implementation |
|---------|---------------|
| Distributed Locks | Redis `SET NX PX` + Lua release script |
| Message Queues | BullMQ with 3 specialized queues + DLQ |
| Race Condition Prevention | Fencing tokens + atomic MongoDB updates |
| Circuit Breaker | Opossum wrapping Stripe SDK |
| Real-time Updates | Socket.IO with Redis pub/sub adapter |
| Idempotency | UUID idempotency keys on all Stripe calls |
| Sliding Window Rate Limit | Redis Lua script (10 requests / 10 seconds) |
| Aggregation Pipeline | MongoDB `$addFields` + `$reduce` + `$lookup` |
| Booking Saga | Compensating transactions for failure rollback |

---

## 📁 Project Structure

```
mini project 2/
├── docker-compose.yml      # 7-service orchestration
├── nginx/nginx.conf        # Reverse proxy + WebSocket sticky sessions
├── backend/
│   └── src/
│       ├── app.ts          # Express entry point
│       ├── config/         # Redis, MongoDB, Stripe, BullMQ
│       ├── models/         # Mongoose schemas
│       ├── services/       # CheckoutService, SeatLockService, etc.
│       ├── workers/        # BullMQ worker processes
│       ├── controllers/    # Route handlers
│       ├── routes/         # Express routers
│       ├── middleware/      # Auth, rate limiter, backpressure
│       ├── sockets/        # Socket.IO handlers
│       └── scripts/seed.ts # Database seeder
└── frontend/
    └── src/
        ├── App.tsx          # Router + providers
        ├── pages/           # HomePage, EventPage, Admin, Login, etc.
        ├── components/      # SeatMap (SVG), Navbar, Timers
        ├── stores/          # Zustand (auth, seats)
        ├── hooks/           # useSocket (Socket.IO)
        └── services/api.ts  # Axios client
```
