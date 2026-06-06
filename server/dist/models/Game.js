import mongoose from "mongoose";
const gameSchema = new mongoose.Schema({
    total_players: { type: Number, required: true },
    players: [{
            user_id: mongoose.Schema.Types.ObjectId,
            username: String,
            color: { type: String, enum: ["red", "blue", "green", "yellow"] },
            rank: Number, // 1 = winner
            coins_earned: Number,
        }],
    status: {
        type: String,
        enum: ["waiting", "playing", "finished"],
        default: "waiting",
    },
    started_at: Date,
    finished_at: Date,
});
export const Game = mongoose.model("Game", gameSchema);
//# sourceMappingURL=Game.js.map