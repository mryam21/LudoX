import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import "./home.css";

export default function Home() {
    const navigate = useNavigate();
    const { user, setUser } = useAuth();
    const [activeGame, setActiveGame] = useState<string | null>(null);

    // On mount: refresh stats from server and check if the user has a game in progress
    useEffect(() => {
        const currentUserId = user?.userId;

        fetch("http://localhost:8000/api/auth/me", { credentials: "include" })
            .then((res) => {
                if (res.ok) return res.json();
                return null;
            })
            .then((data) => {
                // Only update if the cookie belongs to the currently logged-in user.
                // In multi-tab testing the cookie can get overwritten by another user's login.
                if (data?.userId) {
                    if (!currentUserId || data.userId.toString() === currentUserId.toString()) {
                        setUser(data);
                    }
                }
            })
            .catch(() => {});

        // Check if there is an unfinished game stored from a previous session
        const stored = sessionStorage.getItem("activeGame");
        if (stored) {
            setActiveGame(stored);
        }
    }, [setUser]);

    // Stats Calculation
    const totalPlayed = user?.total_played ?? 0;
    const wins = user?.wins ?? 0;
    const winRate = totalPlayed > 0 ? Math.round((wins / totalPlayed) * 100) : 0;

    return (
        <div className="page">
            <Navbar />

            <div className="dashboard-container">
                <div className="dashboard-header">
                    <h2>Welcome, {user?.username}!</h2>
                    <p>Choose an option below to continue</p>
                </div>

                {/* Show rejoin banner if the user left a game without finishing */}
                {activeGame && (
                    <div className="rejoin-banner">
                        <span>You have an active game in progress</span>
                        <button
                            className="card-button"
                            onClick={() => navigate(`/newgame/${activeGame}`)}
                        >
                            Rejoin Game
                        </button>
                    </div>
                )}

                <div className="dashboard-grid">
                    <div className="dashboard-card play-card">
                        <div className="card-icon">🎮</div>
                        <h3>Play Game</h3>
                        <p>Join a lobby and play with other players</p>
                        <button className="card-button" onClick={() => navigate("/newgame/lobby")}>
                            Start Playing
                        </button>
                    </div>

                    <div className="dashboard-card leaderboard-card">
                        <div className="card-icon">🏆</div>
                        <h3>Leaderboard</h3>
                        <p>Check global rankings and player stats</p>
                        <button className="card-button" onClick={() => navigate("/leaderboard")}>
                            View Rankings
                        </button>
                    </div>

                    <div className="dashboard-card history-card">
                        <div className="card-icon">📊</div>
                        <h3>Game History</h3>
                        <p>Review your past matches and results</p>
                        <button className="card-button" onClick={() => navigate("/history")}>
                            View History
                        </button>
                    </div>
                </div>

                <div className="stats-section">
                    <h3>Your Stats</h3>
                    <div className="stats-grid">
                        <div className="stat-item">
                            <span className="stat-label">Total Games</span>
                            <span className="stat-value">{totalPlayed}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Wins</span>
                            <span className="stat-value">{wins}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Win Rate</span>
                            <span className="stat-value">{winRate}%</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Total Coins</span>
                            <span className="stat-value">{user?.coins ?? 100}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
