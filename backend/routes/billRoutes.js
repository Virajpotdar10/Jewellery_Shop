import express from 'express';
import { createBill, getBills } from '../controllers/billController.js';
import { protect, adminAndEmployeeAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
    .post(protect, adminAndEmployeeAuth, createBill)
    .get(protect, adminAndEmployeeAuth, getBills);

export default router;
