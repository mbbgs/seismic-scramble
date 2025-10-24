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

// 🏠 Homepage
router.get("/", async (req, res) => {
	try {
		if (req.isAuthenticated()) {
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

// 🏁 Leaderboard
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

// 🧩 Score lookup
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

// 🔐 Twitter OAuth2 — updated flow
router.get(
	"/auth/twitter",
	passport.authenticate("twitter", {
		scope: ["tweet.read", "users.read"],
	})
);

// ⚠️ Important fix for OAuth2 callback
router.get(
	"/auth/twitter/callback",
	passport.authenticate("twitter", {
		failureRedirect: "/",
		successRedirect: "/",
	})
);

// 🚪 Logout
router.get("/logout", ensureAuth, (req, res, next) => {
	req.logout(err => {
		if (err) return next(err);
		req.session.destroy(() => {
			res.clearCookie("seismic.sid");
			res.redirect("/");
		});
	});
});

module.exports = router;
