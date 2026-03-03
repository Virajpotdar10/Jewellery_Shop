import mongoose from 'mongoose';
import Bill from '../models/Bill.js';
import Customer from '../models/Customer.js';
import LedgerEntry from '../models/LedgerEntry.js';
import Inventory from '../models/Inventory.js';
import Payment from '../models/Payment.js';

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
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const {
            customerId,
            items,
            subtotal,
            totalMakingCharges,
            previousBalance,
            totalPayable,
            // Payment breakdown
            cashAmount = 0,
            upiAmount = 0,
            bankAmount = 0,
            // Silver payment at billing time (optional)
            silverGrossWeight = 0,
            silverPurity = 0,
            silverRate = 0,
            notes = '',
        } = req.body;

        // --- Silver calculation ---
        const { fineWeight: silverFineWeight, silverValue } = calcSilver(
            Number(silverGrossWeight), Number(silverPurity), Number(silverRate)
        );

        const paidAmount = parseFloat(
            (Number(cashAmount) + Number(upiAmount) + Number(bankAmount) + silverValue).toFixed(2)
        );
        const remainingBalance = parseFloat((Number(totalPayable) - paidAmount).toFixed(2));

        // Prevent overpayment
        if (paidAmount > Number(totalPayable) + 0.01) {
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
            silverGrossWeight: Number(silverGrossWeight),
            silverPurity: Number(silverPurity),
            silverFineWeight,
            silverRate: Number(silverRate),
            silverValuePaid: silverValue,
        };

        const newBill = new Bill({
            billNumber: nextBillNumber,
            customerId,
            items,
            subtotal,
            totalMakingCharges,
            previousBalance,
            totalPayable,
            paymentBreakdown,
            paidAmount,
            remainingBalance,
            date: new Date(),
            notes,
        });

        const createdBill = await newBill.save({ session });

        // --- Update Customer Balance ---
        await Customer.findByIdAndUpdate(customerId, { currentBalance: remainingBalance }, { session });

        // --- Ledger: BILL debit entry ---
        const billAmount = Number(subtotal);  // new goods value (excluding prev balance)
        let runningBalance = Number(previousBalance) + billAmount;

        const billLedger = new LedgerEntry({
            customerId,
            entryType: 'BILL',
            description: `बिल #${nextBillNumber}`,
            debit: billAmount,
            credit: 0,
            balance: runningBalance,
            refId: createdBill._id,
            refModel: 'Bill',
            date: new Date(),
        });
        await billLedger.save({ session });

        // --- Ledger: payment credit entries ---
        if (Number(cashAmount) > 0) {
            runningBalance = parseFloat((runningBalance - Number(cashAmount)).toFixed(2));
            await new LedgerEntry({
                customerId,
                entryType: 'CASH_PAYMENT',
                description: `रोख पेमेंट — बिल #${nextBillNumber}`,
                credit: Number(cashAmount),
                balance: runningBalance,
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
                refId: createdBill._id,
                refModel: 'Bill',
                date: new Date(),
            }).save({ session });
        }
        if (silverValue > 0) {
            runningBalance = parseFloat((runningBalance - silverValue).toFixed(2));
            await new LedgerEntry({
                customerId,
                entryType: 'SILVER_PAYMENT',
                description: `चांदी पेमेंट — ${silverFineWeight.toFixed(3)}g फाइन @ ₹${silverRate}/g — बिल #${nextBillNumber}`,
                credit: silverValue,
                balance: runningBalance,
                refId: createdBill._id,
                refModel: 'Bill',
                date: new Date(),
            }).save({ session });
        }

        // --- Save Payment Record ---
        const method = resolveMethod(Number(cashAmount), Number(upiAmount), Number(bankAmount), silverValue);
        if (paidAmount > 0) {
            await new Payment({
                customerId,
                billId: createdBill._id,
                amount: paidAmount,
                method,
                cashAmount: Number(cashAmount),
                upiAmount: Number(upiAmount),
                bankAmount: Number(bankAmount),
                silverGrossWeight: Number(silverGrossWeight),
                silverPurity: Number(silverPurity),
                silverFineWeight,
                silverRate: Number(silverRate),
                silverValue,
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
        await session.abortTransaction();
        res.status(500).json({ message: error.message });
    } finally {
        session.endSession();
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
