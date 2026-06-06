import { Server } from "socket.io";
import http from "http";
import { app } from "./app.js";
import { config } from "dotenv";
import mongoose from "mongoose";
import { Game } from "./models/Game.js";
import { User } from "./models/User.js";
import {
    rollDice,
    getNewPosition,
    getMovableTokenIndices,
    relToAbs,
    SAFE_ABSOLUTE,
    getTurnOrderColors,
    pickRandomToken,
    timestamp,
    coinsForRank,
} from "./utils/gameLogic.js";

config({ path: "./config.env" });

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"], credentials: false },
});

// Connect to MongoDB
mongoose
    .connect(process.env.MONGO_URI!)
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.error("MongoDB connection error:", err));

// Track which socket belongs to which user/game (used for disconnect handling)
const userToGame = new Map<string, string>();    // socket.id -> game_id
const socketToUser = new Map<string, string>();  // socket.id -> userId

// ===== In-memory game room types =====

interface PlayerInGame {
    user_id: string;
    username: string;
    color: string;
    socketId: string | null;   // null means the player is disconnected
    tokens: number[];
    tokensFinished: number;
    captures: number;
    turnsTaken: number;
    sixesRolled: number;
}

interface ChatMsg {
    sender: string;
    color: string;
    text: string;
    isSystem: boolean;
    time: string;
}

interface LogEntry {
    time: string;
    color: string;
    text: string;
    type: string;
}

interface GameRoom {
    game_id: string;
    players: PlayerInGame[];
    currentTurnIndex: number;
    diceValue: number | null;
    diceRolled: boolean;
    consecutiveSixes: number;
    rankings: string[];
    chatMessages: ChatMsg[];
    gameLog: LogEntry[];
    autoRollTimer: ReturnType<typeof setTimeout> | null;
    timerInterval: ReturnType<typeof setInterval> | null;
    startTime: Date;
    turnNumber: number;
    timeLeft: number;
    isGameOver: boolean;
}

// All active games stored in memory for fast access
const gameRooms = new Map<string, GameRoom>();

// ===== Game room helper functions =====

// Creates a fresh in-memory game room when a game starts
function initGameRoom(
    game_id: string,
    players: { user_id: string; username: string; color: string }[]
): GameRoom {
    // Sort players into standard Ludo turn order: red, blue, yellow, green
    const colorOrder = getTurnOrderColors(players.map((p) => p.color));

    const orderedPlayers: PlayerInGame[] = colorOrder.map((color) => {
        const p = players.find((x) => x.color === color)!;
        return {
            user_id: p.user_id,
            username: p.username,
            color: color,
            socketId: null,              // will be set when player joins the socket room
            tokens: [-1, -1, -1, -1],   // all 4 tokens start in yard
            tokensFinished: 0,
            captures: 0,
            turnsTaken: 0,
            sixesRolled: 0,
        };
    });

    const room: GameRoom = {
        game_id: game_id,
        players: orderedPlayers,
        currentTurnIndex: 0,
        diceValue: null,
        diceRolled: false,
        consecutiveSixes: 0,
        rankings: [],
        chatMessages: [
            {
                sender: "System",
                color: "system",
                text: "Game started – Good luck everyone!",
                isSystem: true,
                time: timestamp(),
            },
        ],
        gameLog: [
            { time: timestamp(), color: "system", text: "Game started!", type: "system" },
        ],
        autoRollTimer: null,
        timerInterval: null,
        startTime: new Date(),
        turnNumber: 1,
        timeLeft: 20,
        isGameOver: false,
    };

    return room;
}

// Builds the state object that gets sent to all clients on every update
function buildClientState(room: GameRoom) {
    const currentPlayer = room.players[room.currentTurnIndex];

    // Work out which token indices the current player can legally move
    let movableTokenIndices: number[] = [];
    if (room.diceRolled && currentPlayer && room.diceValue !== null) {
        movableTokenIndices = getMovableTokenIndices(currentPlayer.tokens, room.diceValue);
    }

    return {
        game_id: room.game_id,
        players: room.players.map((p) => ({
            user_id: p.user_id,
            username: p.username,
            color: p.color,
            tokens: p.tokens,
            tokensFinished: p.tokensFinished,
            captures: p.captures,
            turnsTaken: p.turnsTaken,
            sixesRolled: p.sixesRolled,
            isConnected: p.socketId !== null,
        })),
        currentTurnIndex: room.currentTurnIndex,
        currentTurnColor: currentPlayer?.color ?? null,
        currentTurnUserId: currentPlayer?.user_id ?? null,
        diceValue: room.diceValue,
        diceRolled: room.diceRolled,
        movableTokenIndices: movableTokenIndices,
        rankings: room.rankings,
        isGameOver: room.isGameOver,
        chatMessages: room.chatMessages,
        gameLog: room.gameLog,
        turnNumber: room.turnNumber,
        timeLeft: room.timeLeft,
        numPlayers: room.players.length,
    };
}

// Returns the ordinal suffix for a rank number (1 -> "st", 2 -> "nd", etc.)
function rankSuffix(rank: number): string {
    if (rank === 1) return "st";
    if (rank === 2) return "nd";
    if (rank === 3) return "rd";
    return "th";
}

// Pushes a message to both chat and game log at once
function addMessage(room: GameRoom, text: string, color: string, type: string) {
    room.chatMessages.push({
        sender: "System",
        color: "system",
        text,
        isSystem: true,
        time: timestamp(),
    });
    room.gameLog.push({
        time: timestamp(),
        color,
        text,
        type,
    });
}

// Cancel both timers running for this room
function clearRoomTimers(room: GameRoom) {
    if (room.autoRollTimer) {
        clearTimeout(room.autoRollTimer);
        room.autoRollTimer = null;
    }
    if (room.timerInterval) {
        clearInterval(room.timerInterval);
        room.timerInterval = null;
    }
}

// Start the 20-second countdown for the current player's turn
function startTurnTimer(room: GameRoom) {
    clearRoomTimers(room);
    room.timeLeft = 20;

    // Tick every second and send the updated countdown to clients
    room.timerInterval = setInterval(() => {
        room.timeLeft = Math.max(0, room.timeLeft - 1);
        io.to(room.game_id).emit("timer_tick", { timeLeft: room.timeLeft });
    }, 1000);

    // When 20 seconds are up, auto-play the turn
    room.autoRollTimer = setTimeout(() => {
        if (room.timerInterval) {
            clearInterval(room.timerInterval);
            room.timerInterval = null;
        }
        if (!room.isGameOver) {
            autoPlayTurn(room);
        }
    }, 20000);
}

// Automatically plays a turn  
// used for disconnected players and (connected but not playing) players
function autoPlayTurn(room: GameRoom) {
    if (room.isGameOver) return;

    const currentPlayer = room.players[room.currentTurnIndex];

    if (!room.diceRolled) {
        // Roll dice for the player
        const dice = rollDice();
        room.diceValue = dice;
        room.diceRolled = true;
        currentPlayer.turnsTaken++;

        if (dice === 6) {
            currentPlayer.sixesRolled++;
            room.consecutiveSixes++;
        }

        room.gameLog.push({ time: timestamp(), color: currentPlayer.color, text: `${currentPlayer.username} rolled ${dice} (auto)`, type: "normal" });

        const movable = getMovableTokenIndices(currentPlayer.tokens, dice);

        // If no token can move, or three 6s in a row, skip the turn
        if (movable.length === 0 || room.consecutiveSixes >= 3) {
            advanceTurn(room, false);
            io.to(room.game_id).emit("game_state_update", buildClientState(room));
            if (!room.isGameOver) startTurnTimer(room);
            return;
        }

        // Move a random valid token
        const tokenIdx = pickRandomToken(currentPlayer.tokens, dice);
        if (tokenIdx !== -1) {
            doMoveToken(room, currentPlayer, tokenIdx);
        }
    } else {
        // Dice already rolled —> just pick a token
        const tokenIdx = pickRandomToken(currentPlayer.tokens, room.diceValue!);
        if (tokenIdx !== -1) {
            doMoveToken(room, currentPlayer, tokenIdx);
        } else {
            advanceTurn(room, false);
        }
    }

    io.to(room.game_id).emit("game_state_update", buildClientState(room));
    if (!room.isGameOver) startTurnTimer(room);
}

// Handles moving a token and all the side effects (captures, finishing, extra turn)
function doMoveToken(room: GameRoom, player: PlayerInGame, tokenIdx: number) {
    const newPos = getNewPosition(player.tokens[tokenIdx], room.diceValue!);
    if (newPos === -2) return;

    player.tokens[tokenIdx] = newPos;
    room.gameLog.push({ time: timestamp(), color: player.color, text: `${player.username} moved ${player.color[0].toUpperCase()}${tokenIdx + 1}`, type: "normal" });

    // Check if this token landed on an opponent's token (capture)
    if (newPos >= 0 && newPos <= 50) {
        const absNew = relToAbs(newPos, player.color);

        if (!SAFE_ABSOLUTE.has(absNew)) {
            for (const opponent of room.players) {
                if (opponent.user_id === player.user_id) continue;

                for (let i = 0; i < 4; i++) {
                    if (opponent.tokens[i] < 0 || opponent.tokens[i] > 50) continue;

                    if (relToAbs(opponent.tokens[i], opponent.color) === absNew) {
                        // Send opponent's token back to yard
                        opponent.tokens[i] = -1;
                        player.captures++;

                        const captureMsg = `${player.username} captured ${opponent.username}'s token!`;
                        addMessage(room, captureMsg, player.color, "capture");
                    }
                }
            }
        }
    }

    // Check if this token reached the centre (position 56 = finished)
    if (newPos === 56) {
        player.tokensFinished++;

        if (player.tokensFinished === 4) {
            // All 4 tokens finished —> record this player's rank
            room.rankings.push(player.user_id);
            const rank = room.rankings.length;
            const finishMsg = `${player.username} finished in ${rank}${rankSuffix(rank)} place! ${rank === 1 ? "🏆" : "🎉"}`;
            addMessage(room, finishMsg, player.color, "finish");

            checkGameOver(room).catch((err) => console.error("checkGameOver error:", err));

            // If not everyone has finished yet, advance to the next active player
            if (!room.isGameOver) {
                advanceTurn(room, false);
            }
            return;
        }

        room.gameLog.push({
            time: timestamp(),
            color: player.color,
            text: `${player.username}'s token reached finish! ★`,
            type: "finish",
        });
    }

    // Rolling a 6 grants an extra turn (unless it was the 3rd six in a row)
    const grantExtraTurn = room.diceValue === 6 && room.consecutiveSixes < 3;
    advanceTurn(room, grantExtraTurn);
}

// Moves the turn to the next active player
function advanceTurn(room: GameRoom, grantExtra: boolean) {
    room.diceRolled = false;
    room.diceValue = null;

    if (!grantExtra) {
        room.consecutiveSixes = 0;

        // Find the next player who hasn't finished all 4 tokens
        let next = (room.currentTurnIndex + 1) % room.players.length;
        let tries = 0;
        while (room.players[next].tokensFinished === 4 && tries < room.players.length) {
            next = (next + 1) % room.players.length;
            tries++;
        }

        room.currentTurnIndex = next;
        room.turnNumber++;
    }

    room.timeLeft = 20;
}

// Ends the game when only one player hasn't finished yet 
// (they get last place automatically)
async function checkGameOver(room: GameRoom) {
    // Keep playing until all but one player has finished
    if (room.rankings.length < room.players.length - 1) return;

    room.isGameOver = true;
    clearRoomTimers(room);

    // Auto-rank the last remaining player without making them play out their tokens
    const rankedSet = new Set(room.rankings);
    const lastPlayer = room.players.find((p) => !rankedSet.has(p.user_id));
    if (lastPlayer) {
        room.rankings.push(lastPlayer.user_id);
        const lastRank = room.rankings.length;
        const msg = `${lastPlayer.username} is automatically ranked ${lastRank}${rankSuffix(lastRank)}.`;
        addMessage(room, msg, lastPlayer.color, "finish");
    }

    // All players are now in room.rankings in finish order
    const finalRankings = room.rankings;

    // Save game results and update each player's stats in the database
    try {
        const game = await Game.findById(room.game_id);

        if (game) {
            game.status = "finished";
            game.finished_at = new Date();

            for (let i = 0; i < game.players.length; i++) {
                const uid = game.players[i].user_id?.toString();
                const rank = (finalRankings.indexOf(uid!) + 1) || game.players.length;
                const coins = coinsForRank(rank, room.players.length);

                game.players[i].rank = rank;
                game.players[i].coins_earned = coins;

                const winIncrement = rank === 1 ? 1 : 0;
                await User.findByIdAndUpdate(uid, {
                    $inc: { total_played: 1, coins: coins, wins: winIncrement },
                });
            }

            await game.save();
        }
    } catch (err) {
        console.error("Error saving game results:", err);
    }

    // Send final standings to all clients
    const standings = finalRankings.map((uid, i) => {
        const p = room.players.find((x) => x.user_id === uid)!;
        return {
            rank: i + 1,
            user_id: uid,
            username: p?.username,
            color: p?.color,
            coins: coinsForRank(i + 1, room.players.length),
        };
    });

    const durationSeconds = Math.floor((Date.now() - room.startTime.getTime()) / 1000);
    io.to(room.game_id).emit("game_over", { standings, duration: durationSeconds });
}

// ===== Socket event handlers =====

io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    // ---- Lobby events ----

    // Get all games waiting for players
    socket.on("get_available_games", async (callback) => {
        try {
            const games = await Game.find({ status: "waiting" }).lean();
            callback({ success: true, games });
        } catch {
            callback({ success: false, error: "Failed to fetch games" });
        }
    });

    // Create a new game and join it
    socket.on("create_game", async (data, callback) => {
        try {
            const { userId, username, total_players } = data;

            if (!userId || !username || ![2, 3, 4].includes(total_players)) {
                return callback({ success: false, error: "Invalid game data" });
            }

            const game = await Game.create({
                total_players,
                players: [{ user_id: userId, username, color: "red", rank: null, coins_earned: null }],
                status: "waiting",
                started_at: null,
                finished_at: null,
            });

            userToGame.set(socket.id, game._id.toString());
            socketToUser.set(socket.id, userId);
            socket.join(game._id.toString());

            io.emit("games_updated", { action: "created", game });
            callback({ success: true, game });
        } catch (err) {
            console.error("create_game error:", err);
            callback({ success: false, error: "Failed to create game" });
        }
    });

    // Join an existing game in the lobby
    socket.on("join_game", async (data, callback) => {
        try {
            const { userId, username, game_id } = data;

            const game = await Game.findById(game_id);
            if (!game) return callback({ success: false, error: "Game not found" });
            if (game.status !== "waiting") return callback({ success: false, error: "Game not accepting players" });
            if (game.players.length >= game.total_players) return callback({ success: false, error: "Game is full" });
            if (game.players.some((p) => p.user_id?.toString() === userId)) {
                return callback({ success: false, error: "Already in this game" });
            }

            // Pick a color that hasn't been taken yet
            const allColors: Array<"red" | "blue" | "yellow" | "green"> = ["red", "blue", "yellow", "green"];
            const usedColors = game.players.map((p) => p.color as string);
            const color = (allColors.find((c) => !usedColors.includes(c)) ?? "red") as "red" | "blue" | "green" | "yellow";

            game.players.push({ user_id: userId, username, color, rank: null, coins_earned: null });
            await game.save();

            userToGame.set(socket.id, game_id);
            socketToUser.set(socket.id, userId);
            socket.join(game_id);

            io.to(game_id).emit("player_joined", { game, player: { userId, username, color } });
            io.emit("games_updated", { action: "updated", game });
            callback({ success: true, game });
        } catch (err) {
            console.error("join_game error:", err);
            callback({ success: false, error: "Failed to join game" });
        }
    });

    // Leave the lobby before a game starts
    socket.on("leave_game", async (callback) => {
        try {
            const game_id = userToGame.get(socket.id);
            if (!game_id) return callback({ success: false, error: "Not in a game" });

            const game = await Game.findById(game_id);
            if (!game) return callback({ success: false, error: "Game not found" });

            if (game.players.length === 1) {
                // Last player leaving —> delete the whole game
                await Game.findByIdAndDelete(game_id);
                io.emit("games_updated", { action: "deleted", game_id });
            } else {
                // Remove just this player from the game
                const userId = socketToUser.get(socket.id);
                await Game.findByIdAndUpdate(
                    game_id,
                    { $pull: { players: { user_id: userId } } },
                    { new: true }
                );
                const updated = await Game.findById(game_id);
                io.to(game_id).emit("player_left", { game: updated });
                io.emit("games_updated", { action: "updated", game: updated });
            }

            socket.leave(game_id);
            userToGame.delete(socket.id);
            socketToUser.delete(socket.id);
            callback({ success: true });
        } catch (err) {
            console.error("leave_game error:", err);
            callback({ success: false, error: "Failed to leave game" });
        }
    });

    // Start the game (only the creator can do this)
    socket.on("start_game", async (data, callback) => {
        try {
            const { game_id } = data;

            const game = await Game.findById(game_id);
            if (!game) return callback({ success: false, error: "Game not found" });
            if (game.players.length < 2) return callback({ success: false, error: "Need at least 2 players" });

            game.status = "playing";
            game.started_at = new Date();
            await game.save();

            // Create the in-memory game room
            const roomPlayers = game.players.map((p) => ({
                user_id: p.user_id!.toString(),
                username: p.username!,
                color: p.color!,
            }));
            const room = initGameRoom(game_id, roomPlayers);
            gameRooms.set(game_id, room);

            io.to(game_id).emit("game_started", { game });
            callback({ success: true, game });
        } catch (err) {
            console.error("start_game error:", err);
            callback({ success: false, error: "Failed to start game" });
        }
    });

    // ---- In-game events ----

    // Player joins (or rejoins) an active game room
    socket.on("join_game_room", async (data, callback) => {
        try {
            const { game_id, userId } = data;

            // Try to find the room in memory
            let room = gameRooms.get(game_id);

            if (!room) {
                // Room isn't in memory (server restarted?)
                // rebuild from the DB
                const game = await Game.findById(game_id);
                if (!game || game.status !== "playing") {
                    return callback({ success: false, error: "Game not found or not active" });
                }
                const roomPlayers = game.players.map((p) => ({
                    user_id: p.user_id!.toString(),
                    username: p.username!,
                    color: p.color!,
                }));
                room = initGameRoom(game_id, roomPlayers);
                gameRooms.set(game_id, room);
            }

            const player = room.players.find((p) => p.user_id === userId);
            if (!player) return callback({ success: false, error: "Not in this game" });

            const wasDisconnected = player.socketId === null;

            // Register this socket as belonging to this player
            player.socketId = socket.id;
            userToGame.set(socket.id, game_id);
            socketToUser.set(socket.id, userId);
            socket.join(game_id);

            if (wasDisconnected && !room.isGameOver) {
                addMessage(room, `${player.username} reconnected.`, "system", "system");

                // Cancel any stale AI timers and restart the right timer
                clearRoomTimers(room);
                const currentPlayer = room.players[room.currentTurnIndex];

                if (currentPlayer.socketId !== null) {
                    // Current player is connected 
                    // give them a fresh turn
                    startTurnTimer(room);
                } else {
                    // Current player is still disconnected 
                    // AI takes over shortly
                    room.autoRollTimer = setTimeout(() => autoPlayTurn(room), 3000);
                }
            }

            callback({ success: true, gameState: buildClientState(room) });
            io.to(game_id).emit("game_state_update", buildClientState(room));
        } catch (err) {
            console.error("join_game_room error:", err);
            callback({ success: false, error: "Server error" });
        }
    });

    // Player rolls the dice
    socket.on("roll_dice", (data, callback) => {
        const { game_id, userId } = data;

        const room = gameRooms.get(game_id);
        if (!room || room.isGameOver) return callback({ success: false, error: "Game not active" });

        const currentPlayer = room.players[room.currentTurnIndex];
        if (currentPlayer.user_id !== userId) return callback({ success: false, error: "Not your turn" });
        if (room.diceRolled) return callback({ success: false, error: "Already rolled" });

        clearRoomTimers(room);

        const dice = rollDice();
        room.diceValue = dice;
        room.diceRolled = true;
        currentPlayer.turnsTaken++;

        if (dice === 6) {
            currentPlayer.sixesRolled++;
            room.consecutiveSixes++;
        }

        room.gameLog.push({ time: timestamp(), color: currentPlayer.color, text: `${currentPlayer.username} rolled ${dice}`, type: "normal" });

        const movable = getMovableTokenIndices(currentPlayer.tokens, dice);
        io.to(game_id).emit("game_state_update", buildClientState(room));
        callback({ success: true, diceValue: dice, movableTokenIndices: movable });

        if (movable.length === 0 || room.consecutiveSixes >= 3) {
            // No valid move 
            // forfeit turn
            if (room.consecutiveSixes >= 3) {
                room.gameLog.push({ time: timestamp(), color: currentPlayer.color, text: `${currentPlayer.username} rolled three 6s – forfeited!`, type: "system" });
            }
            advanceTurn(room, false);
            io.to(game_id).emit("game_state_update", buildClientState(room));
            if (!room.isGameOver) startTurnTimer(room);
        } else {
            // Give 15 seconds to pick a token before AI picks automatically
            room.autoRollTimer = setTimeout(() => {
                if (room.isGameOver) return;
                const tokenIdx = pickRandomToken(currentPlayer.tokens, room.diceValue!);
                if (tokenIdx !== -1) {
                    doMoveToken(room, currentPlayer, tokenIdx);
                } else {
                    advanceTurn(room, false);
                }
                io.to(game_id).emit("game_state_update", buildClientState(room));
                if (!room.isGameOver) startTurnTimer(room);
            }, 15000);
        }
    });

    // Player moves a specific token
    socket.on("move_token", (data, callback) => {
        const { game_id, userId, tokenIndex } = data;

        const room = gameRooms.get(game_id);
        if (!room || room.isGameOver) return callback({ success: false, error: "Game not active" });

        const currentPlayer = room.players[room.currentTurnIndex];
        if (currentPlayer.user_id !== userId) return callback({ success: false, error: "Not your turn" });
        if (!room.diceRolled || room.diceValue === null) return callback({ success: false, error: "Roll first" });

        const movable = getMovableTokenIndices(currentPlayer.tokens, room.diceValue);
        if (!movable.includes(tokenIndex)) return callback({ success: false, error: "Invalid move" });

        clearRoomTimers(room);
        doMoveToken(room, currentPlayer, tokenIndex);
        io.to(game_id).emit("game_state_update", buildClientState(room));
        callback({ success: true });
        if (!room.isGameOver) startTurnTimer(room);
    });

    // Player intentionally leaves an active game (AI takes over)
    socket.on("leave_game_room", (data, callback) => {
        const { game_id, userId } = data ?? {};

        const room = gameRooms.get(game_id);
        if (!room || room.isGameOver) return callback?.({ success: true });

        const player = room.players.find((p) => p.user_id === userId);
        if (!player) return callback?.({ success: true });

        // Mark player as disconnected
        player.socketId = null;
        userToGame.delete(socket.id);
        socketToUser.delete(socket.id);
        socket.leave(game_id);

        addMessage(room, `${player.username} left the game. AI is taking over.`, "system", "system");

        io.to(game_id).emit("game_state_update", buildClientState(room));

        // If it was their turn, start AI after a short delay
        if (room.players[room.currentTurnIndex].user_id === userId) {
            clearRoomTimers(room);
            room.autoRollTimer = setTimeout(() => autoPlayTurn(room), 3000);
        }

        callback?.({ success: true });
    });

    // Player sends a chat message
    socket.on("send_chat", (data, callback) => {
        const { game_id, userId, text } = data;

        if (!text?.trim()) return callback?.({ success: false });

        const room = gameRooms.get(game_id);
        if (!room) return callback?.({ success: false });

        const player = room.players.find((p) => p.user_id === userId);
        if (!player) return callback?.({ success: false });

        const msg: ChatMsg = {
            sender: player.username,
            color: player.color,
            text: text.trim(),
            isSystem: false,
            time: timestamp(),
        };

        room.chatMessages.push(msg);
        io.to(game_id).emit("chat_message", msg);
        callback?.({ success: true });
    });

    // Handle socket disconnection (browser closed, network dropped, etc.)
    socket.on("disconnect", async () => {
        console.log("Socket disconnected:", socket.id);

        const game_id = userToGame.get(socket.id);
        const userId = socketToUser.get(socket.id);

        userToGame.delete(socket.id);
        socketToUser.delete(socket.id);

        if (!game_id) return;

        // If player was in an active game, mark them as disconnected
        const room = gameRooms.get(game_id);
        if (room && !room.isGameOver) {
            const player = room.players.find((p) => p.socketId === socket.id);

            if (player) {
                player.socketId = null;
                io.to(game_id).emit("game_state_update", buildClientState(room));

                // If it was their turn, AI takes over after 3 seconds
                if (room.players[room.currentTurnIndex].user_id === player.user_id) {
                    clearRoomTimers(room);
                    room.autoRollTimer = setTimeout(() => autoPlayTurn(room), 3000);
                }
            }
            return;
        }

        // If the player was in the lobby when they disconnected, clean up
        try {
            const game = await Game.findById(game_id);
            if (game && game.status === "waiting") {
                if (game.players.length === 1) {
                    await Game.findByIdAndDelete(game_id);
                    io.emit("games_updated", { action: "deleted", game_id });
                } else {
                    await Game.findByIdAndUpdate(
                        game_id,
                        { $pull: { players: { user_id: userId } } },
                        { new: true }
                    );
                    const updated = await Game.findById(game_id);
                    if (updated) {
                        io.to(game_id).emit("player_left", { game: updated });
                        io.emit("games_updated", { action: "updated", game: updated });
                    }
                }
            }
        } catch {
            // ignore errors during disconnect cleanup
        }
    });
});

server.listen(8000, () => console.log("Server running on port 8000"));
