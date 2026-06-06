import { Game } from "../models/Game.js";
import { User } from "../models/User.js";
// POST /api/games/finish
// Marks a game as finished and updates each player's stats
export const finishGame = async (req, res) => {
    try {
        const { game_id, rankings } = req.body;
        // rankings = array of { user_id, rank, coins_earned }
        if (!game_id || !rankings || rankings.length === 0) {
            return res.status(400).json({ message: "game_id and rankings are required" });
        }
        const game = await Game.findById(game_id);
        if (!game) {
            return res.status(404).json({ message: "Game not found" });
        }
        // Mark the game as finished
        game.status = "finished";
        game.finished_at = new Date();
        // Save rank and coins for each player in the game document
        for (const ranking of rankings) {
            const playerIndex = game.players.findIndex((p) => p.user_id?.toString() === ranking.user_id);
            if (playerIndex >= 0) {
                game.players[playerIndex].rank = ranking.rank;
                game.players[playerIndex].coins_earned = ranking.coins_earned;
            }
        }
        await game.save();
        // Update each player's total games played and coin balance
        for (const ranking of rankings) {
            await User.findByIdAndUpdate(ranking.user_id, {
                $inc: {
                    total_played: 1,
                    coins: ranking.coins_earned,
                },
            }, { new: true });
        }
        res.json({ message: "Game finished successfully", game });
    }
    catch (error) {
        console.error("Finish game error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
//# sourceMappingURL=gameController.js.map