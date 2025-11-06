const express = require("express");
const router = express.Router();


const { requireAuth, destroySession } = require("../middlewares/session.js");



// Safe render helper
function safeRender(res, view, data = {}) {
  try {
    res.render(view, data);
  } catch (err) {
    console.error(`Error rendering ${view}:`, err);
    res.status(500).render("error_500.html");
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
    return res.status(500).render("error_500.html");
  }
});

router.get("/score/:hash_id", async (req, res) => {
  try {
    const user = req.session?.user;
    if (!user) return res.redirect("/");
    
    const { hash_id } = req.params;
    
    
    const dbUser = await User.findOne({
      user_id: { $eq: user._id }
    });
    
    if (!dbUser) return res.redirect("/");
    
    if (dbUser.current_hash_id !== hash_id) {
      return res.redirect(`/score/${dbUser.hash_id}`);
    }
    
    const safeUser = {
      username: dbUser.username,
      score: dbUser.score,
      radar: dbUser.radar,
      avatar: dbUser.avatar,
    };
    
    return safeRender(res, "score.html", { user: safeUser });
  }
  catch (error) {
    console.error("Error loading score:", error);
    return res.status(500).render("error_500.html");
  }
});


router.get("/error", async (req, res) => {
  return res.status(500).render("error_500.html");
});

router.get("/not-found", async (req, res) => {
  return res.status(500).render("error_500.html");
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
    return res.status(500).render("error_500.html");
  }
});

router.get("/logout", async (req, res) => {
  try {
    
    if (req.session?.user) {
      return res.redirect("/");
    }
    // Destroy session safely
    await destroySession(req);
    
    res.clearCookie("ss-scramble.sid");
    res.setHeader("Clear-Site-Data", '"cache","cookies","storage"');
    return res.redirect("/index.html");
  } catch (error) {
    console.error("Error clearing user cookies:", error);
    return res.status(500).redirect("/index.html");
  }
});

router.get('/leaderboard', async (req, res) => {
  try {
    const sessionUser = req.session?.user;

    const limit = parseInt(req.query.limit) || 50;

    // Get top users by score
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

    const safeUser = {
      username: sessionUser.username,
      avatar: sessionUser.avatar,
      score: sessionUser.score,
      radar: sessionUser.radar
    };

    return safeRender(res, 'leaderboard.html', { user: safeUser, leaderboard });
  } catch (error) {
    console.error('Error loading leaderboard:', error);
    return res.status(500).render('error_500.html');
  }
});

module.exports = router;