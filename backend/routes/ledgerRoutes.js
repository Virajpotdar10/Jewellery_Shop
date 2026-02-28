import express from 'express';
import { getCustomerLedger, addLedgerEntry } from '../controllers/ledgerController.js';
import { protect, adminAndEmployeeAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/:customerId')
    .get(protect, adminAndEmployeeAuth, getCustomerLedger)
    .post(protect, adminAndEmployeeAuth, addLedgerEntry);

export default router;
