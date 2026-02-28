import express from 'express';
import { addPayment } from '../controllers/paymentController.js';
import { protect, adminAndEmployeeAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
    .post(protect, adminAndEmployeeAuth, addPayment);

export default router;
