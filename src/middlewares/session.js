const { sendJson } = require('../utils/helpers.js');

const User = require('../models/User.js');

const TOUCH_AFTER_TIME = 3900 * 1000; // 1h 5min
const MAX_AGE = 3900 * 1000; // 1hr 5min 



/**
 * Basic login requirement check
 */

const requireAuth = (req, res, next) => {
	if (!req.session?.user) {
		return sendJson(res, 401, false, "Not authenticated");
	}
	next();
};


/**
 * Main session management middleware
 */
const sessionMiddleware = function(req, res, next) {
	const now = Date.now();
	
	if (!req.session) {
		return next();
	}
	
	try {
		if (!req.session.createdAt) {
			req.session.createdAt = now;
			req.session.lastAccess = now;
			req.session.browserFingerprint = req.headers['user-agent'];
			return next();
		}
		
		if (now - req.session.createdAt > MAX_AGE) {
			return destroySession(req)
				.then(() => {
					res.clearCookie('seismic-scramble.sid');
					next();
				})
				.catch(error => {
					throw error;
				});
		}
		
		if (now - req.session.lastAccess > TOUCH_AFTER_TIME) {
			return destroySession(req)
				.then(() => {
					res.clearCookie('seismic-scramble.sid');
					next();
				})
				.catch(error => {
					throw error;
				});
		}
		
		req.session.lastAccess = now;
		next();
		
	} catch (error) {
		throw error;
	}
};

/**
 * Save session as Promise
 */
const saveSession = async function(req) {
	return new Promise((resolve, reject) => {
		req.session.save((error) => {
			if (error) {
				console.error('Session save error:', error);
				reject(error);
			}
			resolve();
		});
	});
};

/**
 * Destroy session as Promise
 */
const destroySession = async function(req) {
	return new Promise((resolve, reject) => {
		req.session.destroy((error) => {
			if (error) {
				console.error('Session destruction error:', error);
				reject(error);
			}
			resolve();
		});
	});
};



module.exports = {
	saveSession,
	requireLogin,
	destroySession,
	sessionMiddleware
};