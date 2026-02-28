import Inventory from '../models/Inventory.js';

export const getInventory = async (req, res) => {
    try {
        const stockItems = await Inventory.aggregate([
            {
                $group: {
                    _id: "$itemName",
                    totalIn: { $sum: "$weightIn" },
                    totalOut: { $sum: "$weightOut" },
                    currentStock: { $last: "$currentStock" }
                }
            }
        ]);
        res.json(stockItems);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const addStock = async (req, res) => {
    try {
        const { itemName, weightIn } = req.body;

        // Find last stock
        const lastEntry = await Inventory.findOne({ itemName }).sort({ createdAt: -1 });
        const currentStock = lastEntry ? lastEntry.currentStock + weightIn : weightIn;

        const entry = new Inventory({
            itemName: itemName || 'Silver Fine',
            weightIn,
            currentStock
        });

        const savedEntry = await entry.save();
        res.status(201).json(savedEntry);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}
