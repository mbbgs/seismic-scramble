const express = require("express");


const {
  submitScore,
  startGame,
  updateScore
} = require("../controllers/handlers.js");


const {
  createUser,
  userLogin,
  logoutUser,
  getUserProfile,
  deleteAccount
} = require("../controllers/auth.js");

const {
  requireAuth
} = require('../middlewares/session.js');

const router = express.Router();




router.post("/auth/signup", createUser);
router.post("/auth/login", userLogin);

// Public leaderboard and profiles
//router.get("/profile/:username", getPublicUserProfile);

// ==========================================
// PROTECTED ROUTES (Authentication required)
// ==========================================


router.post("/game/start", requireAuth, startGame);
router.post("/game/submit", requireAuth, submitScore);

// User management
router.get("/user/profile", requireAuth, getUserProfile);
router.post("/user/update-score", requireAuth, updateScore);
router.post("/user/logout", requireAuth, logoutUser);
router.delete("/user/account", requireAuth, deleteAccount);

module.exports = router;