const express = require("express");
const router = express.Router();
const User = require('../models/User.js')

const { requireAuth, destroySession } = require("../middlewares/session.js");



// Safe render helper
function safeRender(res, view, data = {}) {
  try {
    res.render(view, data);
  } catch (err) {
    console.error(`Error rendering ${view}:`, err);
    res.status(500).redirect("/error");
  }
}



router.get("/stage", async (req, res) => {
  try {
    let user = req.session?.user;
    if (!user) {
      return res.redirect("/");
    }
    
    const safeUser = {
      username: user.username,
      score: user.score,
      radar: user.radar,
      avatar: user.avatar
    };
    
    return safeRender(res, "game.html", { user: safeUser });
  } catch (error) {
    console.error("Error loading stage:", error);
    return res.status(500).redirect("/error");
  }
});


router.get("/score/:hash_id", async (req, res) => {
  try {
    const user = req.session?.user;
    if (!user) {
      return safeRender(res, "score.html", {
        user: null,
        message: "You are not logged in. Please start a new session."
      });
    }
    
    const { hash_id } = req.params;
    const dbUser = await User.findOne({ user_id: user.user_id });
    
    if (!dbUser) {
      return safeRender(res, "score.html", {
        user: null,
        message: "User not found."
      });
    }
    
    let message = null;
    if (dbUser.current_hash_id !== hash_id) {
      message = "This game session has expired or is invalid.";
    }
    
    const safeUser = {
      username: dbUser.username,
      score: dbUser.score,
      radar: dbUser.radar,
      avatar: dbUser.avatar,
    };
    
    return safeRender(res, "score.html", { user: safeUser, message });
  } catch (error) {
    console.error("Error loading score:", error);
    return safeRender(res, "error_500.html");
  }
});



router.get("/error", async (req, res) => {
  return res.status(500).render("error_500.html");
});

router.get("/not-found", async (req, res) => {
  return res.status(500).render("error_500.html");
});

router.get("/hehe", async (req, res) => {
  return res.status(500).render("error_403.html");
});


// Homepage
router.get("/", async (req, res) => {
  try {
    if (req.session?.user) {
      return res.redirect("/stage");
    }
    return safeRender(res, "index.html", {});
  } catch (error) {
    console.error("Error loading homepage:", error);
    return res.status(500).redirect("/error");
  }
});

router.get("/logout", async (req, res) => {
  try {
    
    if (!req.session?.user) {
      return res.redirect("/hehe");
    }
    
    // Destroy session safely
    await destroySession(req);
    
    res.clearCookie("ss-scramble.sid");
    res.setHeader("Clear-Site-Data", '"cache","cookies","storage"');
    return res.redirect("/");
  } catch (error) {
    console.error("Error clearing user cookies:", error);
    return res.status(500).redirect("/error");
  }
});

router.get('/leaderboard', async (req, res) => {
  try {
    const sessionUser = req.session?.user;
    
    let safeUser = {
      username: 'Guest',
      avatar: '/default-avatar.jpg',
      score: 0,
      radar: '-'
    };
    
    if (sessionUser) {
      safeUser = {
        username: sessionUser.username,
        avatar: sessionUser.avatar || '/default-avatar.jpg',
        score: sessionUser.score || 0,
        radar: sessionUser.radar || '-'
      };
    }
    
    const limit = parseInt(req.query.limit) || 50;
    
    const topPlayers = await User.find()
      .select('username user_id avatar score radar createdAt')
      .sort({ score: -1, createdAt: 1 })
      .limit(limit)
      .lean();
    
    const leaderboard = topPlayers.map((player, index) => ({
      rank: index + 1,
      username: player.username,
      user_id: player.user_id,
      avatar: player.avatar || '/default-avatar.jpg',
      score: player.score,
      radar: player.radar || '—'
    }));
    
    return safeRender(res, 'leaderboard.html', { user: safeUser, leaderboard });
  } catch (error) {
    console.error('Error loading leaderboard:', error);
    return res.status(500).redirect('/error');
  }
});


module.exports = router;