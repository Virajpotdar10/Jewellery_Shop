import Payment from '../models/Payment.js';
import Customer from '../models/Customer.js';
import LedgerEntry from '../models/LedgerEntry.js';

export const addPayment = async (req, res) => {
    try {
        const { customerId, amount, method } = req.body;

        const payment = new Payment({
            customerId,
            amount,
            method
        });

        const createdPayment = await payment.save();

        let customer = await Customer.findById(customerId);
        let newBalance = customer.currentBalance - amount;

        const ledgerEntry = new LedgerEntry({
            customerId,
            description: `Payment Received - ${method}`,
            credit: amount,
            balance: newBalance,
            refId: createdPayment._id
        });

        await ledgerEntry.save();

        customer.currentBalance = newBalance;
        await customer.save();

        res.status(201).json(createdPayment);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
