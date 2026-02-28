import mongoose from 'mongoose';

const silverRateSchema = new mongoose.Schema({
    rate: {
        type: Number,
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    source: {
        type: String,
        enum: ['Manual', 'API'],
        default: 'Manual',
    },
}, { timestamps: true });

const SilverRate = mongoose.model('SilverRate', silverRateSchema);
export default SilverRate;
