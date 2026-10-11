import rateLimit from "express-rate-limit";

const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many login attempts. Please try again after 15 minutes."
    }
});

export default loginRateLimiter;