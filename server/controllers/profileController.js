import User from '../models/User.js';

// @desc    Get user profile
// @route   GET /api/profile
// @access  Private
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update user profile
// @route   PUT /api/profile
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    const {
      phone,
      location,
      college,
      degree,
      graduationYear,
      skills,
      github,
      linkedin,
      bio
    } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update fields
    if (phone) user.phone = phone;
    if (location) user.location = location;
    if (college) user.college = college;
    if (degree) user.degree = degree;
    if (graduationYear) user.graduationYear = graduationYear;
    if (skills) user.skills = skills;
    if (github) user.github = github;
    if (linkedin) user.linkedin = linkedin;
    if (bio) user.bio = bio;

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        location: user.location,
        college: user.college,
        degree: user.degree,
        graduationYear: user.graduationYear,
        skills: user.skills,
        github: user.github,
        linkedin: user.linkedin,
        bio: user.bio
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};