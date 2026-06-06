import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import "./history.css";

// Game record returned from the server
interface GameRecord {
    _id: string;
    total_players: number;
    players: {
        user_id: string;
        username: string;
        rank: number;
        coins_earned: number;
    }[];
    finished_at: string;
}

export default function History() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [games, setGames] = useState<GameRecord[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch this user's game history when the page loads
    useEffect(() => {
        fetch("http://localhost:8000/api/stats/history", { credentials: "include" })
            .then((res) => res.json())
            .then((data) => setGames(data.games ?? []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    // Convert a rank number to a readable label
    function positionLabel(rank: number) {
        if (rank === 1) return "1st Place 🥇";
        if (rank === 2) return "2nd Place 🥈";
        if (rank === 3) return "3rd Place 🥉";
        return "4th Place";
    }

    return (
        <div className="page">
            <Navbar />
            <div className="history-container">
                <div className="history-header">
                    <div className="header-top">
                        <h2>Game History</h2>
                        <a
                            href="#"
                            className="back-link"
                            onClick={(e) => { e.preventDefault(); navigate("/home"); }}
                        >
                            ← Back to Home
                        </a>
                    </div>
                    <p className="header-subtitle">Review all your past matches</p>
                </div>

                <div className="history-list">
                    {loading && <p style={{ color: "#fff" }}>Loading...</p>}

                    {!loading && games.length === 0 && (
                        <p style={{ color: "#ccc" }}>No games played yet. Go play one!</p>
                    )}

                    {games.map((game, idx) => {
                        // Find the entry for the logged-in user in this game
                        const myEntry = game.players.find(
                            (p) => p.user_id?.toString() === user?.userId
                        );

                        // Sort players by finishing rank so the display order matches results
                        const sortedPlayers = [...game.players].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));

                        // Build the 4-slot finishing order; pad with "–" for games with fewer than 4 players
                        const finishSlots: string[] = [1, 2, 3, 4].map((slot) => {
                            const p = sortedPlayers.find((x) => x.rank === slot);
                            if (!p) return "–";
                            return p.user_id?.toString() === user?.userId ? "You" : p.username;
                        });

                        return (
                            <div className="history-item" key={game._id}>
                                <div className="game-header">
                                    <span className="game-id">Game #{idx + 1}</span>
                                    <span className="game-date">
                                        {new Date(game.finished_at).toLocaleString()}
                                    </span>
                                </div>

                                <div className="game-details">
                                    <div className="detail-row">
                                        <span className="label">Players:</span>
                                        <span className="value">{game.total_players}-player game</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">Finishing Order:</span>
                                        <span className="value">{finishSlots.join(", ")}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">Your Position:</span>
                                        <span className={`value position-${myEntry?.rank}st`}>
                                            {positionLabel(myEntry?.rank ?? 4)}
                                        </span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">Coins Earned:</span>
                                        <span className="coins">+{myEntry?.coins_earned ?? 0}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
