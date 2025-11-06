const mongoose = require('mongoose');
const User = require('../models/User.js');
const crypto = require('crypto');

const { saveSession, destroySession } = require('../middlewares/session.js');
const { sendJson, logError, validateInput: isValidInput } = require('../utils/helpers.js');

const isPasswordComplex = (password) => {
	const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
	return regex.test(password);
};


// Generate unique user_id
function generateUserId() {
	return crypto.randomBytes(16).toString('hex');
}

function generateDefaultAvatar(username) {
	return `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=333333&color=fff&size=200`;
}

async function validateUniqueUsername(username = '') {
	let baseUsername = username.trim();
	let isUsernameInUse = await User.exists({ username: baseUsername });
	
	if (!isUsernameInUse) {
		return baseUsername;
	}
	
	// Append random suffix if username exists
	let attempts = 0;
	while (isUsernameInUse && attempts < 10) {
		const suffix = Math.floor(Math.random() * 9999);
		baseUsername = `${username.trim()}_${suffix}`;
		isUsernameInUse = await User.exists({ username: baseUsername });
		attempts++;
	}
	
	return baseUsername;
}

module.exports.createUser = async function(req, res) {
	const session = await mongoose.startSession();
	session.startTransaction();
	
	try {
		const { username = '', password = '' } = req.body;
		
		if (!isValidInput(username.trim()) || !isValidInput(password.trim())) {
			await session.abortTransaction();
			return sendJson(res, 400, false, 'Provide required credentials');
		}
		
		if (!isPasswordComplex(password.trim())) {
			await session.abortTransaction();
			return sendJson(res, 400, false, 'Password must be at least 8 characters long and include uppercase, lowercase, numbers, and special characters');
		}
		
		// Check if username already exists
		const existingUser = await User.findOne({ username: username.trim() }).session(session);
		if (existingUser) {
			await session.abortTransaction();
			return sendJson(res, 403, false, 'Username already in use');
		}
		
		// Prepare user data
		const uniqueUsername = await validateUniqueUsername(username);
		const hashedPassword = await User.hashPassword(password.trim());
		const userId = generateUserId();
		const avatar = generateDefaultAvatar(uniqueUsername);
		const hash = crypto.randomBytes(16).toString('base64');

		const userData = {
			username: uniqueUsername,
			password: hashedPassword,
			user_id: userId,
			avatar: avatar,
			hash_id: hash,
			score: 0
		};
		
		// Create user within transaction
		const newUser = await User.create([userData], { session });
		if (!newUser || !newUser[0]) {
			throw new Error('User creation failed');
		}
		
		// Set session data
		req.session.user = {
			userId: newUser[0]._id,
			username: newUser[0].username,
			user_id: newUser[0].user_id,
			score: newUser[0].score
		};
		
		// Save session
		await saveSession(req);
		
		// Commit transaction
		await session.commitTransaction();
		
		return sendJson(res, 201, true, 'Account created successfully', {
			username: newUser[0].username
		});
		
	} catch (error) {
		await session.abortTransaction();
		logError('Error creating user', error);
		
		if (error.message === 'User creation failed') {
			return sendJson(res, 500, false, 'Account creation failed');
		}
		return sendJson(res, 500, false, 'Internal server error occurred');
	} finally {
		session.endSession();
	}
};



module.exports.userLogin = async function(req, res) {
	try {
		const { username = '', password = '' } = req.body;
		
		// Clear existing session if present
		if (req.session.user) {
			req.session.user = null;
		}
		
		// Validate input
		if (!isValidInput(username.trim()) || !isValidInput(password.trim())) {
			return sendJson(res, 400, false, 'Provide credentials to login');
		}
		
		// Find user by username
		const isUser = await User.findOne({ username: username.trim() });
		if (!isUser) {
			return sendJson(res, 404, false, 'User not found');
		}
		
		// Compare password
		const isMatched = await isUser.comparePassword(password.trim());
		if (!isMatched) {
			return sendJson(res, 401, false, 'Invalid credentials');
		}
		
		const sessionData = {
			userId: isUser._id,
			username: isUser.username,
			user_id: isUser.user_id,
			score: isUser.score,
			avatar: isUser.avatar,
			lastLogin: new Date()
		};
		
		// Regenerate session for security
		await new Promise((resolve, reject) => {
			req.session.regenerate((err) => {
				if (err) {
					reject(err);
				} else {
					req.session.user = sessionData;
					resolve();
				}
			});
		});
		
		// Save the session
		await saveSession(req);
		
		
		return sendJson(res, 200, true, 'Login successful', {
			username: isUser.username,
			user_id: isUser.user_id,
			score: isUser.score,
			avatar: isUser.avatar,
			joinedOn: isUser.createdAt.toDateString()
		});
		
	} catch (error) {
		logError('Error logging in user', error);
		return sendJson(res, 500, false, 'Internal server error occurred');
	}
};



module.exports.deleteAccount = async function(req, res) {
	const session = await mongoose.startSession();
	session.startTransaction();
	
	try {
		const user = req.session?.user;
		const password = req.body?.password?.trim();
		
		if (!user) {
			await session.abortTransaction();
			return sendJson(res, 401, false, 'You are not authenticated');
		}
		
		if (!password) {
			await session.abortTransaction();
			return sendJson(res, 400, false, 'Provide password to continue');
		}
		
		const isUser = await User.findById(user.userId).session(session);
		
		if (!isUser) {
			await session.abortTransaction();
			return sendJson(res, 404, false, 'User not found');
		}
		
		const isPasswordValid = await isUser.comparePassword(password);
		if (!isPasswordValid) {
			await session.abortTransaction();
			return sendJson(res, 401, false, 'Invalid credentials');
		}
		
		// Delete user
		await User.findByIdAndDelete(isUser._id).session(session);
		
		// Destroy session
		await destroySession(req);
		
		await session.commitTransaction();
		res.clearCookie('ss-scramble.sid');
		return sendJson(res, 200, true, 'Account deleted successfully');
		
	} catch (error) {
		await session.abortTransaction();
		logError('Error deleting account', error);
		return sendJson(res, 500, false, 'Failed to delete account');
	} finally {
		session.endSession();
	}
};

module.exports.logoutUser = async function(req, res) {
	try {
		const user = req.session?.user;
		if (!user) {
			return sendJson(res, 401, false, 'You are not authenticated');
		}
		
		await destroySession(req);
		
		res.clearCookie('ss-scramble.sid');
		
		
		res.setHeader('Clear-Site-Data', '"cache","cookies","storage"');
		return sendJson(res, 200, true, 'Logged out successfully');
	} catch (error) {
		logError('Error clearing user cookies', error);
		return sendJson(res, 500, false, 'Internal server error occurred');
	}
};