import mongoose from 'mongoose';

const silverPaymentSchema = new mongoose.Schema({
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true,
    },
    billId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bill',
        default: null,
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
        required: true,   // grossWeight × purity / 100
        min: 0,
    },
    deductedFine: {
        type: Number,
        required: true,   // Amount deducted from fine balance
        min: 0,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    ledgerEntryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LedgerEntry',
        default: null,
    }
}, { timestamps: true });

const SilverPayment = mongoose.model('SilverPayment', silverPaymentSchema);
export default SilverPayment;
