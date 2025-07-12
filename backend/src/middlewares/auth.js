// ===== backend/src/middleware/auth.js =====
const { auth, userService } = require('../services/firebase');

// Middleware to verify Firebase token
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'ไม่พบ Authorization token'
      });
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Verify the token with Firebase Admin
    const decodedToken = await auth.verifyIdToken(token);
    
    // Get user data from Firestore
    const userData = await userService.getUserById(decodedToken.uid);
    
    if (!userData) {
      return res.status(403).json({
        success: false,
        message: 'ไม่พบข้อมูลผู้ใช้'
      });
    }

    if (!userData.isActive) {
      return res.status(403).json({
        success: false,
        message: 'บัญชีผู้ใช้ถูกระงับ'
      });
    }

    // Add user info to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      ...userData
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({
        success: false,
        message: 'Token หมดอายุ กรุณาล็อกอินใหม่'
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Token ไม่ถูกต้อง'
    });
  }
};

// Middleware to check user roles
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'ไม่ได้รับการยืนยันตัวตน'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'ไม่มีสิทธิ์เข้าถึง'
      });
    }

    next();
  };
};

// Middleware for admin only
const requireAdmin = requireRole(['ADMIN']);

// Middleware for staff (Drop-APP, ASP, Admin)
const requireStaff = requireRole(['ADMIN', 'DROP_APP', 'ASP']);

// Optional auth middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];
      const decodedToken = await auth.verifyIdToken(token);
      const userData = await userService.getUserById(decodedToken.uid);
      
      if (userData && userData.isActive) {
        req.user = {
          uid: decodedToken.uid,
          email: decodedToken.email,
          ...userData
        };
      }
    }
  } catch (error) {
    // Silently ignore auth errors for optional auth
    console.log('Optional auth failed:', error.message);
  }
  
  next();
};

module.exports = {
  verifyToken,
  requireRole,
  requireAdmin,
  requireStaff,
  optionalAuth
};