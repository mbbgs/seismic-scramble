require("dotenv").config();
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const TwitterStrategy = require("passport-twitter-oauth2").Strategy;
const mongoose = require("mongoose");
const path = require("path");
const helmet = require("helmet");
const ejs = require('ejs');
const compression = require("compression");
const cors = require("cors");
const hpp = require("hpp");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const mongoSanitize = require("express-mongo-sanitize");
const crypto = require("crypto");

const User = require("./models/User");
const { globalErrorHandler, notFoundHandler } = require("./middlewares/error.js");
const authRoutes = require("./routes/api.js");
const gameRoutes = require("./routes/view.js");
const { appLimiter } = require("./middlewares/limiter.js");

const app = express();
const MainRouter = express.Router()

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.engine('html', ejs.renderFile);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(compression());
app.use(hpp());
app.use(mongoSanitize());
app.use(cookieParser());

app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString("base64");
  next();
});

app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        (req, res) => `'nonce-${res.locals.nonce}'`,
        "https://unpkg.com",
        "https://cdnjs.cloudflare.com",
        "https://cdn.jsdelivr.net",
      ],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "data:", "https://cdn.jsdelivr.net"],
      connectSrc: ["'self'"],
    },
  })
);

app.use(
  cors({
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type"],
    credentials: true,
    origin: process.env.CLIENT_URL || "*",
  })
);

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public', 'images')));
app.use(express.static(path.join(__dirname, 'public', 'scripts')));
app.use(express.static(path.join(__dirname, 'public', 'styles')));

app.use(
  session({
    name: "seismic.sid",
    secret: process.env.SESSION_SECRET || "seismicSecretKey",
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      secure: process.env.NODE_ENV === "production",
    },
  })
);

app.use(passport.initialize());
//app.use(passport.session());

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
          user = new User({
            user_id: profile.id,
            username: profile.username,
            profile: profile.photos?.[0]?.value || "",
            radar: "green",
            game_start: new Date(),
            has_played: false,
            is_verified: true,
            score: 0,
          });
          await user.save();
        } else {
          user.username = profile.username;
          user.profile = profile.photos?.[0]?.value || "";
          await user.save();
        }
        done(null, user);
      } catch (err) {
        done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, { id: user.user_id }));
passport.deserializeUser(async (obj, done) => {
  try {
    const user = await User.findOne({ user_id: obj.id });
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

MainRouter.use('/api', appLimiter, authRoutes)
MainRouter.use('/', appLimiter, gameRoutes)


console.log("Here ....")
// Mount Main Router
app.use('/', MainRouter);


app.get("/robots.txt", (req, res) =>
  res.sendFile(path.join(__dirname, "robots.txt"))
);

app.get("/ndu", (req, res) =>
  res.status(200).json({
    status: "healthy",
    message: "Service is running 🚀",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
  })
);

app.use(notFoundHandler);
app.use(globalErrorHandler);

module.exports = app;
