import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
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
    // Total monetary value of this payment (cash + UPI + bank + silverValue)
    amount: {
        type: Number,
        required: true,
    },
    method: {
        type: String,
        enum: ['Cash', 'UPI', 'Bank', 'Silver', 'Mixed'],
        required: true,
    },
    // Cash component
    cashAmount: { type: Number, default: 0 },
    // UPI component
    upiAmount: { type: Number, default: 0 },
    // Bank component
    bankAmount: { type: Number, default: 0 },
    // Silver component
    silverGrossWeight: { type: Number, default: 0 },   // grams given by customer
    silverPurity: { type: Number, default: 0 },   // percent (e.g. 80)
    silverFineWeight: { type: Number, default: 0 },   // auto-calc: gross × purity / 100
    silverRate: { type: Number, default: 0 },   // ₹ per gram at time of payment
    silverValue: { type: Number, default: 0 },   // fineWeight × rate
    date: {
        type: Date,
        default: Date.now,
    },
    notes: { type: String, default: '' },
}, { timestamps: true });

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;
