import { User } from "../models/User.js";
import { Game } from "../models/Game.js";
// GET /api/stats/leaderboard
// Returns all users sorted by coins (most coins first)
export const getLeaderboard = async (_req, res) => {
    try {
        const users = await User.find({}, "username coins total_played wins").lean();
        // Sort by coins descending 
        // if tied, fewer games played = higher rank
        const sorted = users.sort((a, b) => {
            if (b.coins !== a.coins)
                return b.coins - a.coins;
            return a.total_played - b.total_played;
        });
        res.json({ leaderboard: sorted });
    }
    catch (error) {
        console.error("Leaderboard error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
// GET /api/stats/history
// Returns all finished games that the logged-in user was part of
export const getHistory = async (req, res) => {
    try {
        const token = req.cookies?.token;
        if (!token)
            return res.status(401).json({ message: "Not authenticated" });
        const userId = token.replace("token_", "");
        const user = await User.findById(userId);
        if (!user)
            return res.status(401).json({ message: "User not found" });
        // Find all finished games where this user was a player
        const games = await Game.find({
            "players.user_id": userId,
            status: "finished",
        })
            .sort({ finished_at: -1 })
            .lean();
        res.json({ games });
    }
    catch (error) {
        console.error("History error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
//# sourceMappingURL=statsController.js.map