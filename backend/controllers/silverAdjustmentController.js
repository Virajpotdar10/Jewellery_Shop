import mongoose from 'mongoose';
import SilverAdjustment from '../models/SilverAdjustment.js';
import LedgerEntry from '../models/LedgerEntry.js';
import Customer from '../models/Customer.js';
import Bill from '../models/Bill.js';

/**
 * POST /api/silver-adjustments
 * Add a post-bill silver adjustment.
 * Does NOT modify the original bill — creates a linked adjustment record.
 *
 * Body: { billId, customerId, date?, grossWeight, purity, silverRate, notes? }
 */
export const addSilverAdjustment = async (req, res) => {
    
    try {
        const {
            billId,
            customerId,
            date,
            grossWeight,
            purity,
            silverRate,
            notes = '',
        } = req.body;

        // --- Validation ---
        if (!billId) return res.status(400).json({ message: 'billId आवश्यक आहे.' });
        if (!customerId) return res.status(400).json({ message: 'customerId आवश्यक आहे.' });
        if (!grossWeight || Number(grossWeight) <= 0)
            return res.status(400).json({ message: 'वजन शून्यपेक्षा जास्त असणे आवश्यक आहे.' });
        if (purity === undefined || Number(purity) <= 0 || Number(purity) > 100)
            return res.status(400).json({ message: 'शुद्धता 0 ते 100 च्या मध्ये असणे आवश्यक आहे.' });
        if (!silverRate || Number(silverRate) <= 0)
            return res.status(400).json({ message: 'चांदी दर आवश्यक आहे.' });

        // --- Verify bill & customer exist ---
        const [bill, customer] = await Promise.all([
            Bill.findById(billId),
            Customer.findById(customerId),
        ]);
        if (!bill) return res.status(404).json({ message: 'बिल सापडले नाही.' });
        if (!customer) return res.status(404).json({ message: 'ग्राहक सापडला नाही.' });

        // --- Compute fine weight & value ---
        const gw = Number(grossWeight);
        const pur = Number(purity);
        const rate = Number(silverRate);
        const fineWeight = parseFloat(((gw * pur) / 100).toFixed(4));
        const value = parseFloat((fineWeight * rate).toFixed(2));

        if (value > customer.currentBalance + 0.01) {
            
            return res.status(400).json({
                message: `चांदी मूल्य (₹${value}) शिल्लक (₹${customer.currentBalance}) पेक्षा जास्त आहे.`
            });
        }

        const newBalance = parseFloat((customer.currentBalance - value).toFixed(2));

        // --- Create SilverAdjustment ---
        const adjustment = await new SilverAdjustment({
            billId,
            customerId,
            date: date ? new Date(date) : new Date(),
            grossWeight: gw,
            purity: pur,
            fineWeight,
            silverRate: rate,
            value,
            notes,
        }).save();

        // --- Create SILVER_ADJUSTMENT Ledger Entry ---
        const ledgerEntry = await new LedgerEntry({
            customerId,
            entryType: 'SILVER_ADJUSTMENT',
            description: `चांदी समायोजन — ${fineWeight.toFixed(3)}g फाइन @ ₹${rate}/g — बिल #${bill.billNumber}`,
            credit: value,
            balance: newBalance,
            refId: adjustment._id,
            refModel: 'SilverAdjustment',
            date: adjustment.date,
        }).save();

        // Link ledger entry back to the adjustment
        adjustment.ledgerEntryId = ledgerEntry._id;
        await adjustment.save();

        // --- Update bill remaining balance ---
        const updatedBillBalance = parseFloat((bill.remainingBalance - value).toFixed(2));
        bill.remainingBalance = updatedBillBalance;
        bill.paidAmount = parseFloat((bill.paidAmount + value).toFixed(2));
        // status recomputed by pre-save hook
        await bill.save();

        // --- Update customer balance ---
        customer.currentBalance = newBalance;
        await customer.save();

        
        res.status(201).json({
            adjustment,
            ledgerEntry,
            newCustomerBalance: newBalance,
        });

    } catch (error) {
        
        res.status(500).json({ message: error.message });
    } finally {
        
    }
};

/**
 * GET /api/silver-adjustments/bill/:billId
 */
export const getAdjustmentsByBill = async (req, res) => {
    try {
        const adjustments = await SilverAdjustment.find({ billId: req.params.billId })
            .populate('customerId', 'name mobile')
            .sort({ date: -1 });
        res.json(adjustments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * GET /api/silver-adjustments/customer/:customerId
 */
export const getAdjustmentsByCustomer = async (req, res) => {
    try {
        const adjustments = await SilverAdjustment.find({ customerId: req.params.customerId })
            .populate('billId', 'billNumber date')
            .sort({ date: -1 });
        res.json(adjustments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
