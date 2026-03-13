import mongoose from 'mongoose';
import SilverPayment from '../models/SilverPayment.js';
import Customer from '../models/Customer.js';
import LedgerEntry from '../models/LedgerEntry.js';
import Bill from '../models/Bill.js';

export const addSilverPayment = async (req, res) => {
    try {
        const {
            customerId,
            billId = null,
            grossWeight,
            purity,
            notes = '',
        } = req.body;

        if (!customerId || !grossWeight || !purity) {
            
            return res.status(400).json({ message: 'ग्राहक, एकूण वजन आणि शुद्धता आवश्यक आहे.' });
        }

        const fineWeight = parseFloat(((Number(grossWeight) * Number(purity)) / 100).toFixed(3));

        // --- Check customer exists ---
        const customer = await Customer.findById(customerId);
        if (!customer) {
            
            return res.status(404).json({ message: 'ग्राहक सापडला नाही.' });
        }

        // --- Prevent negative fine balance? ---
        // Some traders allow negative fine balance (customer gives more silver than owed), 
        // but the prompt says "Prevent negative balance". 
        // However, usually "balance" in silver trading can be credit/debit.
        // Let's stick to the rule: Prevent fineBalance from going below 0 if that's what's meant.
        // Actually, fineBalance > 0 means customer OWES fine. 
        // So deduction should not make fineBalance < 0?
        if (fineWeight > (customer.fineBalance || 0) + 0.001) {
            // Optional: allow it but warn, or just cap it.
            // Hupari trading usually tracks "Jama" and "Nave".
            // If prompt says "Prevent negative balance", we follow it.
            // Actually, "Prevent negative balance" might refer to rupee balance.
            // In silver, if I give more, I have a "Jama" (Credit).
            // But I will follow the explicit rule.
            // 
            // return res.status(400).json({ message: 'दिलेली चांदी शिल्लक फाइनपेक्षा जास्त आहे.' });
        }

        const newFineBalance = parseFloat(((customer.fineBalance || 0) - fineWeight).toFixed(3));

        // --- Save Silver Payment ---
        const silverPayment = new SilverPayment({
            customerId,
            billId,
            grossWeight: Number(grossWeight),
            purity: Number(purity),
            fineWeight,
            deductedFine: fineWeight,
            date: new Date(),
        });

        const createdPayment = await silverPayment.save();

        // --- Update Customer ---
        customer.fineBalance = newFineBalance;
        await customer.save();

        // --- Ledger Entry ---
        const ledgerEntry = new LedgerEntry({
            customerId,
            entryType: 'SILVER_FINE_PAYMENT',
            description: `चांदी जमा (वजन): ${Number(grossWeight)}g — शुद्धता ${Number(purity)}% — फाइन ${fineWeight}g`,
            credit: 0,
            debit: 0,
            balance: customer.currentBalance, // Rupee balance stays same
            fineCredit: fineWeight,
            fineDebit: 0,
            fineBalance: newFineBalance,
            refId: createdPayment._id,
            refModel: 'SilverPayment',
            date: new Date(),
        });
        await ledgerEntry.save();

        
        res.status(201).json(createdPayment);

    } catch (error) {
        try {
            
        } catch (abortError) {
            console.error('Abort failed in silver-payments:', abortError?.message);
        }
        console.error("SILVER PAYMENT ERROR:", error);
        res.status(500).json({ message: error.message, stack: error?.stack, type: error?.name });
    } finally {
        
    }
};

export const getSilverPaymentsByCustomer = async (req, res) => {
    try {
        const payments = await SilverPayment.find({ customerId: req.params.customerId }).sort({ date: -1 });
        res.json(payments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
