import express from 'express';
import { addSilverPayment, getSilverPaymentsByCustomer } from '../controllers/silverPaymentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, addSilverPayment);
router.get('/:customerId', protect, getSilverPaymentsByCustomer);

export default router;
