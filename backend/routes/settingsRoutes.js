import express from 'express';
import { getSetting, updateSetting } from '../controllers/settingsController.js';
import { protect, adminAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/:key', protect, getSetting);
router.post('/', protect, adminAuth, updateSetting);

export default router;
