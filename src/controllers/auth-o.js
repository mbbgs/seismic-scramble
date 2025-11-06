const mongoose = require('mongoose');
const User = require('../models/User.js');
const crypto = require('crypto');

const { saveSession, destroySession } = require('../middlewares/session.js');
const { sendJson, logError, validateInput: isValidInput } = require('../utils/helpers.js');

const isPasswordComplex = (password) => {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
  return regex.test(password);
};


// Generate unique user_id
function generateUserId() {
  return crypto.randomBytes(16).toString('hex');
}

function generateDefaultAvatar(username) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=333333&color=fff&size=200`;
}

async function validateUniqueUsername(username = '') {
  let baseUsername = username.trim();
  let isUsernameInUse = await User.exists({ username: baseUsername });
  
  if (!isUsernameInUse) {
    return baseUsername;
  }
  
  // Append random suffix if username exists
  let attempts = 0;
  while (isUsernameInUse && attempts < 10) {
    const suffix = Math.floor(Math.random() * 9999);
    baseUsername = `${username.trim()}_${suffix}`;
    isUsernameInUse = await User.exists({ username: baseUsername });
    attempts++;
  }
  
  return baseUsername;
}


module.exports.createUser = async function(req, res) {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { username = '', password = '' } = req.body;
    
    if (!isValidInput(username.trim()) || !isValidInput(password.trim())) {
      await session.abortTransaction();
      return res.status(400).render('index.html', { message: 'Provide required credentials' });
    }
    
    if (!isPasswordComplex(password.trim())) {
      await session.abortTransaction();
      return res.status(400).render('index.html', { message: 'Password must be at least 8 characters long and include uppercase, lowercase, numbers, and special characters' });
    }
    
    const existingUser = await User.findOne({ username: username.trim() }).session(session);
    if (existingUser) {
      await session.abortTransaction();
      return res.status(403).render('index.html', { message: 'Username not available' });
    }
    
    const uniqueUsername = await validateUniqueUsername(username);
    const hashedPassword = await User.hashPassword(password.trim());
    const userId = generateUserId();
    const avatar = generateDefaultAvatar(uniqueUsername);
    
    const [newUser] = await User.create([{
      username: uniqueUsername,
      password: hashedPassword,
      user_id: userId,
      avatar,
      hash_id: "",
      score: 0
    }], { session });
    
    req.session.user = {
      userId: newUser._id,
      username: newUser.username,
      user_id: newUser.user_id,
      score: newUser.score
    };
    
    await saveSession(req);
    await session.commitTransaction();
    
    return res.status(201).redirect('/stage');
  } catch (error) {
    await session.abortTransaction();
    logError('Error creating user', error);
    return res.status(500).redirect('/error');
  } finally {
    session.endSession();
  }
};


module.exports.userLogin = async function(req, res) {
  try {
    const { username = '', password = '' } = req.body;
    
    req.session.user = null;
    
    if (!isValidInput(username.trim()) || !isValidInput(password.trim())) {
      return res.status(400).render('index.html', { message: 'Provide credentials to login' });
    }
    
    const isUser = await User.findOne({ username: username.trim() });
    if (!isUser) {
      return res.status(404).render('index.html', { message: 'User not found' });
    }
    
    const isMatched = await isUser.comparePassword(password.trim());
    if (!isMatched) {
      return res.status(401).render('index.html', { message: 'Incorrect username or password' });
    }
    
    const sessionData = {
      userId: isUser._id,
      username: isUser.username,
      user_id: isUser.user_id,
      score: isUser.score,
      avatar: isUser.avatar,
      lastLogin: new Date()
    };
    
    await new Promise((resolve, reject) => {
      req.session.regenerate(err => {
        if (err) return reject(err);
        req.session.user = sessionData;
        resolve();
      });
    });
    
    await saveSession(req);
    return res.redirect('/stage');
  } catch (error) {
    logError('Error logging in user', error);
    return res.status(500).redirect('/error');
  }
};


module.exports.deleteAccount = async function(req, res) {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const user = req.session?.user;
    const password = req.body?.password?.trim();
    
    if (!user) {
      await session.abortTransaction();
      return res.status(401).render('index.html', { message: 'You are not authenticated' });
    }
    
    if (!password) {
      await session.abortTransaction();
      return res.status(400).render('index.html', { message: 'Provide password to continue' });
    }
    
    const isUser = await User.findById(user.userId).session(session);
    if (!isUser) {
      await session.abortTransaction();
      return res.status(404).render('index.html', { message: 'User not found' });
    }
    
    const isPasswordValid = await isUser.comparePassword(password);
    if (!isPasswordValid) {
      await session.abortTransaction();
      return res.status(401).render('index.html', { message: 'Invalid password' });
    }
    
    await User.findByIdAndDelete(isUser._id).session(session);
    await destroySession(req);
    await session.commitTransaction();
    
    res.clearCookie('ss-scramble.sid');
    return res.redirect('/goodbye.html');
  } catch (error) {
    await session.abortTransaction();
    logError('Error deleting account', error);
    return res.status(500).redirect('/error');
  } finally {
    session.endSession();
  }
};

module.exports.logoutUser = async function(req, res) {
  try {
    const user = req.session?.user;
    if (!user) return res.status(401).render('index.html', { message: 'Not authenticated' });
    
    await destroySession(req);
    res.clearCookie('ss-scramble.sid');
    res.setHeader('Clear-Site-Data', '"cache","cookies","storage"');
    return res.redirect('/');
  } catch (error) {
    logError('Error clearing user cookies', error);
    return res.status(500).redirect('/error');
  }
};