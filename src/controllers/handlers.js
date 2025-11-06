const User = require('../models/User.js');
const { sendJson,logError } = require('../utils/helpers.js');

const MAX_GAME_TIME = 300000; // 5 minutes
const BASE_SCORE = 1000;
const TIME_PENALTY_RATE = 2;
const SUSPICIOUS_TIME = 30000; // 30 seconds
const CHEAT_SCORE = 10000;

module.exports.submitScore = async function(req, res) {
	try {
		const { hash_id, score } = req.body;
		const user_id = req.session?.user.user_id;
		
		if (!hash_id || !score) {
			return sendJson(res, 400, false, "Missing required fields");
		}
		
		const user = await User.findOne({
			hash_id: { $eq: hash_id },
			userId: { $eq: user_id }
		});
		
		if (!user || !user.start_time) {
			return sendJson(res, 400, false, "Invalid game session");
		}
		
		const elapsed = Date.now() - new Date(user.start_time).getTime();
		
		if (elapsed > MAX_GAME_TIME) {
			return sendJson(res, 400, false, "Game session expired");
		}
		
		const timeBonus = Math.max(0, BASE_SCORE - (elapsed / 1000) * TIME_PENALTY_RATE);
		const finalScore = Math.round(score + timeBonus);
		
		let radar = 'green';
		if (elapsed < SUSPICIOUS_TIME || finalScore > CHEAT_SCORE) {
			radar = 'red';
		} else if (elapsed < SUSPICIOUS_TIME * 1.5 || finalScore > CHEAT_SCORE * 0.7) {
			radar = 'orange';
		}
		
		if (finalScore > user.score) {
			user.score = finalScore;
			user.radar = radar;
			user.hash_id = null;
			user.start_time = null;
			await user.save();
		}
		
		return sendJson(res, 200, true, "Score submitted", {
			score: finalScore,
			time: Math.round(elapsed / 1000),
			radar: radar,
			isHighScore: finalScore > user.score
		});
		
	} catch (error) {
		logError('Error submitting score', error)
		return sendJson(res, 500, false, "Internal Server Error");
	}
};

module.exports.startGame = async function(req, res) {
	try {
		
		const user_id = req.session?.user.user_id;
		const isUser = await User.findOne({ userId });
		if (!isUser) {
			return sendJson(res, 400, false, "Invalid request");
		}
		
		const hash = crypto.randomBytes(16).toString('base64');
		isUser.start_time = new Date();
		isUser.hash_id = hash;
		await isUser.save();
		
		return sendJson(res, 201, true, "Game initiated", { hash_id: hash });
	} catch (error) {
		logError('Error starting game', error);
		return sendJson(res, 500, false, "Internal Server Error");
	}
};


module.exports.updateScore = async function(req, res) {
	try {
		const user = req.session?.user;
		const { score } = req.body;
		
		if (!user) {
			return sendJson(res, 401, false, 'You are not authenticated');
		}
		
		if (typeof score !== 'number' || score < 0) {
			return sendJson(res, 400, false, 'Invalid score value');
		}
		
		// Update user score
		const updatedUser = await User.findByIdAndUpdate(
			user.userId, { $inc: { score: score } }, { new: true }
		);
		
		if (!updatedUser) {
			return sendJson(res, 404, false, 'User not found');
		}
		
		// Update session
		req.session.user.score = updatedUser.score;
		await saveSession(req);
		
		return sendJson(res, 200, true, 'Score updated successfully', {
			score: updatedUser.score
		});
		
	} catch (error) {
		logError('Error updating score', error);
		return sendJson(res, 500, false, 'Internal server error occurred');
	}
};

module.exports.getLeaderboard = async function(req, res) {
	try {
		const limit = parseInt(req.query.limit) || 50;
		
		// Get top players by score
		const topPlayers = await User.find()
			.select('username user_id avatar score createdAt')
			.sort({ score: -1, createdAt: 1 })
			.limit(limit)
			.lean();
		
		// Add rank to each player
		const leaderboard = topPlayers.map((player, index) => ({
			rank: index + 1,
			username: player.username,
			user_id: player.user_id,
			avatar: player.avatar,
			score: player.score
		}));
		
		return sendJson(res, 200, true, 'Leaderboard fetched successfully', {
			leaderboard
		});
		
	} catch (error) {
		logError('Error fetching leaderboard', error);
		return sendJson(res, 500, false, 'Internal server error occurred');
	}
};

module.exports.getUserProfile = async function(req, res) {
	try {
		const user = req.session?.user;
		
		if (!user) {
			return sendJson(res, 401, false, 'You are not authenticated');
		}
		
		const userProfile = await User.findById(user.userId)
			.select('username user_id avatar score createdAt')
			.lean();
		
		if (!userProfile) {
			return sendJson(res, 404, false, 'User not found');
		}
		
		// Get user's rank
		const rank = await User.countDocuments({
			$or: [
				{ score: { $gt: userProfile.score } },
				{
					score: userProfile.score,
					createdAt: { $lt: userProfile.createdAt }
				}
			]
		}) + 1;
		
		return sendJson(res, 200, true, 'Profile fetched successfully', {
			...userProfile,
			rank
		});
		
	} catch (error) {
		logError('Error fetching user profile', error);
		return sendJson(res, 500, false, 'Internal server error occurred');
	}
};