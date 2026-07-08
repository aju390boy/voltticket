import { Router, RequestHandler } from 'express';
import { AdminController } from '../controllers/AdminController';
import { authenticate, authorize } from '../middleware/auth';

const rh = (fn: any): RequestHandler => fn as unknown as RequestHandler;

const router = Router();
router.use(rh(authenticate), rh(authorize('admin')));

router.get('/stats',                  rh(AdminController.getStats));
router.get('/queue-stats',            rh(AdminController.getQueueStats));
router.get('/audit-log',              rh(AdminController.getAuditLog));
router.post('/events/:eventId/pause', rh(AdminController.pauseSale));
router.post('/events/:eventId/resume',rh(AdminController.resumeSale));
router.post('/orders/:orderId/refund',rh(AdminController.refundOrder));
router.post('/events',                rh(AdminController.createEvent));

export default router;
