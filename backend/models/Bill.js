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

const paymentBreakdownSchema = new mongoose.Schema({
    cashPaid: { type: Number, default: 0 },
    upiPaid: { type: Number, default: 0 },
    bankPaid: { type: Number, default: 0 },
    silverGrossWeight: { type: Number, default: 0 },
    silverPurity: { type: Number, default: 0 },   // percent, e.g. 80
    silverFineWeight: { type: Number, default: 0 },   // auto-calculated grams
    silverRate: { type: Number, default: 0 },   // ₹ per gram used at time
    silverValuePaid: { type: Number, default: 0 },   // fineWeight × silverRate
}, { _id: false });

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
    paymentBreakdown: { type: paymentBreakdownSchema, default: () => ({}) },
    paidAmount: { type: Number, default: 0 },
    remainingBalance: { type: Number, required: true },
    status: {
        type: String,
        enum: ['UNPAID', 'PARTIAL', 'PAID'],
        default: 'UNPAID'
    },
    notes: { type: String, default: '' }
}, { timestamps: true });

// Auto-compute status based on remainingBalance
billSchema.pre('save', function (next) {
    if (this.remainingBalance <= 0) {
        this.status = 'PAID';
    } else if (this.paidAmount > 0) {
        this.status = 'PARTIAL';
    } else {
        this.status = 'UNPAID';
    }
    next();
});

const Bill = mongoose.model('Bill', billSchema);
export default Bill;
