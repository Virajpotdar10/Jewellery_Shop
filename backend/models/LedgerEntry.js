import mongoose from 'mongoose';

const ENTRY_TYPES = [
    'BILL',
    'CASH_PAYMENT',
    'UPI_PAYMENT',
    'BANK_PAYMENT',
    'SILVER_PAYMENT',
    'SILVER_ADJUSTMENT',
    'SILVER_FINE_PAYMENT',
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
    fineCredit: {
        type: Number,
        default: 0,
    },
    fineDebit: {
        type: Number,
        default: 0,
    },
    fineBalance: {
        type: Number,
        default: 0,
    },
    refId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
    },
    refModel: {
        type: String,
        enum: ['Bill', 'Payment', 'SilverAdjustment', 'SilverPayment', null],
        default: null,
    },
}, { timestamps: true });

ledgerEntrySchema.index({ customerId: 1, date: -1 });

const LedgerEntry = mongoose.model('LedgerEntry', ledgerEntrySchema);
export { ENTRY_TYPES };
export default LedgerEntry;
