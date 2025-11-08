const User = require('../models/User.js');
const crypto = require('crypto');
const { sendJson, logError } = require('../utils/helpers.js');


const MAX_GAME_TIME = 900000; // 15 minutes
const BASE_SCORE = 1000;
const TIME_PENALTY_RATE = 2;
const SUSPICIOUS_TIME = 30000; // 30 seconds
const CHEAT_SCORE = 10000;
const MAX_SCORE_POSSIBLE = 15000; // Maximum theoretical score
const START_GAME_COOLDOWN = 5000; // 5 seconds between game starts


module.exports.startGame = async function(req, res) {
  try {
    const user_id = req.session?.user?.user_id;
    
    if (!user_id) {
      return sendJson(res, 401, false, "Unauthorized");
    }
    
    const user = await User.findOne({ user_id });
    
    if (!user) {
      return sendJson(res, 400, false, "Invalid request");
    }
    
    // Prevent rapid game session creation (anti-farming)
    if (user.start_time) {
      const timeSinceLastStart = Date.now() - new Date(user.start_time).getTime();
      if (timeSinceLastStart < START_GAME_COOLDOWN) {
        return sendJson(res, 429, false, "Please wait before starting a new game");
      }
    }
    
    // Generate cryptographically secure session token
    const hash = crypto.randomBytes(32).toString('base64url');
    
    user.start_time = new Date();
    user.hash_id = hash;
    await user.save();
    
    return sendJson(res, 201, true, "Game initiated", {
      hash_id: hash,
      max_time: MAX_GAME_TIME
    });
    
  } catch (error) {
    logError('Error starting game', error);
    return sendJson(res, 500, false, "Internal Server Error");
  }
};

/**
 * Submit game score with anti-cheat validation
 */
module.exports.submitScore = async function(req, res) {
  try {
    const { hash_id, score } = req.body;
    const user_id = req.session?.user?.user_id;
    
    if (!user_id) {
      return sendJson(res, 401, false, "Unauthorized");
    }
    
    // Validate inputs
    if (!hash_id || typeof hash_id !== 'string' || !hash_id.trim()) {
      return sendJson(res, 400, false, "Missing or invalid hash_id");
    }
    
    if (typeof score !== 'number' || score < 0) {
      return sendJson(res, 400, false, "Invalid score value");
    }
    
    // Additional score sanity check
    if (score > MAX_SCORE_POSSIBLE) {
      return sendJson(res, 400, false, "Score exceeds maximum possible value");
    }
    
    // Find user with active game session
    const user = await User.findOne({
      user_id,
      hash_id: { $eq: hash_id }
    });
    
    if (!user || !user.start_time) {
      return sendJson(res, 400, false, "Invalid or expired game session");
    }
    
    // Calculate elapsed time
    const elapsed = Date.now() - new Date(user.start_time).getTime();
    
    // Check if game session expired
    if (elapsed > MAX_GAME_TIME) {
      // Clear the expired session
      await User.findOneAndUpdate({ user_id, hash_id }, { $set: { hash_id: null, start_time: null } });
      return sendJson(res, 400, false, "Game session expired");
    }
    
    // Calculate time bonus
    const timeBonus = Math.max(0, BASE_SCORE - (elapsed / 1000) * TIME_PENALTY_RATE);
    const finalScore = Math.round(score + timeBonus);
    
    // Anti-cheat detection
    let radar = 'green';
    
    if (elapsed < SUSPICIOUS_TIME || finalScore > CHEAT_SCORE) {
      radar = 'red';
    } else if (elapsed < SUSPICIOUS_TIME * 1.5 || finalScore > CHEAT_SCORE * 0.7) {
      radar = 'orange';
    }
    
    // Atomic update - prevents replay attacks and race conditions
    const update = await User.findOneAndUpdate(
    {
      user_id,
      hash_id: { $eq: hash_id }
    },
    {
      $max: { score: finalScore },
      $set: {
        radar,
        hash_id: null,
        start_time: null
      }
    }, { new: true });
    
    if (!update) {
      return sendJson(res, 400, false, "Replay detected or invalid session");
    }
    
    const isHighScore = finalScore >= user.score;
    
    return sendJson(res, 200, true, "Score submitted", {
      score: finalScore,
      time: Math.round(elapsed / 1000),
      radar,
      isHighScore,
      previousHighScore: user.score
    });
    
  } catch (error) {
    logError("Error submitting score", error);
    return sendJson(res, 500, false, "Internal Server Error");
  }
};



module.exports.getLeaderboard = async function(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100); // Cap at 100
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const skip = (page - 1) * limit;
    
    // Get top players by score
    const topPlayers = await User.find()
      .select('username user_id avatar score radar createdAt')
      .sort({ score: -1, createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Get total count for pagination
    const totalUsers = await User.countDocuments();
    
    // Add rank to each player
    const leaderboard = topPlayers.map((player, index) => ({
      rank: skip + index + 1,
      username: player.username,
      user_id: player.user_id,
      avatar: player.avatar,
      score: player.score,
      radar: player.radar // Include radar status for transparency
    }));
    
    return sendJson(res, 200, true, 'Leaderboard fetched successfully', {
      leaderboard,
      pagination: {
        page,
        limit,
        total: totalUsers,
        totalPages: Math.ceil(totalUsers / limit)
      }
    });
    
  } catch (error) {
    logError('Error fetching leaderboard', error);
    return sendJson(res, 500, false, 'Internal server error occurred');
  }
};

/**
 * Get user profile with rank
 */
module.exports.getUserProfile = async function(req, res) {
  try {
    const user = req.session?.user;
    
    if (!user) {
      return sendJson(res, 401, false, 'You are not authenticated');
    }
    
    const userProfile = await User.findOne({ user_id: user.user_id })
      .select('username user_id avatar score radar createdAt')
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