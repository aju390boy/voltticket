import { Router, RequestHandler } from 'express';
import { CheckoutController } from '../controllers/CheckoutController';
import { authenticate } from '../middleware/auth';
import { backpressureGuard } from '../middleware/backpressure';

const rh = (fn: any): RequestHandler => fn as unknown as RequestHandler;

const router = Router();

router.post('/',         rh(authenticate), rh(backpressureGuard), rh(CheckoutController.initiate));
router.get('/job/:jobId',rh(authenticate), rh(CheckoutController.getJobStatus));

export default router;
