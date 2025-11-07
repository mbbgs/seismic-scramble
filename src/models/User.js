const mongoose = require('mongoose');
const scrypt = require('../utils/scryptt.js');


const userSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
    required: true,
    index: true
  },
  user_id: {
    type: String,
    required: true,
    unique: true
  },
  radar: {
    type: String,
    required: true,
    default: 'green',
    enum: ['green', 'orange', 'red']
  },
  start_time: {
    type: Date,
    default: null
  },
  hash_id: {
    type: String,
    required: false,
    unique: true
  },
  avatar: {
    required: true,
    type: String
  },
  score: {
    type: Number,
    default: 0
  },
  password: {
    type: String,
    required: true
  }
}, {
  timestamps: true,
  versionKey: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

userSchema.index({ createdAt: -1 });





userSchema.statics.hashPassword = async function(password = '') {
  try {
    const hashedPassword = await scrypt.hashToken(password?.trim());
    return hashedPassword;
  } catch (error) {
    console.error('Error hashing password in User model', error)
    throw error
  }
};

userSchema.methods.comparePassword = async function(password) {
  try {
    const isMatched = await scrypt.verifyToken(password, this.password);
    return isMatched;
  } catch (error) {
    console.error('Error comparing password in User model', error)
    throw error
  }
  
};

module.exports = mongoose.model('User', userSchema);