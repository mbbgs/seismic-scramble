const rateLimit = require('express-rate-limit');

// General app-wide rate limite

const appLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100, // 100 requests per windowMs
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
	handler: (req, res) => {
		res.status(429).json({
			success: false,
			status: 429,
			message: 'Too many requests from this IP. Please wait a while then try again'
		});
	}
});
module.exports = {
	appLimiter
}
