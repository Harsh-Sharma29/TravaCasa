const rateLimit = require('express-rate-limit');
const validator = require('validator');
const bcrypt = require('bcryptjs');

// Rate limiting for login attempts
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: {
        error: 'Too many login attempts, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful requests
    handler: (req, res, next) => {
        req.flash('error', 'Too many login attempts. Please try again in 15 minutes.');
        return res.redirect('/login');
    }
});

// Rate limiting for signup attempts
const signupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 signup attempts per hour
    message: {
        error: 'Too many signup attempts, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next) => {
        req.flash('error', 'Too many signup attempts. Please try again in an hour.');
        return res.redirect('/signup');
    }
});

// Password validation middleware
const validatePassword = (req, res, next) => {
    const { password, confirmPassword } = req.body;
    
    // Check if passwords match
    if (password !== confirmPassword) {
        req.flash('error', 'Passwords do not match.');
        return res.redirect('/signup');
    }
    
    // Password strength validation
    const passwordErrors = [];
    
    if (password.length < 8) {
        passwordErrors.push('Password must be at least 8 characters long');
    }
    
    if (!/(?=.*[a-z])/.test(password)) {
        passwordErrors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/(?=.*[A-Z])/.test(password)) {
        passwordErrors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/(?=.*\d)/.test(password)) {
        passwordErrors.push('Password must contain at least one number');
    }
    
    if (!/(?=.*[@$!%*?&])/.test(password)) {
        passwordErrors.push('Password must contain at least one special character (@$!%*?&)');
    }
    
    if (passwordErrors.length > 0) {
        req.flash('error', passwordErrors.join('. '));
        return res.redirect('/signup');
    }
    
    next();
};

// Email validation middleware
const validateEmail = (req, res, next) => {
    const { email } = req.body;
    
    if (!validator.isEmail(email)) {
        req.flash('error', 'Please enter a valid email address.');
        return res.redirect('/signup');
    }
    
    // Check for disposable email domains (optional)
    const disposableDomains = ['10minutemail.com', 'tempmail.org', 'guerrillamail.com'];
    const emailDomain = email.split('@')[1];
    
    if (disposableDomains.includes(emailDomain)) {
        req.flash('error', 'Please use a valid email address.');
        return res.redirect('/signup');
    }
    
    next();
};

// Enhanced isLoggedIn middleware with session security
const isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.session.returnTo = req.originalUrl;
        req.flash('error', 'You must be logged in to access this page.');
        return res.redirect('/login');
    }
    
    // Check if session is still valid (optional: add session timeout logic)
    if (req.session.lastActivity && (Date.now() - req.session.lastActivity) > 30 * 60 * 1000) {
        req.logout((err) => {
            if (err) console.error('Logout error:', err);
        });
        req.flash('error', 'Your session has expired. Please log in again.');
        return res.redirect('/login');
    }
    
    // Update last activity timestamp
    req.session.lastActivity = Date.now();
    next();
};

// Middleware to check if user is the owner of a resource
const isOwner = (Model) => {
    return async (req, res, next) => {
        try {
            const { id } = req.params;
            const resource = await Model.findById(id);
            
            if (!resource) {
                req.flash('error', 'Resource not found.');
                return res.redirect('/listings');
            }
            
            if (!resource.owner.equals(req.user._id)) {
                req.flash('error', 'You do not have permission to perform this action.');
                return res.redirect(`/listings/${id}`);
            }
            
            next();
        } catch (error) {
            req.flash('error', 'An error occurred while checking permissions.');
            return res.redirect('/listings');
        }
    };
};

// Middleware to check if user is the author of a review
const isReviewAuthor = async (req, res, next) => {
    try {
        const { reviewId } = req.params;
        const Review = require('../models/review');
        const review = await Review.findById(reviewId);
        
        if (!review) {
            req.flash('error', 'Review not found.');
            return res.redirect('/listings');
        }
        
        if (!review.author.equals(req.user._id)) {
            req.flash('error', 'You do not have permission to perform this action.');
            return res.redirect(`/listings/${req.params.listingId}`);
        }
        
        next();
    } catch (error) {
        req.flash('error', 'An error occurred while checking permissions.');
        return res.redirect('/listings');
    }
};

// Sanitize input middleware
const sanitizeInput = (req, res, next) => {
    const sanitizeString = (str) => {
        if (typeof str !== 'string') return str;
        return str.trim().replace(/[<>]/g, '');
    };
    
    // Sanitize common form fields
    if (req.body.username) req.body.username = sanitizeString(req.body.username);
    if (req.body.email) req.body.email = sanitizeString(req.body.email);
    
    // Sanitize listing data if present
    if (req.body.listing) {
        Object.keys(req.body.listing).forEach(key => {
            if (typeof req.body.listing[key] === 'string') {
                req.body.listing[key] = sanitizeString(req.body.listing[key]);
            }
        });
    }
    
    next();
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
};

module.exports = {
    loginLimiter,
    signupLimiter,
    validatePassword,
    validateEmail,
    isLoggedIn,
    isOwner,
    isReviewAuthor,
    sanitizeInput,
    securityHeaders
};
