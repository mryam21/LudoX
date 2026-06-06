import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import Navbar from "../components/Navbar";
import "./lobby.css";

// Types for the game data we get from the server
interface Player {
    user_id: string;
    username: string;
    color: string;
}

interface GameData {
    _id: string;
    total_players: number;
    players: Player[];
    status: string;
}

// Socket callback response types
interface GameListResponse {
    success: boolean;
    games?: GameData[];
}

interface GameActionResponse {
    success: boolean;
    error?: string;
    game?: GameData;
}

export default function Lobby() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { socket } = useSocket();

    const [availableGames, setAvailableGames] = useState<GameData[]>([]);
    const [currentGame, setCurrentGame] = useState<GameData | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedPlayers, setSelectedPlayers] = useState(2);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!socket || !user) return;

        // Fetch games that are currently waiting for players
        socket.emit("get_available_games", (res: GameListResponse) => {
            if (res.success && res.games) {
                setAvailableGames(res.games.filter((g) => g.status === "waiting"));
            }
        });

        // Listen for real-time lobby updates
        socket.on("games_updated", (data) => {
            if (data.action === "created") {
                setAvailableGames((prev) => [...prev, data.game]);
            } else if (data.action === "updated") {
                setAvailableGames((prev) =>
                    prev.map((g) => (g._id === data.game._id ? data.game : g))
                );
                if (currentGame?._id === data.game._id) {
                    setCurrentGame(data.game);
                }
            } else if (data.action === "deleted") {
                setAvailableGames((prev) => prev.filter((g) => g._id !== data.game_id));
            }
        });

        socket.on("player_joined", (data) => {
            if (currentGame?._id === data.game._id) {
                setCurrentGame(data.game);
            }
            setAvailableGames((prev) =>
                prev.map((g) => (g._id === data.game._id ? data.game : g))
            );
        });

        socket.on("player_left", (data) => {
            if (currentGame?._id === data.game._id) {
                setCurrentGame(data.game);
            }
            setAvailableGames((prev) =>
                prev.map((g) => (g._id === data.game._id ? data.game : g))
            );
        });

        socket.on("game_started", (data) => {
            navigate(`/newgame/${data.game._id}`);
        });

        return () => {
            socket.off("games_updated");
            socket.off("player_joined");
            socket.off("player_left");
            socket.off("game_started");
        };
    }, [socket, user, currentGame, navigate]);

    function handleCreateGame() {
        if (!socket || !user) return;

        setLoading(true);
        socket.emit(
            "create_game",
            {
                userId: user.userId,
                username: user.username,
                total_players: selectedPlayers,
            },
            (res: GameActionResponse) => {
                setLoading(false);
                if (res.success && res.game) {
                    setCurrentGame(res.game);
                    setShowCreateModal(false);
                    // Remove this game from the available list (we're already in it)
                    setAvailableGames((prev) => prev.filter((g) => g._id !== res.game!._id));
                } else {
                    alert(res.error || "Failed to create game");
                }
            }
        );
    }

    function handleJoinGame(game: GameData) {
        if (!socket || !user) return;

        setLoading(true);
        socket.emit(
            "join_game",
            {
                userId: user.userId,
                username: user.username,
                game_id: game._id,
            },
            (res: GameActionResponse) => {
                setLoading(false);
                if (res.success && res.game) {
                    setCurrentGame(res.game);
                    setAvailableGames((prev) => prev.filter((g) => g._id !== game._id));
                } else {
                    alert(res.error || "Failed to join game");
                }
            }
        );
    }

    function handleLeaveGame() {
        if (!socket) return;

        setLoading(true);
        socket.emit("leave_game", (res: GameActionResponse) => {
            setLoading(false);
            if (res.success) {
                setCurrentGame(null);
                // Re-fetch available games after leaving
                socket.emit("get_available_games", (listRes: GameListResponse) => {
                    if (listRes.success && listRes.games) {
                        setAvailableGames(listRes.games.filter((g) => g.status === "waiting"));
                    }
                });
            } else {
                alert(res.error || "Failed to leave game");
            }
        });
    }

    function handleStartGame() {
        if (!socket || !currentGame) return;

        if (currentGame.players.length < 2) {
            alert("Need at least 2 players to start");
            return;
        }

        setLoading(true);
        socket.emit(
            "start_game",
            { game_id: currentGame._id },
            (res: GameActionResponse) => {
                setLoading(false);
                if (res.success && res.game) {
                    navigate(`/newgame/${res.game._id}`);
                } else {
                    alert(res.error || "Failed to start game");
                }
            }
        );
    }

    return (
        <div className="page">
            <Navbar />
            <div className="lobby-container">
                <div className="lobby-header">
                    <h1>Game Lobby</h1>
                    <a
                        href="#"
                        onClick={(e) => { e.preventDefault(); navigate("/home"); }}
                        className="back-link"
                    >
                        ← Back to Home
                    </a>
                </div>

                <div className="lobby-content">
                    {/* If the user has already joined a game, show that game's waiting room */}
                    {currentGame ? (
                        <div className="current-game">
                            <h2>Your Current Game</h2>
                            <div className="game-info-box">
                                <p><strong>Players:</strong> {currentGame.players.length} / {currentGame.total_players}</p>
                                <div className="players-display">
                                    {currentGame.players.map((player) => (
                                        <div
                                            key={player.user_id}
                                            className="player-tag"
                                            style={{ backgroundColor: player.color }}
                                        >
                                            {player.username}
                                        </div>
                                    ))}
                                    {/* Show empty slots */}
                                    {Array.from({ length: currentGame.total_players - currentGame.players.length }).map((_, i) => (
                                        <div key={`empty-${i}`} className="player-tag empty">–</div>
                                    ))}
                                </div>
                            </div>
                            <div className="game-actions">
                                {currentGame.players[0]?.user_id === user?.userId && (
                                    <button
                                        className="start-btn"
                                        onClick={handleStartGame}
                                        disabled={currentGame.players.length < 2 || loading}
                                    >
                                        {loading ? "Starting..." : "Start Game"}
                                    </button>
                                )}
                                <button className="leave-btn" onClick={handleLeaveGame} disabled={loading}>
                                    Leave Game
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="lobby-main">
                            <button
                                className="create-btn"
                                onClick={() => setShowCreateModal(true)}
                                disabled={loading}
                            >
                                + Create New Game
                            </button>

                            {/* Create game modal */}
                            {showCreateModal && (
                                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                                        <h2>Create New Game</h2>
                                        <div className="form-group">
                                            <label>Number of Players:</label>
                                            <select
                                                value={selectedPlayers}
                                                onChange={(e) => setSelectedPlayers(parseInt(e.target.value))}
                                            >
                                                <option value={2}>2 Players</option>
                                                <option value={3}>3 Players</option>
                                                <option value={4}>4 Players</option>
                                            </select>
                                        </div>
                                        <div className="modal-actions">
                                            <button
                                                className="btn-primary"
                                                onClick={handleCreateGame}
                                                disabled={loading}
                                            >
                                                {loading ? "Creating..." : "Create"}
                                            </button>
                                            <button
                                                className="btn-secondary"
                                                onClick={() => setShowCreateModal(false)}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="available-games">
                                <h2>Available Games</h2>
                                {availableGames.length === 0 ? (
                                    <p className="empty-message">No games available. Create one!</p>
                                ) : (
                                    <div className="games-list">
                                        {availableGames.map((game) => (
                                            <div key={game._id} className="game-card">
                                                <div className="game-players">
                                                    Players: {game.players.length} / {game.total_players}
                                                </div>
                                                <div className="game-player-names">
                                                    {game.players.map((p) => (
                                                        <span key={p.user_id} className="player-name">
                                                            {p.username}
                                                        </span>
                                                    ))}
                                                </div>
                                                <button
                                                    className="join-btn"
                                                    onClick={() => handleJoinGame(game)}
                                                    disabled={game.players.length >= game.total_players || loading}
                                                >
                                                    {game.players.length >= game.total_players ? "Full" : loading ? "Joining..." : "Join"}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
