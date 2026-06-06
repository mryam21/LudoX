import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./signup.css";

export default function Signup() {
    const navigate = useNavigate();
    const { setUser } = useAuth();

    const [username, setUsername] = useState("");
    const [dob, setDob] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");

        // Check passwords match before sending to server
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("http://localhost:8000/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    username: username.trim(),
                    dob,
                    password,
                    confirmPassword,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.message ?? "Signup failed.");
                return;
            }

            // Store session token in cookie and set the user in auth context
            document.cookie = `token=${data.token}; path=/; max-age=86400`;
            setUser({ userId: data.userId, username: data.username, coins: data.coins, total_played: 0, wins: 0 });
            navigate("/home");
        } catch {
            setError("Network error. Is the server running?");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="page">
            <div className="auth-container">
                <div className="auth-header">
                    <h1 className="auth-title">🎲 LUDO</h1>
                    <p className="auth-subtitle">Create Your Account</p>
                </div>

                <div className="auth-card">
                    <h2>Sign Up</h2>

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label" htmlFor="username">Username</label>
                            <input
                                type="text"
                                id="username"
                                className="form-input"
                                placeholder="Choose a username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                minLength={2}
                                maxLength={20}
                            />
                            <span className="form-hint">Must be unique and 2–20 characters</span>
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="dob">Date of Birth</label>
                            <input
                                type="date"
                                id="dob"
                                className="form-input"
                                value={dob}
                                onChange={(e) => setDob(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="password">Password</label>
                            <input
                                type="password"
                                id="password"
                                className="form-input"
                                placeholder="Enter a strong password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                            <span className="form-hint">Minimum 6 characters</span>
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="confirm-password">Confirm Password</label>
                            <input
                                type="password"
                                id="confirm-password"
                                className="form-input"
                                placeholder="Re-enter your password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                        </div>

                        {error && (
                            <span className="form-hint" style={{ color: "#c62828" }}>{error}</span>
                        )}

                        <button type="submit" className="form-button" disabled={loading}>
                            {loading ? "Creating account..." : "Create Account"}
                        </button>
                    </form>

                    <div className="auth-footer">
                        <p>Already have an account? <Link to="/login" className="auth-link">Login</Link></p>
                    </div>
                </div>
            </div>
        </div>
    );
}
