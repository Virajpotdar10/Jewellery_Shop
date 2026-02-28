import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    mobile: {
        type: String,
        trim: true,
    },
    address: {
        type: String,
        trim: true,
    },
    currentBalance: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

const Customer = mongoose.model('Customer', customerSchema);
export default Customer;
