import mongoose from 'mongoose';
import Payment from '../models/Payment.js';
import Customer from '../models/Customer.js';
import LedgerEntry from '../models/LedgerEntry.js';
import Bill from '../models/Bill.js';

/**
 * Helper: compute silver fine weight & monetary value
 */
const calcSilver = (grossWeight = 0, purity = 0, silverRate = 0) => {
    const fineWeight = parseFloat(((grossWeight * purity) / 100).toFixed(4));
    const silverValue = parseFloat((fineWeight * silverRate).toFixed(2));
    return { fineWeight, silverValue };
};

/**
 * POST /api/payments
 * Supports: Cash | UPI | Bank | Silver | Mixed
 * Body: { customerId, billId?, cashAmount, upiAmount, bankAmount,
 *         silverGrossWeight, silverPurity, silverRate, notes }
 */
export const addPayment = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const {
            customerId,
            billId = null,
            cashAmount = 0,
            upiAmount = 0,
            bankAmount = 0,
            // Silver (all optional — if zero, no silver payment)
            silverGrossWeight = 0,
            silverPurity = 0,
            silverRate = 0,
            notes = '',
        } = req.body;

        if (!customerId) {
            await session.abortTransaction();
            return res.status(400).json({ message: 'customerId आवश्यक आहे.' });
        }

        // --- Silver calc ---
        const { fineWeight: silverFineWeight, silverValue } = calcSilver(
            Number(silverGrossWeight), Number(silverPurity), Number(silverRate)
        );

        const totalAmount = parseFloat(
            (Number(cashAmount) + Number(upiAmount) + Number(bankAmount) + silverValue).toFixed(2)
        );

        if (totalAmount <= 0) {
            await session.abortTransaction();
            return res.status(400).json({ message: 'पेमेंट रक्कम शून्यपेक्षा जास्त असणे आवश्यक आहे.' });
        }

        // --- Check customer exists & prevent negative balance ---
        const customer = await Customer.findById(customerId).session(session);
        if (!customer) {
            await session.abortTransaction();
            return res.status(404).json({ message: 'ग्राहक सापडला नाही.' });
        }
        if (totalAmount > customer.currentBalance + 0.01) {
            await session.abortTransaction();
            return res.status(400).json({
                message: `पेमेंट (₹${totalAmount}) शिल्लक (₹${customer.currentBalance}) पेक्षा जास्त आहे.`
            });
        }

        const newBalance = parseFloat((customer.currentBalance - totalAmount).toFixed(2));

        // --- Determine method ---
        const hasCash = Number(cashAmount) > 0;
        const hasUpi = Number(upiAmount) > 0;
        const hasBank = Number(bankAmount) > 0;
        const hasSilver = silverValue > 0;
        const typeCount = [hasCash, hasUpi, hasBank, hasSilver].filter(Boolean).length;
        let method = 'Cash';
        if (typeCount > 1) method = 'Mixed';
        else if (hasSilver) method = 'Silver';
        else if (hasUpi) method = 'UPI';
        else if (hasBank) method = 'Bank';

        // --- Check and update Bill if billId is provided ---
        let billUpdatePromise = null;
        if (billId) {
            const bill = await Bill.findById(billId).session(session);
            if (!bill) {
                await session.abortTransaction();
                return res.status(404).json({ message: 'Bill not found.' });
            }
            const monetaryPayment = Number(cashAmount) + Number(upiAmount) + Number(bankAmount);
            if (monetaryPayment > 0) {
                bill.paidAmount = parseFloat((bill.paidAmount + monetaryPayment).toFixed(2));
                bill.remainingBalance = parseFloat((bill.totalPayable - bill.paidAmount).toFixed(2));

                // Update payment breakdown for the receipt
                if (!bill.paymentBreakdown) bill.paymentBreakdown = {};
                bill.paymentBreakdown.cashPaid = (bill.paymentBreakdown.cashPaid || 0) + Number(cashAmount);
                bill.paymentBreakdown.upiPaid = (bill.paymentBreakdown.upiPaid || 0) + Number(upiAmount);
                bill.paymentBreakdown.bankPaid = (bill.paymentBreakdown.bankPaid || 0) + Number(bankAmount);

                billUpdatePromise = bill.save({ session });
            }
        }

        // --- Save Payment ---
        const payment = await new Payment({
            customerId,
            billId,
            amount: totalAmount,
            method,
            cashAmount: Number(cashAmount),
            upiAmount: Number(upiAmount),
            bankAmount: Number(bankAmount),
            silverGrossWeight: Number(silverGrossWeight),
            silverPurity: Number(silverPurity),
            silverFineWeight,
            silverRate: Number(silverRate),
            silverValue,
            notes,
            date: new Date(),
        }).save({ session });

        // --- Create ledger entries (one per payment type) ---
        let runningBalance = customer.currentBalance;

        if (hasCash) {
            runningBalance = parseFloat((runningBalance - Number(cashAmount)).toFixed(2));
            await new LedgerEntry({
                customerId,
                entryType: 'CASH_PAYMENT',
                description: `रोख पेमेंट${billId ? ` — बिल #ref` : ''}`,
                credit: Number(cashAmount),
                balance: runningBalance,
                refId: payment._id,
                refModel: 'Payment',
                date: new Date(),
            }).save({ session });
        }
        if (hasUpi) {
            runningBalance = parseFloat((runningBalance - Number(upiAmount)).toFixed(2));
            await new LedgerEntry({
                customerId,
                entryType: 'UPI_PAYMENT',
                description: `UPI पेमेंट`,
                credit: Number(upiAmount),
                balance: runningBalance,
                refId: payment._id,
                refModel: 'Payment',
                date: new Date(),
            }).save({ session });
        }
        if (hasBank) {
            runningBalance = parseFloat((runningBalance - Number(bankAmount)).toFixed(2));
            await new LedgerEntry({
                customerId,
                entryType: 'BANK_PAYMENT',
                description: `बँक पेमेंट`,
                credit: Number(bankAmount),
                balance: runningBalance,
                refId: payment._id,
                refModel: 'Payment',
                date: new Date(),
            }).save({ session });
        }
        if (hasSilver) {
            runningBalance = parseFloat((runningBalance - silverValue).toFixed(2));
            await new LedgerEntry({
                customerId,
                entryType: 'SILVER_PAYMENT',
                description: `चांदी पेमेंट — ${silverFineWeight.toFixed(3)}g फाइन @ ₹${silverRate}/g`,
                credit: silverValue,
                balance: runningBalance,
                refId: payment._id,
                refModel: 'Payment',
                date: new Date(),
            }).save({ session });
        }

        // --- Update customer balance ---
        customer.currentBalance = newBalance;
        await customer.save({ session });

        if (billUpdatePromise) {
            await billUpdatePromise;
        }

        await session.commitTransaction();
        res.status(201).json(payment);

    } catch (error) {
        await session.abortTransaction();
        res.status(500).json({ message: error.message });
    } finally {
        session.endSession();
    }
};

/**
 * GET /api/payments/:customerId
 * Returns all payments for a customer, newest first
 */
export const getPaymentsByCustomer = async (req, res) => {
    try {
        const payments = await Payment.find({ customerId: req.params.customerId })
            .sort({ date: -1 });
        res.json(payments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
