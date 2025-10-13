require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const rateLimit = require("express-rate-limit");
const hpp = require("hpp");
const errorMiddleware = require("./errors/error");

const app = express();
const server = http.createServer(app);

// ==================== 🔐 SECURITY MIDDLEWARE ====================

// Add HTTP security headers
app.use(helmet());

// Prevent NoSQL injection
app.use(mongoSanitize());

// Prevent XSS (Cross-Site Scripting)
app.use(xss());

// Prevent parameter pollution
app.use(hpp());

// Enable Gzip compression to reduce data size
app.use(compression());

// CORS setup (restrict if needed)
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*", // Set your frontend domain in production
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Limit repeated requests to public APIs (brute-force / DDoS protection)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
  },
});
app.use("/api", limiter);

// Hide detailed Express info in errors
app.disable("x-powered-by");

// Log requests (only in development)
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// ==================== ⚙️ CORE MIDDLEWARE ====================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Default headers for all routes
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", process.env.CORS_ORIGIN || "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  next();
});

// ==================== 🚀 ROUTES ====================

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "🚀 Nutrajun Secure API is running safely.",
  });
});

const routeIndex = require("./routes/index");
app.use("/api/v1", routeIndex);

// Handle undefined routes (404)
app.all("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Can't find ${req.originalUrl} on this server.`,
  });
});

// ==================== 🧱 ERROR HANDLER ====================
app.use(errorMiddleware);

// ==================== ⚡ EXIT HANDLERS ====================
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION 💥 Shutting down...");
  console.error(err.name, err.message);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION 💥 Shutting down...");
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

process.on("SIGTERM", () => {
  console.log("👋 SIGTERM RECEIVED. Shutting down gracefully.");
  server.close(() => console.log("💤 Process terminated."));
});

process.on("exit", () => console.log("🛑 App exiting..."));

// ==================== EXPORT ====================
module.exports = { app, server };