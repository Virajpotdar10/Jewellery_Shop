import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import compression from 'compression';

dotenv.config();

import settingsRoutes from './routes/settingsRoutes.js';

const app = express();

app.use(cors());
app.use(compression());
app.use(express.json());

app.use('/api/settings', settingsRoutes);

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jewellery-shop-db';

mongoose.connect(MONGODB_URI, { maxPoolSize: 50 })
    .then(() => console.log('Connected to MongoDB (PoolSize: 50)'))
    .catch((err) => console.error('MongoDB connection error:', err));

import authRoutes from './routes/authRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import silverRateRoutes from './routes/silverRateRoutes.js';
import billRoutes from './routes/billRoutes.js';
import ledgerRoutes from './routes/ledgerRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import silverAdjustmentRoutes from './routes/silverAdjustmentRoutes.js';
import silverPaymentRoutes from './routes/silverPaymentRoutes.js';

import { startCronJob } from './controllers/silverRateController.js';

app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/silver-rates', silverRateRoutes);
app.use('/api/silver-adjustments', silverAdjustmentRoutes);
app.use('/api/silver-payments', silverPaymentRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/payments', paymentRoutes);
// app.use('/api/inventory', inventoryRoutes);
app.use('/api/reports', reportRoutes);


// Start Auto Fetch Job
startCronJob();

app.get('/', (req, res) => {
    res.send('Jewellery Shop Management API is running...');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
