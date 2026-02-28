import Bill from '../models/Bill.js';
import LedgerEntry from '../models/LedgerEntry.js';
import Customer from '../models/Customer.js';
import Inventory from '../models/Inventory.js';

export const getDailyReport = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const bills = await Bill.find({
            date: { $gte: today }
        });

        const totalSales = bills.reduce((acc, bill) => acc + bill.totalPayable, 0);

        // Calculate today's silver weight sold
        let totalSilverWeightSold = 0;
        bills.forEach(bill => {
            bill.items.forEach(item => {
                totalSilverWeightSold += item.fine;
            });
        });

        const newCustomers = await Customer.countDocuments({
            createdAt: { $gte: today }
        });

        res.json({
            date: today,
            billsCount: bills.length,
            totalSales,
            totalSilverWeightSold,
            newCustomers
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export const getOutstandingBalances = async (req, res) => {
    try {
        const customersWithDues = await Customer.find({ currentBalance: { $gt: 0 } }).sort({ currentBalance: -1 });

        const totalOutstanding = customersWithDues.reduce((acc, curr) => acc + curr.currentBalance, 0);

        res.json({
            totalOutstanding,
            customers: customersWithDues
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}
