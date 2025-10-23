const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  profile: { type: String },
  radar: {
    type: String,
    required: true,
    enum: ['green', 'orange', 'red']
  },
  user_id: { type: String, required: true, unique: true },
  game_start: { type: Date, required: true },
  has_played: { type: Boolean, required: true, default: false },
  is_verified: { type: Boolean, default: false, required: true },
  score: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);