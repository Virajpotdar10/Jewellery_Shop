import mongoose from 'mongoose';
import Bill from '../models/Bill.js';
import Customer from '../models/Customer.js';
import LedgerEntry from '../models/LedgerEntry.js';
import Inventory from '../models/Inventory.js';
import Payment from '../models/Payment.js';
import SilverRate from '../models/SilverRate.js';
import fs from 'fs';

/**
 * Helper: compute silver fine weight & value
 */
const calcSilver = (grossWeight = 0, purity = 0, silverRate = 0) => {
    const fineWeight = parseFloat(((grossWeight * purity) / 100).toFixed(4));
    const silverValue = parseFloat((fineWeight * silverRate).toFixed(2));
    return { fineWeight, silverValue };
};

/**
 * Helper: determine payment method string from breakdown
 */
const resolveMethod = (cashAmount, upiAmount, bankAmount, silverValue) => {
    const hasCash = cashAmount > 0;
    const hasUpi = upiAmount > 0;
    const hasBank = bankAmount > 0;
    const hasSilver = silverValue > 0;
    const types = [hasCash, hasUpi, hasBank, hasSilver].filter(Boolean).length;
    if (types > 1) return 'Mixed';
    if (hasSilver) return 'Silver';
    if (hasUpi) return 'UPI';
    if (hasBank) return 'Bank';
    return 'Cash';
};

export const createBill = async (req, res) => {
    let session;
    try {
        session = await mongoose.startSession();
        session.startTransaction();

        const {
            customerId,
            items,
            previousBalance = 0,
            previousFine = 0,
            // Payment breakdown (rupee-based)
            cashAmount = 0,
            upiAmount = 0,
            bankAmount = 0,
            notes = '',
        } = req.body;

        // 1. Fetch Today's Silver Rate
        const latestRateObj = await SilverRate.findOne().sort({ createdAt: -1 }).session(session);
        if (!latestRateObj) {
            await session.abortTransaction();
            return res.status(400).json({ message: 'आजचा चांदीचा दर सेट केलेला नाही. कृपया सेटिंगमध्ये दर भरा.' });
        }
        const silverRateUsed = latestRateObj.rate;

        // 2. Process Items: Calculate Fine and Amount for each
        let totalFineWeight = 0;
        let billSubtotal = 0;
        let totalMakingCharges = 0;

        const processedItems = items.map(item => {
            const weight = Number(item.weight) || 0;
            const touch = Number(item.touch) || 0;
            const makingChargeRate = Number(item.makingCharge) || 0;
            const quantity = Number(item.quantity) || 1;

            const fine = parseFloat(((weight * touch) / 100).toFixed(3));
            const itemAmount = parseFloat((makingChargeRate * (weight / 1000)).toFixed(2));

            totalFineWeight += fine;
            billSubtotal += itemAmount;

            return {
                ...item,
                fine,
                amount: itemAmount
            };
        });

        const totalPayable = parseFloat((billSubtotal + Number(previousBalance)).toFixed(2));
        const paidAmount = parseFloat((Number(cashAmount) + Number(upiAmount) + Number(bankAmount)).toFixed(2));
        const remainingBalance = parseFloat((totalPayable - paidAmount).toFixed(2));

        // Prevent overpayment
        if (paidAmount > totalPayable + 0.01) {
            await session.abortTransaction();
            return res.status(400).json({ message: 'पेमेंट एकूण देण्यापेक्षा जास्त असू शकत नाही.' });
        }

        // --- Auto-increment billNumber ---
        const lastBill = await Bill.findOne().sort({ billNumber: -1 }).session(session);
        const nextBillNumber = lastBill ? lastBill.billNumber + 1 : 1;

        const paymentBreakdown = {
            cashPaid: Number(cashAmount),
            upiPaid: Number(upiAmount),
            bankPaid: Number(bankAmount),
        };

        const newBill = new Bill({
            billNumber: nextBillNumber,
            customerId,
            items: processedItems,
            subtotal: billSubtotal,
            previousBalance,
            previousFine,
            silverRateUsed,
            totalFineWeight,
            totalPayable,
            paymentBreakdown,
            paidAmount,
            remainingBalance,
            date: new Date(),
            notes,
        });

        const createdBill = await newBill.save({ session });

        // --- Update Customer Balance ---
        const customer = await Customer.findById(customerId).session(session);
        if (!customer) {
            await session.abortTransaction();
            return res.status(404).json({ message: 'ग्राहक सापडला नाही.' });
        }

        const oldFineBalance = Number(previousFine) || 0;
        const newFineBalance = parseFloat((oldFineBalance + totalFineWeight).toFixed(3));

        customer.currentBalance = remainingBalance;
        customer.fineBalance = newFineBalance;
        await customer.save({ session });

        // --- Ledger: BILL debit entry ---
        const billLedger = new LedgerEntry({
            customerId,
            entryType: 'BILL',
            description: `बिल #${nextBillNumber}`,
            debit: billSubtotal,
            credit: 0,
            balance: parseFloat((Number(previousBalance) + billSubtotal).toFixed(2)),
            fineDebit: totalFineWeight,
            fineCredit: 0,
            fineBalance: newFineBalance,
            refId: createdBill._id,
            refModel: 'Bill',
            date: new Date(),
        });
        await billLedger.save({ session });

        let runningBalance = parseFloat((Number(previousBalance) + billSubtotal).toFixed(2));

        // --- Ledger: payment credit entries ---
        if (Number(cashAmount) > 0) {
            runningBalance = parseFloat((runningBalance - Number(cashAmount)).toFixed(2));
            await new LedgerEntry({
                customerId,
                entryType: 'CASH_PAYMENT',
                description: `रोख पेमेंट — बिल #${nextBillNumber}`,
                credit: Number(cashAmount),
                balance: runningBalance,
                fineBalance: newFineBalance,
                refId: createdBill._id,
                refModel: 'Bill',
                date: new Date(),
            }).save({ session });
        }
        if (Number(upiAmount) > 0) {
            runningBalance = parseFloat((runningBalance - Number(upiAmount)).toFixed(2));
            await new LedgerEntry({
                customerId,
                entryType: 'UPI_PAYMENT',
                description: `UPI पेमेंट — बिल #${nextBillNumber}`,
                credit: Number(upiAmount),
                balance: runningBalance,
                fineBalance: newFineBalance,
                refId: createdBill._id,
                refModel: 'Bill',
                date: new Date(),
            }).save({ session });
        }
        if (Number(bankAmount) > 0) {
            runningBalance = parseFloat((runningBalance - Number(bankAmount)).toFixed(2));
            await new LedgerEntry({
                customerId,
                entryType: 'BANK_PAYMENT',
                description: `बँक पेमेंट — बिल #${nextBillNumber}`,
                credit: Number(bankAmount),
                balance: runningBalance,
                fineBalance: newFineBalance,
                refId: createdBill._id,
                refModel: 'Bill',
                date: new Date(),
            }).save({ session });
        }

        // --- Save Payment Record ---
        if (paidAmount > 0) {
            await new Payment({
                customerId,
                billId: createdBill._id,
                amount: paidAmount,
                method: resolveMethod(Number(cashAmount), Number(upiAmount), Number(bankAmount), 0),
                cashAmount: Number(cashAmount),
                upiAmount: Number(upiAmount),
                bankAmount: Number(bankAmount),
                date: new Date(),
            }).save({ session });
        }

        // --- Inventory: deduct fine silver out ---
        for (const item of items) {
            await new Inventory({
                itemName: item.description,
                weightOut: item.fine,
                currentStock: -item.fine,
            }).save({ session });
        }

        await session.commitTransaction();
        res.status(201).json(createdBill);

    } catch (error) {
        try {
            if (session) await session.abortTransaction();
        } catch (abortError) {
            console.error('Abort failed:', abortError?.message);
        }

        try { fs.writeFileSync('last_error.txt', error.stack || error.message || String(error)); } catch (e) { }

        console.error("BILL SAVE ERROR:", error);

        let errMsg = "An unknown error occurred.";
        if (error && error.message) errMsg = error.message;
        else if (typeof error === 'string') errMsg = error;

        return res.status(500).json({
            message: errMsg,
            stack: error?.stack || null
        });
    } finally {
        if (session) session.endSession();
    }
};

export const getBills = async (req, res) => {
    try {
        const filter = {};
        if (req.query.customerId) filter.customerId = req.query.customerId;
        const bills = await Bill.find(filter)
            .populate('customerId', 'name mobile')
            .sort({ date: -1 });
        res.json(bills);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getBillById = async (req, res) => {
    try {
        const bill = await Bill.findById(req.params.id).populate('customerId', 'name mobile address');
        if (!bill) return res.status(404).json({ message: 'बिल सापडले नाही.' });
        res.json(bill);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
