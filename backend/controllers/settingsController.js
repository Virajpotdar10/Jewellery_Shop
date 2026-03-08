import Settings from '../models/Settings.js';

// Get a setting by key
export const getSetting = async (req, res) => {
    try {
        const { key } = req.params;
        let setting = await Settings.findOne({ key });

        // Default value if not found
        if (!setting && key === 'lastDayStart') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            setting = await Settings.create({ key, value: today.toISOString() });
        }

        res.json(setting);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update or create a setting
export const updateSetting = async (req, res) => {
    try {
        const { key, value } = req.body;
        const setting = await Settings.findOneAndUpdate(
            { key },
            { value },
            { new: true, upsert: true }
        );
        res.json(setting);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
