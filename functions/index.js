const express      = require("express");
const cors         = require("cors");
const cookieParser = require("cookie-parser");
const rateLimit    = require('express-rate-limit');
const helmet       = require('helmet');

const app = express();

app.use(cors({
  origin: [
    "https://freshzone-509a9.web.app",
    "https://freshzone.space",
    "https://www.freshzone.space",
    "http://localhost:3000",
    "http://localhost:5500",
    "http://127.0.0.1:5500"
  ],
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false, skip: (req) => !req.path.startsWith('/api/auth') }));

const authRoutes     = require("./api/auth");
const readingsRoutes = require("./api/readings");
const historyRoutes  = require("./api/history");
const profileRoutes  = require("./api/profile");
const contactRoutes  = require("./api/contact");
const pushRoutes     = require("./api/push");

app.use("/api/auth",     authRoutes);
app.use("/api/readings", readingsRoutes);
app.use("/api/history",  historyRoutes);
app.use("/api/profile",  profileRoutes);
app.use("/api/contact",  contactRoutes);
app.use("/api/push",     pushRoutes);

module.exports = app;
