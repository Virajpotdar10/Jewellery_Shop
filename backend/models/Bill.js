import mongoose from 'mongoose';

const billItemSchema = new mongoose.Schema({
    description: { type: String, required: true },
    quantity: { type: Number, required: true, default: 1 },
    weight: { type: Number, required: true },
    touch: { type: Number, required: true },
    fine: { type: Number, required: true },
    rate: { type: Number, required: true },
    makingCharge: { type: Number, required: true, default: 0 },
    amount: { type: Number, required: true }
});

const billSchema = new mongoose.Schema({
    billNumber: {
        type: Number,
        required: true,
        unique: true
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    items: [billItemSchema],
    subtotal: { type: Number, required: true },
    totalMakingCharges: { type: Number, default: 0 },
    previousBalance: { type: Number, default: 0 },
    totalPayable: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    remainingBalance: { type: Number, required: true }
}, { timestamps: true });

const Bill = mongoose.model('Bill', billSchema);
export default Bill;
