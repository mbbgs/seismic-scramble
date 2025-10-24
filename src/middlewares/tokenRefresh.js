const tokenManager = require("../utils/tokenManager.js");

async function ensureValidToken(req, res, next) {
  if (!req.isAuthenticated()) {
    return next();
  }
  
  try {
    if (req.user.isTokenExpired()) {
      await tokenManager.refreshAccessToken(req.user.user_id);
    }
    next();
  } catch (error) {
    console.error("Token refresh middleware error:", error);
    req.logout(() => res.redirect("/"));
  }
}

module.exports = { ensureValidToken };