import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

// Logged-in user stored in context
interface AuthUser {
    userId: string;
    username: string;
    coins: number;
    total_played?: number;
    wins?: number;
}

// Everything the context provides to components
interface AuthContextType {
    user: AuthUser | null;
    loading: boolean;
    setUser: (u: AuthUser | null) => void;
    logout: () => void;
}

// Create the context (null by default —> must be used inside AuthProvider)
const AuthContext = createContext<AuthContextType | null>(null);

// Wrap the whole app with this so any component can access auth state
export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    // On first load, check if the user already has a valid session cookie
    useEffect(() => {
        fetch("http://localhost:8000/api/auth/me", { credentials: "include" })
            .then((res) => {
                if (res.ok) return res.json();
                return null;
            })
            .then((data) => {
                if (data && data.userId) {
                    setUser(data);
                }
            })
            .catch(() => {
                // ignore network errors on startup
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    // Clear the session cookie and remove user from state
    function logout() {
        document.cookie = "token=; path=/; max-age=0";
        setUser(null);
    }

    return (
        <AuthContext.Provider value={{ user, loading, setUser, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

// Equivalent of the call useContext(AuthContext) 
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error("useAuth must be used inside AuthProvider");
    }
    return ctx;
}
