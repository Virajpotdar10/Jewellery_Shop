import express from 'express';
import { getDailyReport, getOutstandingBalances } from '../controllers/reportController.js';
import { protect, adminAndEmployeeAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/daily', protect, adminAndEmployeeAuth, getDailyReport);
router.get('/outstanding', protect, adminAndEmployeeAuth, getOutstandingBalances);

export default router;
