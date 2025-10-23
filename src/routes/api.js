const express = require("express");
const {
  submitScore,
  startGame,
  getUserProfile,
  getLeaderboard
} = require("../controllers/handlers.js");

const {
  requireLogin
} = require('../middlewares/auth.js')


const router = express.Router();



router.post("/start", requireLogin, startGame);
router.post("/submit", requireLogin, submitScore);



module.exports = router;
