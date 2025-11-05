const express = require("express");

// Game/Submission handlers
const {
  submitScore,
  startGame,
  getUserProfile: getPublicUserProfile,
  getLeaderboard: getPublicLeaderboard,
  getCurrentGameStatus
} = require("../controllers/handlers.js");

// User/Auth handlers
const {
  createUser,
  userLogin,
  logoutUser,
  updateScore,
  getLeaderboard,
  getUserProfile,
  deleteAccount
} = require("../controllers/user.js");

const {
  requireLogin
} = require('../middlewares/session.js');

const router = express.Router();




router.post("/auth/signup", createUser);
router.post("/auth/login", userLogin);

// Public leaderboard and profiles
router.get("/leaderboard", getPublicLeaderboard);
router.get("/profile/:username", getPublicUserProfile);

// ==========================================
// PROTECTED ROUTES (Authentication required)
// ==========================================


router.post("/game/start", requireLogin, startGame);
router.post("/game/submit", requireLogin, submitScore);
router.get("/game/status", requireLogin, getCurrentGameStatus);

// User management
router.get("/user/profile", requireLogin, getUserProfile);
router.post("/user/update-score", requireLogin, updateScore);
router.get("/user/leaderboard", requireLogin, getLeaderboard);
router.post("/user/logout", requireLogin, logoutUser);
router.delete("/user/account", requireLogin, deleteAccount);

module.exports = router;