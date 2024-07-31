import express from "express";
import "dotenv/config";
import compression from "compression";
import { connectDb } from "./config/mongoConnect.js";
import { addLogger, logger } from "./config/logger.js";
import cors from "cors";
import apicache from "apicache"; // Import apicache

import router from "./modules/Lists/router.js";

connectDb();

const PORT = process.env.PORT || 3000;
const app = express();

import { Server } from "socket.io";
import http from "http";

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("joinRoom", (roomId) => {
    socket.join(roomId);
    console.log(`User joined room: ${roomId}`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

export { io };

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Middlewares //
app.use(express.static("public")); // serve public
app.use(addLogger); // general logging
app.use(express.json()); // Parse JSON requests
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded requests
app.use(compression({})); // Enable response compression

// Cors //
app.use(
  cors({
    origin: "*", // Allow all origins
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  })
);

// // Caching //
// const cache = apicache.middleware;
// app.use(cache('6 hours'));

// Routers //
app.use("/api/list/", router);

// Error handlers //

// Bad JSON
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    res.status(400).json({ error: "Invalid JSON" });
  } else {
    next(err);
  }
});

// Catch all //
app.use((err, req, res, next) => {
  logger.error(`${err.stack}`);
  res.status(500).json({ error: "Internal Server Error (Catch all   )" });
});

export default app;