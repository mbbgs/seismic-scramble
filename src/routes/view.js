const express = require("express");
const router = express.Router();
const User = require("../models/User.js");
const oauthController = require("../controllers/oauth.js");
const tokenManager = require("../utils/tokenManager.js");

// Safe render helper
function safeRender(res, view, data = {}) {
  try {
    res.render(view, data);
  } catch (err) {
    console.error(`Error rendering ${view}:`, err);
    res.status(500).render("error_500.html");
  }
}

// Auth middleware
function ensureAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  return res.redirect("/");
}


router.get("/stage", ensureAuth, async (req, res) => {
  try {
    const safeUser = {
      username: req.user.username,
      profile: req.user.profile,
      score: req.user.score,
      radar: req.user.radar,
    };
    
    return safeRender(res, "index.html", safeUser);
  } catch (error) {
    console.error("Error loading stage:", error);
    return res.status(500).render("error_500.html");
  }
});

// Homepage
router.get("/", async (req, res) => {
  try {
    if (req.isAuthenticated()) {
      return res.redirect("/stage");
    }
    return safeRender(res, "index.html", {
      username: "",
      profile: "",
      score: "",
      radar: "",
    });
  } catch (error) {
    console.error("Error loading homepage:", error);
    return res.status(500).render("error_500.html");
  }
});

// Leaderboard
router.get("/leaderboard", ensureAuth, async (req, res) => {
  try {
    const users = await User.find()
      .select("username profile radar score -_id")
      .sort({ score: -1 })
      .limit(20)
      .lean();
    
    return safeRender(res, "leaderboard.html", { users });
  } catch (err) {
    console.error("Error loading leaderboard:", err);
    res.status(500).render("error_500.html");
  }
});

// Score lookup
router.get("/score/:hash_id", ensureAuth, async (req, res) => {
  try {
    const { hash_id } = req.params;
    if (!/^[A-Za-z0-9_-]+$/.test(hash_id)) {
      return res.status(400).render("error_400.html");
    }
    
    const user = await User.findOne({ hash_id })
      .select("username profile score radar")
      .lean();
    
    if (!user) return res.status(404).render("error_404.html");
    
    safeRender(res, "score.html", { user });
  } catch (err) {
    console.error("Error loading score page:", err);
    res.status(500).render("error_500.html");
  }
});

// OAuth routes
router.get("/auth/twitter", (req, res) => oauthController.initiateAuth(req, res));

router.get("/auth/twitter/callback", (req, res) =>
  oauthController.handleCallback(req, res)
);

// Logout with token revocation
router.get("/logout", ensureAuth, async (req, res, next) => {
  try {
    // Revoke tokens
    await tokenManager.revokeTokens(req.user.user_id);
    
    req.logout((err) => {
      if (err) return next(err);
      res.redirect("/");
    });
  } catch (err) {
    console.error("Logout error:", err);
    next(err);
  }
});

module.exports = router;