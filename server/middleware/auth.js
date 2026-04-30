import jwt from 'jsonwebtoken';

export const protect = async (req, res, next) => {
  let token;

  // Check if token exists in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Extract token: "Bearer <token>" → "<token>"
      token = req.headers.authorization.split(' ')[1];
      
      // Verify token using JWT_SECRET
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Attach user info to request object
      req.user = { id: decoded.id };
      
      next(); // Proceed to the next middleware/controller
    } catch (error) {
      console.error('Token verification failed:', error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  // No token found
  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};