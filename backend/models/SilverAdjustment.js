import mongoose from 'mongoose';

/**
 * SilverAdjustment — post-bill silver payment that adjusts the customer's balance.
 * Does NOT modify the original bill. Creates a separate linked adjustment entry.
 *
 * Example: Customer owes ₹40,000. Two days later gives 20g silver @ 80% purity.
 *   fineWeight  = 20 × 80 / 100 = 16g
 *   value       = 16 × ₹75/g   = ₹1,200
 *   New balance = ₹40,000 − ₹1,200 = ₹38,800
 */
const silverAdjustmentSchema = new mongoose.Schema({
    billId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bill',
        required: true,
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    grossWeight: {
        type: Number,
        required: true,
        min: 0,
    },
    purity: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
    },
    fineWeight: {
        type: Number,
        required: true,   // auto-calc: grossWeight × purity / 100
        min: 0,
    },
    silverRate: {
        type: Number,
        required: true,   // ₹ per gram at time of adjustment (snapshot)
        min: 0,
    },
    value: {
        type: Number,
        required: true,   // fineWeight × silverRate
        min: 0,
    },
    notes: { type: String, default: '' },
    ledgerEntryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LedgerEntry',
        default: null,
    },
}, { timestamps: true });

const SilverAdjustment = mongoose.model('SilverAdjustment', silverAdjustmentSchema);
export default SilverAdjustment;
