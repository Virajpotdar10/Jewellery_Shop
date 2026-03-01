import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jewellery-shop';

const users = [
    { username: 'virajpotdar4@gmail.com', password: 'as123456', role: 'Admin' },
    { username: 'sandeepotdar1995@gmail.com', password: '123456', role: 'Admin' },
];

async function seed() {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    for (const u of users) {
        await User.deleteOne({ username: u.username });
        const hashed = await bcrypt.hash(u.password, 10);
        const created = await User.create({ username: u.username, password: hashed, role: u.role });
        console.log(`✅ Created: ${created.username} (${created.role})`);
    }

    mongoose.disconnect();
    console.log('Done ✔');
}

seed().catch((err) => {
    console.error(err);
    mongoose.disconnect();
});
