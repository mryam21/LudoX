import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    function handleMouseEnter() {
        if (closeTimer.current) clearTimeout(closeTimer.current);
        setDropdownOpen(true);
    }

    function handleMouseLeave() {
        closeTimer.current = setTimeout(() => setDropdownOpen(false), 150);
    }

    function handleLogout() {
        logout();
        navigate("/");
    }

    return (
        <nav className="navbar">
            <div className="navbar-left">
                <a
                    href="#"
                    className="navbar-title"
                    onClick={(e) => {
                        e.preventDefault();
                        navigate("/home");
                    }}
                >
                    🎲 LUDO
                </a>
            </div>

            <div className="navbar-right">
                <div className="coin-display">
                    <span className="coin-icon">💰</span>
                    <span className="coin-amount">{user?.coins ?? 0} Coins</span>
                </div>

                <div
                    className="user-dropdown"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    <button className="dropdown-btn">{user?.username ?? "User"} ▼</button>
                    {dropdownOpen && (
                        <div className="dropdown-menu">
                            <a
                                href="#"
                                className="dropdown-item"
                                onClick={(e) => {
                                    e.preventDefault();
                                    navigate("/update-profile");
                                }}
                            >
                                Update Profile
                            </a>
                            <a
                                href="#"
                                className="dropdown-item logout-btn"
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleLogout();
                                }}
                            >
                                Logout
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}
