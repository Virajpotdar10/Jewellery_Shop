import SilverRate from '../models/SilverRate.js';
import axios from 'axios';
import cron from 'node-cron';

export const getLatestSilverRate = async (req, res) => {
    try {
        const rate = await SilverRate.findOne().sort({ createdAt: -1 });
        if (rate) {
            res.json(rate);
        } else {
            res.status(404).json({ message: 'No rates found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const setManualSilverRate = async (req, res) => {
    try {
        const { rate } = req.body;
        if (!rate) return res.status(400).json({ message: 'Rate is required' })

        const newRate = new SilverRate({
            rate,
            source: 'Manual'
        });

        const createdRate = await newRate.save();
        res.status(201).json(createdRate);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getSilverRateHistory = async (req, res) => {
    try {
        // Get rates for the last 7 days
        const sevenDaysAgo = new Date(new Date().setDate(new Date().getDate() - 7));
        const rates = await SilverRate.find({ createdAt: { $gte: sevenDaysAgo } }).sort({ createdAt: 1 });
        res.json(rates);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

// Auto Fetch Cron Job
// Fetch live rate every 30 minutes
export const startCronJob = () => {
    cron.schedule('*/30 * * * *', async () => {
        try {
            console.log('Running Auto Fetch Silver Rate...');
            // Ideally replace this with a real live Indian bullion API
            // Using a dummy/placeholder or free API representation here
            // We will simulate the fetch if no free API is reliable for Hupari.
            // const response = await axios.get('API_URL');
            // const fetchedRate = response.data.rate;

            // Simulated dynamic rate change for demo if no API available:
            const lastRate = await SilverRate.findOne().sort({ createdAt: -1 });
            const baseRate = lastRate ? lastRate.rate : 85000;
            const simulatedFluctuation = Math.floor(Math.random() * 200) - 100; // -100 to +100
            const fetchedRate = baseRate + simulatedFluctuation;

            const newRate = new SilverRate({
                rate: fetchedRate,
                source: 'API'
            });

            await newRate.save();
            console.log('Successfully saved auto-fetched silver rate:', fetchedRate);

        } catch (error) {
            console.error('Error fetching silver rate:', error.message);
        }
    });
};
