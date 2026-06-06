import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import ProtectedRoute from "./components/ProtectedRoute.tsx";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home";
import Lobby from "./pages/Lobby";
import Game from "./pages/Game";
import History from "./pages/History";
import Leaderboard from "./pages/Leaderboard";
import UpdateProfile from "./pages/Update_Profile.tsx";

function App() {
    return (
        // AuthProvider and SocketProvider wrap everything so all pages can access auth + socket
        <AuthProvider>
            <SocketProvider>
                <BrowserRouter>
                    <Routes>
                        {/* Public pages, anyone can visit */}
                        <Route path="/" element={<Landing />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<Signup />} />

                        {/* Protected pages, redirect to login if not logged in */}
                        <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
                        <Route path="/newgame/lobby" element={<ProtectedRoute><Lobby /></ProtectedRoute>} />
                        <Route path="/newgame/:game_id" element={<ProtectedRoute><Game /></ProtectedRoute>} />
                        <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
                        <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
                        <Route path="/update-profile" element={<ProtectedRoute><UpdateProfile /></ProtectedRoute>} />

                        {/* Any unknown URL goes back to the landing page */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </BrowserRouter>
            </SocketProvider>
        </AuthProvider>
    );
}

export default App;
