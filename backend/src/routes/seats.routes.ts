import { Router, RequestHandler } from 'express';
import { SeatController } from '../controllers/SeatController';
import { authenticate } from '../middleware/auth';
import { flashSaleRateLimiter } from '../middleware/rateLimiter';

const rh = (fn: any): RequestHandler => fn as unknown as RequestHandler;

const router = Router();

router.post('/:seatId/reserve',  rh(authenticate), rh(flashSaleRateLimiter), rh(SeatController.reserve));
router.delete('/:seatId/release',rh(authenticate), rh(SeatController.release));

export default router;
