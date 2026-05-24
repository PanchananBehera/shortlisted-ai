// server/controllers/authController.js - FIXED VERSION
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';  // ✅ Use 'bcrypt' (not bcryptjs)
import User from '../models/User.js';

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ userId: id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, fullName } = req.body;
    const userName = fullName || name;

    if (!userName || !email || !password) {
      return res.status(400).json({ success: false, error: 'Please provide all required fields' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, error: 'User already exists' });
    }

    const user = await User.create({
      name: userName,
      email,
      password,
    });

    if (user) {
      // ✅ Return "fullName" to match frontend
      res.status(201).json({
        success: true,
        _id: user._id,
        fullName: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ success: false, error: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, error: error.message || 'Server error' });
  }
};

// @desc    Authenticate a user
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Please provide email and password' });
    }

    const user = await User.findOne({ email }).select('+password');

    if (user && (await bcrypt.compare(password, user.password))) {
      // ✅ Return "fullName" to match frontend
      res.json({
        success: true,
        _id: user._id,
        fullName: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: error.message || 'Server error' });
  }
};

// @desc    Get user data
export const getMe = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    res.status(200).json({ 
      success: true, 
      user: {
        _id: user._id,
        fullName: user.name,
        email: user.email,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, error: error.message || 'Server error' });
  }
};