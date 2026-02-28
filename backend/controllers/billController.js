import Bill from '../models/Bill.js';
import Customer from '../models/Customer.js';
import LedgerEntry from '../models/LedgerEntry.js';
import Inventory from '../models/Inventory.js';

export const createBill = async (req, res) => {
    try {
        const {
            customerId,
            items,
            subtotal,
            totalMakingCharges,
            previousBalance,
            totalPayable,
            paidAmount,
            remainingBalance
        } = req.body;

        // Auto increment logic for billNumber
        const lastBill = await Bill.findOne().sort({ createdAt: -1 });
        let nextBillNumber = lastBill ? lastBill.billNumber + 1 : 1;

        const date = new Date();

        const newBill = new Bill({
            billNumber: nextBillNumber,
            customerId,
            items,
            subtotal,
            totalMakingCharges,
            previousBalance,
            totalPayable,
            paidAmount,
            remainingBalance,
            date
        });

        const createdBill = await newBill.save();

        // Update Customer Balance
        await Customer.findByIdAndUpdate(customerId, {
            currentBalance: remainingBalance
        });

        // Add to Ledger History
        // The total value of the goods given to the customer is the Total Payable - Previous Balance
        const billAmount = totalPayable - previousBalance;

        const ledgerEntry = new LedgerEntry({
            customerId,
            description: `Bill #${nextBillNumber}`,
            debit: billAmount, // Adding to what they owe
            credit: paidAmount, // What they paid right now
            balance: remainingBalance,
            refId: createdBill._id
        });

        await ledgerEntry.save();

        // Update Inventory System (deduct silver out)
        for (let item of items) {
            // Need to calculate pure Fine silver given out
            const inventory = new Inventory({
                itemName: item.description,
                weightOut: item.fine,
                currentStock: -item.fine // In a real app we fetch last stock and subtract
            });
            await inventory.save();
        }

        res.status(201).json(createdBill);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getBills = async (req, res) => {
    try {
        const bills = await Bill.find({}).populate('customerId', 'name mobile').sort({ date: -1 });
        res.json(bills);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
