import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jewellery-shop-db';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));

import authRoutes from './routes/authRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import silverRateRoutes from './routes/silverRateRoutes.js';
import billRoutes from './routes/billRoutes.js';
import ledgerRoutes from './routes/ledgerRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import reportRoutes from './routes/reportRoutes.js';

import { startCronJob } from './controllers/silverRateController.js';

app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/silver-rates', silverRateRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/reports', reportRoutes);

// Start Auto Fetch Job
startCronJob();

app.get('/', (req, res) => {
    res.send('Jewellery Shop Management API is running...');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
