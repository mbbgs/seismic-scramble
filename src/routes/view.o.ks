/* 
const express = require("express");
const passport = require("passport");
const router = express.Router();

const { renderView } = require('../utils/helpers.js')

router.get("/", (req, res) => {
  try {
    if (req.isAuthenticated()) {
      return renderView('index.html', {
        username: req.user.username,
        profile: req.user.profile,
        score: req.user.score,
        radar: req.user.radar,
      })
    }
    return renderView('index.html', {})
  } catch (error) {
    console.error('Error loading page')
    return res.status(500).html('error_500.html')
  }
});

router.get("/headboard", (req,res)=>{})
router.get("/score/:hash_id",(req,res)=>{})

router.get("/auth/twitter", passport.authenticate("twitter"));

router.get(
  "/auth/twitter/callback",
  passport.authenticate("twitter", { failureRedirect: "/" }),
  (req, res) => res.redirect("/")
);

router.get("/logout", (req, res) => {
  req.logout(() => res.redirect("/"));
});

module.exports = router;
*/

const express = require("express");
const passport = require("passport");
const router = express.Router();
const User = require("../models/User");


// ✅ Safe render helper
function safeRender(res, view, data = {}) {
	try {
		res.render(view, data);
	} catch (err) {
		console.error(`Error rendering ${view}:`, err);
		res.status(500).render("error_500.html");
	}
}

// 🧠 Middleware to protect routes
function ensureAuth(req, res, next) {
	if (req.isAuthenticated()) return next();
	return res.redirect("/");
}

// 🏠 Homepage (sanitized)
router.get("/", async (req, res) => {
	try {
		if (req.isAuthenticated()) {
			// Only expose minimal safe data
			const safeUser = {
				username: req.user.username,
				profile: req.user.profile,
				score: req.user.score,
				radar: req.user.radar,
			};
			return safeRender(res, "index.html", safeUser);
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


// 🏁 Leaderboard (rate-limited & minimal info)
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

// 🧩 Score lookup — only by secure hash
router.get("/score/:hash_id", ensureAuth, async (req, res) => {
	try {
		const { hash_id } = req.params;
		if (!/^[A-Za-z0-9+/=]+$/.test(hash_id)) {
			return res.status(400).render("error_400.html");
		}
		
		const user = await User.findOne({ hash_id }).select("username profile score radar").lean();
		if (!user) return res.status(404).render("error_404.html");
		
		safeRender(res, "score.html", { user });
	} catch (err) {
		console.error("Error loading score page:", err);
		res.status(500).render("error_500.html");
	}
});

// 🔐 Twitter auth routes
router.get("/auth/twitter", passport.authenticate("twitter", { scope: ["tweet.read", "users.read"] }));

router.get(
	"/auth/twitter/callback",
	passport.authenticate("twitter", { failureRedirect: "/" }),
	(req, res) => res.redirect("/")
);

// 🚪 Logout
router.get("/logout", ensureAuth, (req, res, next) => {
	req.logout(err => {
		if (err) return next(err);
		res.redirect("/");
	});
});

module.exports = router;
