import express from 'express';
import { getLatestSilverRate, setManualSilverRate, getSilverRateHistory } from '../controllers/silverRateController.js';
import { protect, adminAndEmployeeAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
    .get(protect, adminAndEmployeeAuth, getLatestSilverRate)
    .post(protect, adminAndEmployeeAuth, setManualSilverRate);

router.route('/history')
    .get(protect, adminAndEmployeeAuth, getSilverRateHistory);

export default router;
