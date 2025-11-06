require("dotenv").config();
const express = require("express");
const session = require("express-session");
const mongoStore = require("connect-mongo")
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

const User = require("./src/models/User.js");
const { globalErrorHandler, notFoundHandler } = require("./src/middlewares/error.js");
const apiRoutes = require("./src/routes/api.js");
const viewRoutes = require("./src/routes/view.js");
const { appLimiter } = require("./src/middlewares/limiter.js");

const app = express();


app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/*
app.engine('html', ejs.renderFile);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
*/

app.engine("html", ejs.renderFile);
app.set("view engine", "html");
app.set("views", path.join(__dirname, "src", "views"));


app.use(compression());
app.use(hpp());
app.use(mongoSanitize());
app.use(cookieParser());

app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString("base64");
  next();
});

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "https://cdnjs.cloudflare.com",
          "https://cdn.jsdelivr.net",
          "https://unpkg.com",
        ],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'", "data:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);


app.use(express.static(path.join(__dirname, 'src', 'public')));
app.use(express.static(path.join(__dirname, 'src', 'public', 'images')));
app.use(express.static(path.join(__dirname, 'src', 'public', 'scripts')));
app.use(express.static(path.join(__dirname, 'src', 'public', 'styles')));


app.use(
  cors({
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type"],
    credentials: true,
    origin: process.env.CLIENT_URL || "*",
  })
);

/*
const configureSecureSession = () => {
  const sessionConfig = {
    name: 'ss-scramble.sid',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    store: mongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      ttl: 60 * 60, // 1 hour 
      autoRemove: 'native',
    }),
    cookie: {
      secure: process.env.NODE_ENV === 'production', // Dynamic secure flag
      maxAge: 1000 * 60 * 60, // 1 hour in milliseconds
      sameSite: "strict",
      httpOnly: true
    }
  };
}*/

const configureSecureSession = () => {
  return {
    name: 'ss-scramble.sid',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    store: mongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      ttl: 60 * 60,
      autoRemove: 'native',
    }),
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60,
      sameSite: "strict",
      httpOnly: true
    }
  };
};

app.use(session(configureSecureSession()));



app.use('/', appLimiter, apiRoutes)
app.use('/', appLimiter, viewRoutes)


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
  }));

app.use(notFoundHandler);
app.use(globalErrorHandler);

module.exports = app;