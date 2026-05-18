import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const admin = (req, res, next) => {
  // Check if user has admin role (you'll need to add isAdmin field to User model)
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Admin access required' });
  }
};
export const protect = async (req, res, next) => {
  let token;
  
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  
  if (!token) {
    return res.status(401).json({ success: false, error: 'Not authorized' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.userId).select('-password');
    
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }
    
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Token invalid' });
  }
  
};