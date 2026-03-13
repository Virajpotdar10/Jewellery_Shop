import LedgerEntry from '../models/LedgerEntry.js';
import Customer from '../models/Customer.js';

export const getCustomerLedger = async (req, res) => {
    try {
        const entries = await LedgerEntry.find({ customerId: req.params.customerId })
            .sort({ date: 1, createdAt: 1 });
        const customer = await Customer.findById(req.params.customerId)
            .select('name mobile currentBalance fineBalance address');
        res.json({ customer, entries });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const addLedgerEntry = async (req, res) => {
    try {
        const { customerId, description, credit, debit, entryType } = req.body;

        let customer = await Customer.findById(customerId);
        if (!customer) return res.status(404).json({ message: 'Customer not found' });

        const newBalance = parseFloat(
            (customer.currentBalance + (debit || 0) - (credit || 0)).toFixed(2)
        );

        const entry = new LedgerEntry({
            customerId,
            entryType: entryType || (credit > 0 ? 'MANUAL_CREDIT' : 'MANUAL_DEBIT'),
            description,
            credit: credit || 0,
            debit: debit || 0,
            balance: newBalance,
        });

        await entry.save();

        customer.currentBalance = newBalance;
        await customer.save();

        res.status(201).json(entry);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteLedgerEntry = async (req, res) => {
    try {
        const { id } = req.params;
        const entry = await LedgerEntry.findById(id);
        if (!entry) return res.status(404).json({ message: 'Entry not found' });

        const customer = await Customer.findById(entry.customerId);
        if (customer) {
            // Reverse the effect of this entry on the customer's balance
            // If it was a debit (charge), we subtract it. If credit (payment), we add it back.
            const newBalance = parseFloat(
                (customer.currentBalance - (entry.debit || 0) + (entry.credit || 0)).toFixed(2)
            );
            customer.currentBalance = newBalance;
            await customer.save();
        }

        // Also delete the underlying document if it was linked (optional/complex, simple delete for now)
        await LedgerEntry.findByIdAndDelete(id);

        res.json({ message: 'Entry deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
