import { Router, RequestHandler } from 'express';
import { OrderController } from '../controllers/OrderController';
import { authenticate } from '../middleware/auth';

const rh = (fn: any): RequestHandler => fn as unknown as RequestHandler;

const router = Router();

router.get('/',    rh(authenticate), rh(OrderController.getMyOrders));
router.get('/:id', rh(authenticate), rh(OrderController.getOrder));

export default router;
