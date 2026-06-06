import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import "./update-profile.css";

export default function UpdateProfile() {
    const navigate = useNavigate();
    const { user, setUser } = useAuth();

    const [username, setUsername] = useState(user?.username ?? "");
    const [dob, setDob] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");
        setSuccess("");

        // Validate new passwords match before sending to server
        if (newPassword && newPassword !== confirmNewPassword) {
            setError("New passwords do not match.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("http://localhost:8000/api/auth/update-profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    username: username.trim() || undefined,
                    dob: dob || undefined,
                    currentPassword: currentPassword || undefined,
                    newPassword: newPassword || undefined,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.message ?? "Update failed.");
                return;
            }

            // Refresh the auth context with the updated user data
            if (data.user) {
                setUser(data.user);
            }

            setSuccess("Profile updated successfully!");
        } catch {
            setError("Network error. Is the server running?");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="page">
            <Navbar />
            <div className="profile-container">
                <div className="profile-header">
                    <h2>Update Profile</h2>
                    <p>Edit your account information</p>
                </div>

                <div className="profile-card">
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label" htmlFor="username">Username</label>
                            <input
                                type="text"
                                id="username"
                                className="form-input"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                minLength={2}
                                maxLength={20}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="dob">Date of Birth</label>
                            <input
                                type="date"
                                id="dob"
                                className="form-input"
                                value={dob}
                                onChange={(e) => setDob(e.target.value)}
                            />
                        </div>

                        <div className="form-divider"><span>Change Password (Optional)</span></div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="current-password">Current Password</label>
                            <input
                                type="password"
                                id="current-password"
                                className="form-input"
                                placeholder="Enter your current password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="new-password">New Password</label>
                            <input
                                type="password"
                                id="new-password"
                                className="form-input"
                                placeholder="Enter a new password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                minLength={6}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="confirm-new-password">Confirm New Password</label>
                            <input
                                type="password"
                                id="confirm-new-password"
                                className="form-input"
                                placeholder="Re-enter your new password"
                                value={confirmNewPassword}
                                onChange={(e) => setConfirmNewPassword(e.target.value)}
                                minLength={6}
                            />
                        </div>

                        {error && (
                            <p style={{ color: "#c62828", fontSize: 14, marginBottom: 10 }}>{error}</p>
                        )}
                        {success && (
                            <p style={{ color: "#2e7d32", fontSize: 14, marginBottom: 10 }}>{success}</p>
                        )}

                        <div className="form-actions">
                            <button type="submit" className="btn-save" disabled={loading}>
                                {loading ? "Saving..." : "Save Changes"}
                            </button>
                            <button
                                type="button"
                                className="btn-cancel"
                                onClick={() => navigate("/home")}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>

                <div className="profile-info">
                    <h3>Account Information</h3>
                    <div className="info-grid">
                        <div className="info-item">
                            <span className="info-label">Coin Balance</span>
                            <span className="info-value">{user?.coins ?? 100} Coins</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
