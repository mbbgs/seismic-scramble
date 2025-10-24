const mongoose = require("mongoose");
const crypto = require("crypto");

const UserSchema = new mongoose.Schema({
  user_id: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  profile: { type: String, default: "" },
  radar: { type: String, default: "green" },
  game_start: { type: Date, default: Date.now },
  has_played: { type: Boolean, default: false },
  is_verified: { type: Boolean, default: true },
  score: { type: Number, default: 0 },
  hash_id: { type: String, unique: true },
  
  // OAuth 2.0 Token fields
  access_token: { type: String, select: false }, // Hidden by default
  refresh_token: { type: String, select: false },
  token_expires_at: { type: Date, select: false },
  token_scope: { type: String, default: "tweet.read users.read" },
  
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Generate hash_id before saving
UserSchema.pre("save", function(next) {
  if (!this.hash_id) {
    this.hash_id = crypto.createHash("sha256")
      .update(this.user_id + Date.now())
      .digest("base64url");
  }
  this.updated_at = Date.now();
  next();
});

// Token management methods
UserSchema.methods.updateTokens = function(accessToken, refreshToken, expiresIn) {
  this.access_token = accessToken;
  this.refresh_token = refreshToken;
  this.token_expires_at = new Date(Date.now() + expiresIn * 1000);
  return this.save();
};

UserSchema.methods.isTokenExpired = function() {
  return !this.token_expires_at || this.token_expires_at < new Date();
};

module.exports = mongoose.model("User", UserSchema);