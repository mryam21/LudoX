import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./leaderboard.css";

interface LeaderboardEntry {
    username: string;
    coins: number;
    total_played: number;
    wins: number;
}

export default function Leaderboard() {
    const navigate = useNavigate();
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);

    // Load leaderboard data when the page opens
    useEffect(() => {
        fetch("http://localhost:8000/api/stats/leaderboard", { credentials: "include" })
            .then((res) => res.json())
            .then((data) => setEntries(data.leaderboard ?? []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    // Filter entries based on the search input
    const filtered = entries.filter((entry) =>
        entry.username.toLowerCase().includes(search.toLowerCase())
    );

    // Medal emoji for the top 3 ranks
    function rankLabel(index: number) {
        if (index === 0) return "🥇 1st";
        if (index === 1) return "🥈 2nd";
        if (index === 2) return "🥉 3rd";
        return `${index + 1}th`;
    }

    return (
        <div className="page">
            <Navbar />
            <div className="leaderboard-container">
                <div className="leaderboard-header">
                    <div className="header-top">
                        <h2>Global Leaderboard</h2>
                        <a
                            href="#"
                            className="back-link"
                            onClick={(e) => { e.preventDefault(); navigate("/home"); }}
                        >
                            ← Back to Home
                        </a>
                    </div>
                    <div className="search-section">
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Search by username..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="leaderboard-wrapper">
                    <table className="leaderboard-table">
                        <thead>
                            <tr>
                                <th className="rank-col">Rank</th>
                                <th className="name-col">Username</th>
                                <th className="games-col">Games Played</th>
                                <th className="wins-col">Wins</th>
                                <th className="coins-col">Coins</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: "center", padding: 20 }}>
                                        Loading...
                                    </td>
                                </tr>
                            )}
                            {!loading && filtered.length === 0 && (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: "center", padding: 20 }}>
                                        No players found
                                    </td>
                                </tr>
                            )}
                            {filtered.map((entry, i) => (
                                <tr key={entry.username}>
                                    <td className="rank">{rankLabel(i)}</td>
                                    <td className="username">{entry.username}</td>
                                    <td className="games">{entry.total_played}</td>
                                    <td className="wins">{entry.wins ?? 0}</td>
                                    <td className="coins">{entry.coins}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
