const express = require("express");
const router = express.Router();


const { requireAuth } = require("../middlewares/session.js");



// Safe render helper
function safeRender(res, view, data = {}) {
  try {
    res.render(view, data);
  } catch (err) {
    console.error(`Error rendering ${view}:`, err);
    res.status(500).render("error_500.html");
  }
}



router.get("/stage", requireAuth, async (req, res) => {
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
    if (req.session?.user) {
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



module.exports = router;