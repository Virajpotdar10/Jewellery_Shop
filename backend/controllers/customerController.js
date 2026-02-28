import Customer from '../models/Customer.js';
import LedgerEntry from '../models/LedgerEntry.js';

export const createCustomer = async (req, res) => {
    try {
        const { name, mobile, address, currentBalance } = req.body;

        const customer = new Customer({
            name,
            mobile,
            address,
            currentBalance: currentBalance || 0
        });

        const createdCustomer = await customer.save();

        if (currentBalance && currentBalance > 0) {
            const ledgerEntry = new LedgerEntry({
                customerId: createdCustomer._id,
                description: 'Opening Balance',
                debit: currentBalance,
                balance: currentBalance
            });
            await ledgerEntry.save();
        }

        res.status(201).json(createdCustomer);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getCustomers = async (req, res) => {
    try {
        const keyword = req.query.keyword
            ? {
                $or: [
                    { name: { $regex: req.query.keyword, $options: 'i' } },
                    { mobile: { $regex: req.query.keyword, $options: 'i' } }
                ]
            }
            : {};

        const customers = await Customer.find({ ...keyword }).sort({ createdAt: -1 });
        res.json(customers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getCustomerById = async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id);
        if (customer) {
            res.json(customer);
        } else {
            res.status(404).json({ message: 'Customer not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteCustomer = async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id);
        if (!customer) return res.status(404).json({ message: 'Customer not found' });
        // Delete all related ledger entries
        await LedgerEntry.deleteMany({ customerId: req.params.id });
        await customer.deleteOne();
        res.json({ message: 'Customer deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
