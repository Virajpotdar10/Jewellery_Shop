import mongoose from 'mongoose';

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
        // Could refer to a Bill ID or Payment ID
        type: mongoose.Schema.Types.ObjectId,
    }
}, { timestamps: true });

const LedgerEntry = mongoose.model('LedgerEntry', ledgerEntrySchema);
export default LedgerEntry;
