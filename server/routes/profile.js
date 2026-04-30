import express from 'express';
import { protect } from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

// GET /api/user/profile - Fetch user profile data
router.get('/', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ success: false, message: "Failed to fetch profile" });
    }
});

// PUT /api/user/profile - Update user profile data
router.put('/', protect, async (req, res) => {
    try {
        const { 
            name, email, phone, location, college, degree, graduationYear, skills, github, linkedin, bio
        } = req.body;
        
        const userId = req.user.id;
        
        const updatedUser = await User.findByIdAndUpdate(userId, { 
          name, email, phone, location, college, degree, graduationYear, skills, github, linkedin, bio 
        }, { new: true, runValidators: true }).select('-password');
        
        if (!updatedUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        res.json({ 
            success: true, 
            message: "Profile updated successfully",
            data: updatedUser
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ success: false, message: "Failed to update profile" });
    }
});

export default router;