import rateLimit from 'express-rate-limit';

export const postRateLimit = rateLimit({
    windowMs: 24 * 60 * 60 * 1000,
    max: 3,
    message: {
        message: 'Too many posts created. Please try again after 24 hours.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // FIX: Check if req.user exists, fallback to IP
        const userId = req.user?.userId;
        console.log("Rate limit - User ID:", userId); // Debug log
        return userId || req.ip || 'unknown';
    },
    // Add this to skip if user not authenticated
    skip: (req) => !req.user?.userId
});

export const commentRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: {
        message: 'Too many comments. Please try again after 1 hour.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        const userId = req.user?.userId;
        return userId || req.ip || 'unknown';
    },
    skip: (req) => !req.user?.userId
});

export const likeRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: {
        message: 'Too many likes. Please try again after 1 hour.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        const userId = req.user?.userId;
        return userId || req.ip || 'unknown';
    },
    skip: (req) => !req.user?.userId
});