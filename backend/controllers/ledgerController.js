import LedgerEntry from '../models/LedgerEntry.js';
import Customer from '../models/Customer.js';

export const getCustomerLedger = async (req, res) => {
    try {
        const entries = await LedgerEntry.find({ customerId: req.params.customerId }).sort({ date: 1 });
        const customer = await Customer.findById(req.params.customerId).select('name mobile currentBalance');
        res.json({ customer, entries });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const addLedgerEntry = async (req, res) => {
    try {
        const { customerId, description, credit, debit } = req.body;

        let customer = await Customer.findById(customerId);
        if (!customer) return res.status(404).json({ message: 'Customer not found' });

        // Let's assume balance is what Customer owes the shop
        let newBalance = customer.currentBalance + (debit || 0) - (credit || 0);

        const entry = new LedgerEntry({
            customerId,
            description,
            credit: credit || 0,
            debit: debit || 0,
            balance: newBalance
        });

        await entry.save();

        // Update Customer currentBalance
        customer.currentBalance = newBalance;
        await customer.save();

        res.status(201).json(entry);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
