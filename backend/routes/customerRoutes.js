import express from 'express';
import { createCustomer, getCustomers, getCustomerById, deleteCustomer } from '../controllers/customerController.js';
import { protect, adminAndEmployeeAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
    .post(protect, adminAndEmployeeAuth, createCustomer)
    .get(protect, adminAndEmployeeAuth, getCustomers);

router.route('/:id')
    .get(protect, adminAndEmployeeAuth, getCustomerById)
    .delete(protect, adminAndEmployeeAuth, deleteCustomer);

export default router;
