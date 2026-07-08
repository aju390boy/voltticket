import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

function generateTokens(payload: { id: string; role: string; email: string }) {
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as any,
  });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as any,
  });
  return { accessToken, refreshToken };
}

export const AuthController = {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password) {
        res.status(400).json({ error: 'VALIDATION_ERROR', message: 'name, email, and password are required' });
        return;
      }

      const existing = await User.findOne({ email });
      if (existing) {
        res.status(409).json({ error: 'EMAIL_IN_USE', message: 'Email already registered' });
        return;
      }

      const user = await User.create({ name, email, password });
      const tokens = generateTokens({ id: user._id.toString(), role: user.role, email: user.email });

      user.refreshToken = tokens.refreshToken;
      await user.save();

      logger.info(`New user registered: ${email}`);
      res.status(201).json({
        user: { id: user._id, name: user.name, email: user.email, role: user.role },
        ...tokens,
      });
    } catch (err: any) {
      logger.error('Register error:', err);
      res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Registration failed' });
    }
  },

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400).json({ error: 'VALIDATION_ERROR', message: 'email and password are required' });
        return;
      }

      const user = await User.findOne({ email });
      if (!user || !(await user.comparePassword(password))) {
        res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
        return;
      }

      const tokens = generateTokens({ id: user._id.toString(), role: user.role, email: user.email });
      user.refreshToken = tokens.refreshToken;
      await user.save();

      logger.info(`User logged in: ${email}`);
      res.json({
        user: { id: user._id, name: user.name, email: user.email, role: user.role },
        ...tokens,
      });
    } catch (err: any) {
      logger.error('Login error:', err);
      res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Login failed' });
    }
  },

  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        res.status(400).json({ error: 'NO_TOKEN', message: 'Refresh token required' });
        return;
      }

      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as any;
      const user = await User.findById(decoded.id);

      if (!user || user.refreshToken !== refreshToken) {
        res.status(401).json({ error: 'INVALID_TOKEN', message: 'Invalid refresh token' });
        return;
      }

      const tokens = generateTokens({ id: user._id.toString(), role: user.role, email: user.email });
      user.refreshToken = tokens.refreshToken;
      await user.save();

      res.json(tokens);
    } catch {
      res.status(401).json({ error: 'INVALID_TOKEN', message: 'Invalid refresh token' });
    }
  },

  async logout(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;
      if (refreshToken) {
        await User.findOneAndUpdate({ refreshToken }, { $unset: { refreshToken: 1 } });
      }
      res.json({ message: 'Logged out successfully' });
    } catch {
      res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Logout failed' });
    }
  },
};
