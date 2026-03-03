import express from 'express';
import {
    addSilverAdjustment,
    getAdjustmentsByBill,
    getAdjustmentsByCustomer,
} from '../controllers/silverAdjustmentController.js';
import { protect, adminAndEmployeeAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
    .post(protect, adminAndEmployeeAuth, addSilverAdjustment);

router.route('/bill/:billId')
    .get(protect, adminAndEmployeeAuth, getAdjustmentsByBill);

router.route('/customer/:customerId')
    .get(protect, adminAndEmployeeAuth, getAdjustmentsByCustomer);

export default router;
