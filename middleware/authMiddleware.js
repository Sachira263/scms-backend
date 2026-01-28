const jwt = require('jsonwebtoken');

// Protect routes - require authentication
exports.protect = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: "Not authorized, no token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Token failed or expired" });
  }
};

// Admin only access
exports.isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: "Access denied: Admin only" });
  }
};

// Student only access
exports.isStudent = (req, res, next) => {
  if (req.user && req.user.role === 'student') {
    next();
  } else {
    res.status(403).json({ message: "Access denied: Students only" });
  }
};

// Check if user is accessing their own resource
exports.isOwnerOrAdmin = (req, res, next) => {
  const resourceUserId = req.params.studentId || req.body.studentId;
  
  if (req.user.role === 'admin' || req.user.id === resourceUserId) {
    next();
  } else {
    res.status(403).json({ message: "Access denied: You can only access your own data" });
  }
};

