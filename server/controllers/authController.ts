import { Request, Response } from "express";
import { User } from "../models/User.js";

// POST /api/auth/login
export const login = async (req: Request, res: Response) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: "Username and password are required" });
        }

        // Find user and check password
        const user = await User.findOne({ username });
        if (!user || user.password !== password) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Create a simple token using the user's MongoDB ID
        const token = `token_${user._id}`;

        res.status(200).json({
            message: "Login successful",
            token,
            userId: user._id,
            username: user.username,
            coins: user.coins,
            total_played: user.total_played,
            wins: user.wins ?? 0,
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// POST /api/auth/signup
export const signup = async (req: Request, res: Response) => {
    try {
        const { username, password, confirmPassword, dob } = req.body;

        // Validate all required fields
        if (!username || !password || !dob) {
            return res.status(400).json({ message: "All fields are required" });
        }
        if (password !== confirmPassword) {
            return res.status(400).json({ message: "Passwords do not match" });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }
        if (username.length < 2 || username.length > 20) {
            return res.status(400).json({ message: "Username must be 2–20 characters" });
        }

        // Make sure the username isn't already taken
        const existing = await User.findOne({ username });
        if (existing) {
            return res.status(409).json({ message: "Username already taken" });
        }

        // Create the new user
        // every account starts with 100 coins
        const user = await User.create({ username, password, dob, coins: 100 });
        const token = `token_${user._id}`;

        res.status(201).json({
            message: "Account created",
            token,
            userId: user._id,
            username: user.username,
            coins: user.coins,
        });
    } catch (error) {
        console.error("Signup error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// GET /api/auth/me
// used by the frontend to restore the session on page reload
export const getMe = async (req: Request, res: Response) => {
    try {
        const token = req.cookies?.token as string | undefined;
        if (!token) return res.status(401).json({ message: "Not authenticated" });

        // Extract the user ID from the token
        const userId = token.replace("token_", "");
        const user = await User.findById(userId).select("-password");
        if (!user) return res.status(401).json({ message: "User not found" });

        res.json({
            userId: user._id,
            username: user.username,
            coins: user.coins,
            total_played: user.total_played,
            wins: user.wins ?? 0,
        });
    } catch {
        res.status(401).json({ message: "Invalid token" });
    }
};

// PUT /api/auth/update-profile
export const updateProfile = async (req: Request, res: Response) => {
    try {
        const token = req.cookies?.token as string | undefined;
        if (!token) return res.status(401).json({ message: "Not authenticated" });

        const userId = token.replace("token_", "");
        const { username, dob, currentPassword, newPassword } = req.body;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        // Handle optional username change
        if (username && username.trim() !== user.username) {
            if (username.trim().length < 2 || username.trim().length > 20) {
                return res.status(400).json({ message: "Username must be 2–20 characters" });
            }
            const taken = await User.findOne({ username: username.trim() });
            if (taken) {
                return res.status(409).json({ message: "Username already taken" });
            }
            user.username = username.trim();
        }

        // Handle optional date of birth update
        if (dob) {
            user.dob = new Date(dob);
        }

        // Handle optional password change
        if (newPassword) {
            if (!currentPassword) {
                return res.status(400).json({ message: "Current password required" });
            }
            if (user.password !== currentPassword) {
                return res.status(401).json({ message: "Current password is incorrect" });
            }
            if (newPassword.length < 6) {
                return res.status(400).json({ message: "New password must be at least 6 characters" });
            }
            user.password = newPassword;
        }

        await user.save();
        res.json({
            message: "Profile updated successfully",
            user: {
                userId: user._id,
                username: user.username,
                coins: user.coins,
                total_played: user.total_played,
                wins: user.wins ?? 0,
            },
        });
    } catch (error) {
        console.error("Update profile error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
