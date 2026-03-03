import express from 'express';
import { addPayment, getPaymentsByCustomer } from '../controllers/paymentController.js';
import { protect, adminAndEmployeeAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
    .post(protect, adminAndEmployeeAuth, addPayment);

router.route('/:customerId')
    .get(protect, adminAndEmployeeAuth, getPaymentsByCustomer);

export default router;
