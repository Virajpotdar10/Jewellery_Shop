import express from 'express';
import { getInventory, addStock } from '../controllers/inventoryController.js';
import { protect, adminAndEmployeeAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
    .get(protect, adminAndEmployeeAuth, getInventory)
    .post(protect, adminAndEmployeeAuth, addStock);

export default router;
