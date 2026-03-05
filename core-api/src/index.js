import dotenv from "dotenv";

console.log("🔹 Starting application...");

if (process.env.NODE_ENV !== "production") {
  console.log("🔹 Loading environment variables from .env.local");
  dotenv.config({ path: ".env.local" });
} else {
  console.log("🔹 Running in production mode. Skipping dotenv.");
}

import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import httpStatus from "http-status";
import config from "./config/config.js";
import { errorConverter, errorHandler } from "./middlewares/error.js";
import ApiError from "./utils/ApiError.js";
import routes from "./routes/index.js";
import cookieParser from "cookie-parser";
import passport from "./config/passport.js";
import prisma from "./config/prisma.js";
import connectMongo from "./config/mongo.js";
import { initializeServiceBus, closeServiceBus } from "./services/serviceBus.service.js";

console.log("🔹 Imports completed");

const app = express();
app.set('trust proxy', 1);

console.log("🔹 Express app created");

// ---------------- GLOBAL MIDDLEWARES ----------------

console.log("🔹 Registering Helmet middleware");
app.use(helmet());

console.log("🔹 Registering CORS middleware with origin:", config.clientUrl);
app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
  })
);

console.log("🔹 Registering JSON body parser");
app.use(express.json());

console.log("🔹 Registering Morgan logger");
app.use(morgan("dev"));

console.log("🔹 Registering cookie parser");
app.use(cookieParser());

console.log("🔹 Initializing Passport authentication");
app.use(passport.initialize());

// ---------------- ROUTES ----------------

console.log("🔹 Registering health route");

app.get("/health", (req, res) => {
  console.log("🟢 Health endpoint called");
  res.status(200).send({ status: "OK", service: "Core API" });
});

console.log("🔹 Registering API routes under /v1");
app.use("/v1", (req, res, next) => {
  console.log(`➡️ Incoming request: ${req.method} ${req.originalUrl}`);
  next();
}, routes);

// ---------------- 404 HANDLER ----------------

app.use((req, res, next) => {
  console.log(`❌ Route not found: ${req.method} ${req.originalUrl}`);
  next(new ApiError(httpStatus.NOT_FOUND, "Not found"));
});

// ---------------- ERROR HANDLING ----------------

console.log("🔹 Registering error converter");
app.use((err, req, res, next) => {
  console.log("⚠️ Error before conversion:", err);
  errorConverter(err, req, res, next);
});

console.log("🔹 Registering global error handler");
app.use((err, req, res, next) => {
  console.log("🔥 Global error handler triggered:", err);
  errorHandler(err, req, res, next);
});

// ---------------- SERVER START ----------------

let server;

const startServer = async () => {
  console.log("🔹 Starting server initialization...");

  try {
    console.log("🔹 Connecting to MongoDB...");
    await connectMongo();
    console.log("✅ MongoDB connected successfully");

    console.log("🔹 Connecting to PostgreSQL (Prisma)...");
    await prisma.$connect();
    console.log("✅ PostgreSQL connected successfully");

    console.log("🔹 Initializing Azure Service Bus publisher...");
    await initializeServiceBus();

    console.log("🔹 Starting Express server...");

    server = app.listen(config.port, () => {
      console.log(
        `🚀 Core API running on port ${config.port} in ${config.env} mode`
      );
    });

  } catch (error) {
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  }
};

startServer();

// ---------------- CRASH HANDLING ----------------

const exitHandler = async () => {
  console.log("⚠️ Exit handler triggered");

  await closeServiceBus();

  if (server) {
    console.log("🔹 Closing server...");
    server.close(() => {
      console.log("🛑 Server closed");
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
};

process.on("uncaughtException", (err) => {
  console.error("💥 Uncaught Exception:", err);
  void exitHandler();
});

process.on("unhandledRejection", (err) => {
  console.error("💥 Unhandled Rejection:", err);
  void exitHandler();
});
