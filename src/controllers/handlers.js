const User = require('../models/User');
const { sendJson } = require('../utils/helpers');

const MAX_GAME_TIME = 300000; // 5 minutes
const BASE_SCORE = 1000;
const TIME_PENALTY_RATE = 2;
const SUSPICIOUS_TIME = 30000; // 30 seconds
const CHEAT_SCORE = 10000;

module.exports.SubmitScore = async function(req, res) {
  try {
    const { hash_id, score } = req.body;
    const user_id = req.user?.user_id;
    
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
    return sendJson(res, 500, false, "Internal Server Error");
  }
};

module.exports.StartGame = async function(req, res) {
  try {
    const  user = req.user;
    const userId = user.user_id;
    
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
    return sendJson(res, 500, false, "Internal Server Error");
  }
};

module.exports.getUserProfile = async (req, res) => {
  try {
    const { username } = req.params;
    
    const user = await User.findOne({ username })
      .select('username profile radar score created_at')
      .lean();
    
    if (!user) {
      return sendJson(res, 404, false, "User not found");
    }
    
    return sendJson(res, 200, true, "User data", { user });
  } catch (err) {
    return sendJson(res, 500, false, "Error fetching profile");
  }
};

module.exports.getLeaderboard = async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
    
    const users = await User.find()
      .select('username profile score radar created_at -_id')
      .sort({ score: -1 })
      .limit(limit)
      .lean();
    
    return res.status(200).json({
      success: true,
      data: users,
      count: users.length
    });
  } catch (err) {
    return sendJson(res, 500, false, "Error fetching leaderboard");
  }
};