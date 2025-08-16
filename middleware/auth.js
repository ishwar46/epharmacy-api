// middleware/auth.js
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');

// Security constants
const MAX_TOKEN_AGE = 24 * 60 * 60; // 24 hours in seconds
const AUTH_ERROR_DELAY = 100; // Constant delay to prevent timing attacks

// Rate limiter for authentication attempts
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 requests per windowMs
    message: {
        success: false,
        message: 'Too many authentication attempts, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Security logging function
const logSecurityEvent = (event, details = {}) => {
    console.log(`[SECURITY] ${new Date().toISOString()} - ${event}:`, {
        ...details,
        timestamp: new Date().toISOString()
    });
};

// Validate JWT payload structure
const validateJWTPayload = (payload) => {
    if (!payload || typeof payload !== 'object') {
        return false;
    }

    // Check required fields
    if (!payload.id || typeof payload.id !== 'string') {
        return false;
    }

    // Check token age if iat (issued at) is present
    if (payload.iat) {
        const tokenAge = Math.floor(Date.now() / 1000) - payload.iat;
        if (tokenAge > MAX_TOKEN_AGE) {
            return false;
        }
    }

    return true;
};

// Standardized auth error response (prevents timing attacks)
const sendAuthError = async (res, message = 'Authentication failed', statusCode = 401) => {
    // Add small delay to prevent timing attacks
    await new Promise(resolve => setTimeout(resolve, AUTH_ERROR_DELAY));

    return res.status(statusCode).json({
        success: false,
        message
    });
};

// Protect routes - require authentication
exports.protect = async (req, res, next) => {
    const startTime = Date.now();

    try {
        let token;
        const clientIP = req.ip || req.connection.remoteAddress;

        // Extract token from headers or cookies
        if (req.headers.authorization?.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        } else if (req.cookies?.token) {
            token = req.cookies.token;
        }

        // No token provided
        if (!token) {
            logSecurityEvent('AUTH_MISSING_TOKEN', {
                ip: clientIP,
                userAgent: req.headers['user-agent'],
                path: req.path
            });
            return sendAuthError(res, 'Authentication required');
        }

        // Verify and decode token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (jwtError) {
            logSecurityEvent('AUTH_INVALID_TOKEN', {
                ip: clientIP,
                error: jwtError.message,
                path: req.path
            });
            return sendAuthError(res, 'Invalid authentication token');
        }

        // Validate JWT payload structure
        if (!validateJWTPayload(decoded)) {
            logSecurityEvent('AUTH_INVALID_PAYLOAD', {
                ip: clientIP,
                payload: decoded,
                path: req.path
            });
            return sendAuthError(res, 'Invalid token payload');
        }

        // Fetch user (excluding sensitive fields)
        const user = await User.findById(decoded.id).select('-password -resetPasswordToken -resetPasswordExpire');

        if (!user) {
            logSecurityEvent('AUTH_USER_NOT_FOUND', {
                ip: clientIP,
                userId: decoded.id,
                path: req.path
            });
            return sendAuthError(res, 'User not found');
        }

        // Check user status
        if (user.status !== 'active') {
            logSecurityEvent('AUTH_INACTIVE_USER', {
                ip: clientIP,
                userId: user._id,
                status: user.status,
                path: req.path
            });
            return sendAuthError(res, 'Account is inactive');
        }

        // Check if token was issued before last password change (if field exists)
        if (user.passwordChangedAt && decoded.iat) {
            const passwordChangedTimestamp = Math.floor(user.passwordChangedAt.getTime() / 1000);
            if (decoded.iat < passwordChangedTimestamp) {
                logSecurityEvent('AUTH_TOKEN_INVALIDATED', {
                    ip: clientIP,
                    userId: user._id,
                    path: req.path
                });
                return sendAuthError(res, 'Token invalidated due to password change');
            }
        }

        // Success - attach user to request
        req.user = user;

        logSecurityEvent('AUTH_SUCCESS', {
            userId: user._id,
            role: user.role,
            ip: clientIP,
            path: req.path,
            duration: Date.now() - startTime
        });

        next();

    } catch (error) {
        logSecurityEvent('AUTH_SYSTEM_ERROR', {
            error: error.message,
            stack: error.stack,
            ip: req.ip || req.connection.remoteAddress,
            path: req.path
        });

        return res.status(500).json({
            success: false,
            message: 'Authentication system error'
        });
    }
};

// Authorization middleware with enhanced security
exports.authorize = (...roles) => {
    return async (req, res, next) => {
        try {
            // Ensure user is authenticated first
            if (!req.user) {
                logSecurityEvent('AUTHZ_NO_USER', {
                    ip: req.ip || req.connection.remoteAddress,
                    path: req.path
                });
                return sendAuthError(res, 'Authentication required', 401);
            }

            // Check if user role is authorized
            if (!roles.includes(req.user.role)) {
                logSecurityEvent('AUTHZ_FORBIDDEN', {
                    userId: req.user._id,
                    userRole: req.user.role,
                    requiredRoles: roles,
                    ip: req.ip || req.connection.remoteAddress,
                    path: req.path
                });

                return sendAuthError(res, 'Insufficient permissions', 403);
            }

            logSecurityEvent('AUTHZ_SUCCESS', {
                userId: req.user._id,
                userRole: req.user.role,
                path: req.path
            });

            next();
        } catch (error) {
            logSecurityEvent('AUTHZ_SYSTEM_ERROR', {
                error: error.message,
                userId: req.user?._id,
                path: req.path
            });

            return res.status(500).json({
                success: false,
                message: 'Authorization system error'
            });
        }
    };
};

// Optional authentication middleware - doesn't block if no token
exports.optionalAuth = async (req, res, next) => {
    try {
        let token;

        // Extract token from headers
        if (req.headers.authorization?.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }

        // No token is OK for optional auth
        if (!token) {
            return next();
        }

        try {
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Validate payload
            if (!validateJWTPayload(decoded)) {
                logSecurityEvent('OPTIONAL_AUTH_INVALID_PAYLOAD', {
                    ip: req.ip || req.connection.remoteAddress,
                    path: req.path
                });
                return next(); // Continue without user
            }

            // Get user (excluding sensitive fields)
            const user = await User.findById(decoded.id)
                .select('-password -resetPasswordToken -resetPasswordExpire');

            // Only attach user if found and active
            if (user && user.status === 'active') {
                req.user = user;

                logSecurityEvent('OPTIONAL_AUTH_SUCCESS', {
                    userId: user._id,
                    role: user.role,
                    path: req.path
                });
            }
        } catch (tokenError) {
            // Log but don't block for optional auth
            logSecurityEvent('OPTIONAL_AUTH_TOKEN_ERROR', {
                error: tokenError.message,
                ip: req.ip || req.connection.remoteAddress,
                path: req.path
            });
        }

        next();
    } catch (error) {
        // Log error but continue for optional auth
        logSecurityEvent('OPTIONAL_AUTH_SYSTEM_ERROR', {
            error: error.message,
            path: req.path
        });
        next();
    }
};

// Export the rate limiter for use in auth routes
exports.authLimiter = authLimiter;