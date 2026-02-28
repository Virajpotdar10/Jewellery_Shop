import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jewellery-shop';

async function seed() {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Delete existing admin user if exists
    await User.deleteOne({ username: 'virajpotdar4@gmail.com' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('as123456', salt);

    const admin = await User.create({
        username: 'virajpotdar4@gmail.com',
        password: hashedPassword,
        role: 'Admin',
    });

    console.log('Admin user created:', admin.username);
    mongoose.disconnect();
}

seed().catch((err) => {
    console.error(err);
    mongoose.disconnect();
});
