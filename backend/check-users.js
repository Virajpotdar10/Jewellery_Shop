import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'Employee' }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jewellery-shop-db';

async function checkUsers() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');
        const users = await User.find({});
        console.log('Users in database:', users.map(u => ({ username: u.username, role: u.role })));

        if (users.length === 0) {
            console.log('No users found. Creating a default admin user...');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('admin123', salt);
            await User.create({
                username: 'admin',
                password: hashedPassword,
                role: 'Admin'
            });
            console.log('Default admin user created: admin / admin123');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        mongoose.disconnect();
    }
}

checkUsers();
