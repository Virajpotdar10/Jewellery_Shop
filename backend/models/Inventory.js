import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema({
    itemName: {
        type: String,
        required: true,
        default: 'Silver Fine'
    },
    weightIn: {
        type: Number,
        default: 0,
    },
    weightOut: {
        type: Number,
        default: 0,
    },
    currentStock: {
        type: Number,
        required: true,
        default: 0
    },
    date: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

const Inventory = mongoose.model('Inventory', inventorySchema);
export default Inventory;
