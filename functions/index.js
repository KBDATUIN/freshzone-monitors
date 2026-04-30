const express = require("express");
const cors = require("cors");

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