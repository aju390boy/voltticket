import { Router, RequestHandler } from 'express';
import { AuthController } from '../controllers/AuthController';
import passport from '../config/passport';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

const router = Router();

// ── Standard auth ─────────────────────────────────────────────
router.post('/register',  AuthController.register  as unknown as RequestHandler);
router.post('/login',     AuthController.login     as unknown as RequestHandler);
router.post('/refresh',   AuthController.refreshToken as unknown as RequestHandler);
router.post('/logout',    AuthController.logout    as unknown as RequestHandler);

// ── Google OAuth ──────────────────────────────────────────────
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: `${process.env.CLIENT_URL}/login?error=google_failed`, session: false }),
  async (req, res) => {
    try {
      const user = req.user as any;
      if (!user) return res.redirect(`${process.env.CLIENT_URL}/login?error=no_user`);

      // Issue JWT tokens (same as regular login)
      const accessToken = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET!,
        { expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as any }
      );
      const refreshToken = jwt.sign(
        { userId: user._id },
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as any }
      );

      // Save refresh token
      await User.findByIdAndUpdate(user._id, { refreshToken });

      // Redirect to frontend with tokens in URL (frontend will store them)
      const redirectUrl = new URL(`${process.env.CLIENT_URL}/auth/google/callback`);
      redirectUrl.searchParams.set('accessToken', accessToken);
      redirectUrl.searchParams.set('refreshToken', refreshToken);
      redirectUrl.searchParams.set('name', user.name);
      redirectUrl.searchParams.set('email', user.email);
      redirectUrl.searchParams.set('role', user.role);
      redirectUrl.searchParams.set('userId', String(user._id));

      return res.redirect(redirectUrl.toString());
    } catch (err) {
      return res.redirect(`${process.env.CLIENT_URL}/login?error=server`);
    }
  }
);

export default router;
