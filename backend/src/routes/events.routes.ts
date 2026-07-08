import { Router, RequestHandler } from 'express';
import { EventController, EventAdminController } from '../controllers/EventController';
import { authenticate, requireRole } from '../middleware/auth';

const rh = (fn: any): RequestHandler => fn as unknown as RequestHandler;

const router = Router();

// ── Public routes ─────────────────────────────────────────────
router.get('/',          rh(EventController.list));
router.get('/:id',       rh(EventController.getById));
router.get('/:id/seats', rh(EventController.getSeatMap));
router.post('/:id/waitlist', rh(authenticate), rh((EventController as any).joinWaitlist || ((_req: any, res: any) => res.status(501).json({ error: 'Not implemented' }))));

// ── Admin-only CRUD ───────────────────────────────────────────
router.post('/',      rh(authenticate), rh(requireRole('admin')), rh(EventAdminController.create));
router.put('/:id',    rh(authenticate), rh(requireRole('admin')), rh(EventAdminController.update));
router.delete('/:id', rh(authenticate), rh(requireRole('admin')), rh(EventAdminController.remove));

export default router;
