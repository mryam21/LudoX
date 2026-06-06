import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

export const app = express();

// Middleware setup
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
import authRoutes from "./routes/authRoutes.js";
import statsRoutes from "./routes/statsRoutes.js";

app.use("/api/auth", authRoutes);
app.use("/api/stats", statsRoutes);
