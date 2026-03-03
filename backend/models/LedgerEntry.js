import mongoose from 'mongoose';

const ENTRY_TYPES = [
    'BILL',
    'CASH_PAYMENT',
    'UPI_PAYMENT',
    'BANK_PAYMENT',
    'SILVER_PAYMENT',
    'SILVER_ADJUSTMENT',
    'MANUAL_CREDIT',
    'MANUAL_DEBIT',
];

const ledgerEntrySchema = new mongoose.Schema({
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    entryType: {
        type: String,
        enum: ENTRY_TYPES,
        required: true,
        default: 'MANUAL_CREDIT',
    },
    description: {
        type: String,
        required: true,
    },
    credit: {
        type: Number,
        default: 0,
    },
    debit: {
        type: Number,
        default: 0,
    },
    balance: {
        type: Number,
        required: true,
    },
    refId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
    },
    refModel: {
        type: String,
        enum: ['Bill', 'Payment', 'SilverAdjustment', null],
        default: null,
    },
}, { timestamps: true });

const LedgerEntry = mongoose.model('LedgerEntry', ledgerEntrySchema);
export { ENTRY_TYPES };
export default LedgerEntry;
