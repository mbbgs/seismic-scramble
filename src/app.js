require("dotenv").config();
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const TwitterStrategy = require("passport-twitter-oauth2").Strategy;
const mongoose = require("mongoose");
const path = require("path");
const ejs = require("ejs");
const cors = require("cors");
const crypto = require("crypto");

const User = require("./models/User");
const authRoutes = require("./routes/api.js");
const gameRoutes = require("./routes/view.js");

const app = express();
const MainRouter = express.Router();

// Basic setup
app.set("trust proxy", 1);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.engine("html", ejs.renderFile);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// CORS
app.use(cors({ origin: "*", credentials: true }));

// Public files
app.use(express.static(path.join(__dirname, "public")));

// Session
app.use(
  session({
    secret: process.env.SESSION_SECRET || "seismicSecretKey",
    resave: false,
    saveUninitialized: false,
  })
);

// Passport setup
app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new TwitterStrategy(
    {
      clientID: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET,
      callbackURL: process.env.CALLBACK_URL,
      scope: ["tweet.read", "users.read"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ user_id: profile.id });
        if (!user) {
          user = await User.create({
            user_id: profile.id,
            username: profile.username,
            profile: profile.photos?.[0]?.value || "",
            radar: "green",
            game_start: new Date(),
            has_played: false,
            is_verified: true,
            score: 0,
          });
        } else {
          user.username = profile.username;
          user.profile = profile.photos?.[0]?.value || "";
          await user.save();
        }
        done(null, user);
      } catch (err) {
        done(err);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user.user_id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findOne({ user_id: id });
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Routes
MainRouter.use("/api", authRoutes);
MainRouter.use("/game", gameRoutes);
app.use("/", MainRouter);

// Health check
app.get("/ndu", (req, res) =>
  res.status(200).json({
    status: "healthy",
    message: "Service is running 🚀",
    timestamp: new Date().toISOString(),
  })
);

module.exports = app;