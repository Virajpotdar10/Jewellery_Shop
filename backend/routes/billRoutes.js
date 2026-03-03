import express from 'express';
import { createBill, getBills, getBillById } from '../controllers/billController.js';
import { protect, adminAndEmployeeAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
    .post(protect, adminAndEmployeeAuth, createBill)
    .get(protect, adminAndEmployeeAuth, getBills);

router.route('/:id')
    .get(protect, adminAndEmployeeAuth, getBillById);

export default router;
