import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import io, { Socket } from "socket.io-client";

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

// Wrap the whole app with this so any component can access the socket
export function SocketProvider({ children }: { children: ReactNode }) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        // Create a single socket connection for the entire app lifetime
        const newSocket = io("http://localhost:8000", {
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5,
        });

        newSocket.on("connect", () => {
            console.log("Connected to server");
            setIsConnected(true);
        });

        newSocket.on("disconnect", () => {
            console.log("Disconnected from server");
            setIsConnected(false);
        });

        setSocket(newSocket);

        // Clean up the socket when the app unmounts
        return () => {
            newSocket.close();
        };
    }, []);

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
}

// syntax wrapper to access the socket from any component
export function useSocket() {
    const ctx = useContext(SocketContext);
    if (!ctx) {
        throw new Error("useSocket must be used within SocketProvider");
    }
    return ctx;
}
