import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    method: {
        type: String,
        enum: ['Cash', 'UPI', 'Bank', 'Partial'],
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
}, { timestamps: true });

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;
