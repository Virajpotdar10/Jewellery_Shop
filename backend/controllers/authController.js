import User from '../models/User.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', {
        expiresIn: '365d',
    });
};

export const registerUser = async (req, res) => {
    try {
        const { username, password, role } = req.body;

        const userExists = await User.findOne({ username });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({
            username,
            password: hashedPassword,
            role: role || 'Employee',
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                username: user.username,
                role: user.role,
                token: generateToken(user._id),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const loginUser = async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await User.findOne({ username });

        if (user && (await bcrypt.compare(password, user.password))) {
            res.json({
                _id: user._id,
                username: user.username,
                role: user.role,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'Invalid username or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
