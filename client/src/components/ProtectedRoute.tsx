import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Wrap any route that requires login with this component.
// If the user is not logged in, they get redirected to the login page.
export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();

    // Still checking the session cookie —> don't redirect yet
    if (loading) {
        return <div style={{ color: "#fff", padding: 40 }}>Loading...</div>;
    }

    // Not logged in —> send to login
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Logged in —> render the protected page
    return <>{children}</>;
}
