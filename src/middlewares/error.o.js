const path = require('path')
const fs = require('fs')



// Path to your views folder
const VIEWS_DIR = path.join(__dirname, '../views');

// Function to read HTML files synchronously
const readHtmlFile = (filename) => {
	const filePath = path.join(VIEWS_DIR, filename);
	return fs.readFileSync(filePath, 'utf8');
};

// Error pages
const e404 = readHtmlFile('error_404.html');
const e500 = readHtmlFile('error_500.html');

const ERROR_PAGES = {
	500: e500, 
	404: e404,
};



const sanitizeError = (err, includeStack = false) => {
	const sanitized = {
		status: err.status || 500,
		message: err.message || 'An unexpected error occurred'
	};
	
	// Only include stack trace if explicitly requested and not in production
	if (includeStack && process.env.NODE_ENV !== 'production') {
		sanitized.stack = err.stack;
	}
	
	return sanitized;
};


// Global error handling middleware
const globalErrorHandler = (err, req, res, next) => {
	// Determine the appropriate status code
	const statusCode = err.status || 500;
	
	// Sanitize the error message for production
	const sanitizedError = sanitizeError(err);
	
	logger.error('Request Error', {
		method: req.method,
		url: req.originalUrl,
		// No sensitive data in production
		body: process.env.NODE_ENV === 'production' ? '[REDACTED]' : req.body,
		query: process.env.NODE_ENV === 'production' ? '[REDACTED]' : req.query,
		params: req.params,
		statusCode,
		errorMessage: sanitizedError.message,
		stack: err.stack,
		// Include request metadata
		requestId: req.id,
		ip: req.ip,
		userAgent: req.get('user-agent')
	});
	
	// Determine the appropriate error page
	const errorPage = ERROR_PAGES[statusCode] || ERROR_PAGES[500];
	
	// Set security headers
	res.setHeader('X-Content-Type-Options', 'nosniff');
	res.setHeader('X-Frame-Options', 'DENY');
	
	// Respond based on the request type
	if (req.accepts('html')) {
		res.status(statusCode).type('html').send(errorPage);
	} else if (req.accepts('json')) {
		res.status(statusCode).json({
			error: sanitizedError
		});
	} else {
		res.status(statusCode).type('text').send(sanitizedError.message);
	}
};

// 404 handler for undefined routes
const notFoundHandler = (req, res) => {
	const errorPage = ERROR_PAGES[404];
	res.status(404).type('html').send(errorPage);
};

module.exports = {
	notFoundHandler,
	globalErrorHandler
}