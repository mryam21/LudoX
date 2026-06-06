import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import "../game.css";

// ===== Socket callback response types =====

interface JoinRoomResponse {
    success: boolean;
    error?: string;
    gameState?: GameState;
}

interface RollDiceResponse {
    success: boolean;
    error?: string;
    diceValue?: number;
    movableTokenIndices?: number[];
}

// ===== Type definitions =====

interface PlayerState {
    user_id: string;
    username: string;
    color: string;
    tokens: number[];
    tokensFinished: number;
    captures: number;
    turnsTaken: number;
    sixesRolled: number;
    isConnected: boolean;
}

interface ChatMsg {
    sender: string;
    color: string;
    text: string;
    isSystem: boolean;
    time: string;
}

interface LogEntry {
    time: string;
    color: string;
    text: string;
    type: string;
}

interface GameState {
    game_id: string;
    players: PlayerState[];
    currentTurnIndex: number;
    currentTurnColor: string | null;
    currentTurnUserId: string | null;
    diceValue: number | null;
    diceRolled: boolean;
    movableTokenIndices: number[];
    rankings: string[];
    isGameOver: boolean;
    chatMessages: ChatMsg[];
    gameLog: LogEntry[];
    turnNumber: number;
    timeLeft: number;
    numPlayers: number;
}

interface Standing {
    rank: number;
    user_id: string;
    username: string;
    color: string;
    coins: number;
}

// ===== Board geometry =====

// How far each color's track is offset on the shared 52-square ring
const COLOR_OFFSETS: Record<string, number> = { red: 0, blue: 13, yellow: 26, green: 39 };
const SAFE_ABS = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

function relToAbs(rel: number, color: string) {
    return (rel + COLOR_OFFSETS[color]) % 52;
}

// Returns a unique key for whichever board cell a token should appear in
function tokenCellKey(color: string, relPos: number): string {
    if (relPos === -1) return `yard-${color}`;
    if (relPos === 56) return "centre";
    if (relPos >= 51) return `hc-${color}-${relPos - 51}`;
    return `track-${relToAbs(relPos, color)}`;
}

// Formats seconds into MM:SS display string
function formatTime(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

interface TokenInfo {
    color: string;
    label: string;
    movable: boolean;
    tokenIdx: number;
    playerIdx: number;
}

// Builds a map from cell key -> list of tokens on that cell
function buildTokenMap(gameState: GameState, isMyTurn: boolean): Map<string, TokenInfo[]> {
    const map = new Map<string, TokenInfo[]>();

    gameState.players.forEach((player, playerIdx) => {
        const isCurrentPlayer = playerIdx === gameState.currentTurnIndex && isMyTurn;

        player.tokens.forEach((relPos, tokenIdx) => {
            const label = `${player.color[0].toUpperCase()}${tokenIdx + 1}`;
            const movable = isCurrentPlayer && gameState.diceRolled && gameState.movableTokenIndices.includes(tokenIdx);
            const cellKey = tokenCellKey(player.color, relPos);

            if (!map.has(cellKey)) map.set(cellKey, []);
            map.get(cellKey)!.push({ color: player.color, label, movable, tokenIdx, playerIdx });
        });
    });

    return map;
}

// ===== Small board components =====

function Token({ color, label, movable, onClick }: {
    color: string;
    label: string;
    movable: boolean;
    onClick?: () => void;
}) {
    const colorClass = color === "yellow" ? "yel" : color;
    const className = `token token--${colorClass}${movable ? " movable" : ""}`;
    return (
        <div className={className} onClick={movable ? onClick : undefined}>
            {label}
        </div>
    );
}

function Sq({ extra, tokens }: {
    extra?: string;
    tokens: { color: string; label: string; movable: boolean; onClick: () => void }[];
}) {
    const count = tokens.length;
    return (
        <div
            className={`sq${extra ? " " + extra : ""}`}
            data-count={count > 1 ? count : undefined}
        >
            {tokens.map((t, i) => (
                <Token
                    key={i}
                    color={t.color}
                    label={t.label}
                    movable={t.movable}
                    onClick={t.onClick}
                />
            ))}
        </div>
    );
}

// ===== Main Game component =====

export default function Game() {
    const { game_id } = useParams<{ game_id: string }>();
    const navigate = useNavigate();
    const { user, setUser } = useAuth();
    const { socket } = useSocket();

    const [gameState, setGameState] = useState<GameState | null>(null);
    const [timeLeft, setTimeLeft] = useState(20);
    const [rollHistory, setRollHistory] = useState<number[]>([]);
    const [chatInput, setChatInput] = useState("");
    const [victory, setVictory] = useState<{ standings: Standing[]; duration: number } | null>(null);
    const [dieAnim, setDieAnim] = useState(false);

    const chatRef = useRef<HTMLDivElement>(null);
    const logRef = useRef<HTMLDivElement>(null);

    // Scroll chat and log panels to bottom when new messages arrive
    useEffect(() => {
        chatRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, [gameState?.chatMessages.length]);

    useEffect(() => {
        logRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, [gameState?.gameLog.length]);

    // Expand the board to full width (game page has different layout than other pages)
    useEffect(() => {
        const root = document.getElementById("root");
        const prevBodyBg = document.body.style.background;
        const prevMaxWidth = root?.style.maxWidth ?? "";
        const prevBorder = root?.style.borderInline ?? "";

        document.body.style.background = "#2c5f2e";
        if (root) {
            root.style.maxWidth = "none";
            root.style.borderInline = "none";
            root.style.textAlign = "left";
        }

        return () => {
            document.body.style.background = prevBodyBg;
            if (root) {
                root.style.maxWidth = prevMaxWidth;
                root.style.borderInline = prevBorder;
                root.style.textAlign = "";
            }
        };
    }, []);

    // Join the game room and set up all socket listeners
    useEffect(() => {
        if (!socket || !user || !game_id) return;

        // for the Rejoin button thing
        sessionStorage.setItem("activeGame", game_id);

        socket.emit("join_game_room", { game_id, userId: user.userId }, (res: JoinRoomResponse) => {
            if (res.success && res.gameState) {
                setGameState(res.gameState);
                setTimeLeft(res.gameState.timeLeft);
            } else if (!res.success) {
                sessionStorage.removeItem("activeGame");
                alert(res.error || "Failed to join game");
                navigate("/newgame/lobby");
            }
        });

        function onStateUpdate(state: GameState) {
            setGameState(state);
            setTimeLeft(state.timeLeft);
        }

        function onTimerTick({ timeLeft: t }: { timeLeft: number }) {
            setTimeLeft(t);
        }

        function onChatMessage(msg: ChatMsg) {
            setGameState((prev) => {
                if (!prev) return prev;
                return { ...prev, chatMessages: [...prev.chatMessages, msg] };
            });
        }

        function onGameOver(data: { standings: Standing[]; duration: number }) {
            sessionStorage.removeItem("activeGame");
            setVictory(data);

            // Refresh the user's coin balance after the game ends
            const myId = user?.userId;
            fetch("http://localhost:8000/api/auth/me", { credentials: "include" })
                .then((r) => r.ok ? r.json() : null)
                .then((d) => {
                    if (d?.userId && myId && d.userId.toString() === myId.toString()) {
                        setUser(d);
                    }
                })
                .catch(() => {});
        }

        socket.on("game_state_update", onStateUpdate);
        socket.on("timer_tick", onTimerTick);
        socket.on("chat_message", onChatMessage);
        socket.on("game_over", onGameOver);

        return () => {
            socket.off("game_state_update", onStateUpdate);
            socket.off("timer_tick", onTimerTick);
            socket.off("chat_message", onChatMessage);
            socket.off("game_over", onGameOver);
        };
    }, [socket, user, game_id, navigate]);

    // Is it the current user's turn?
    const isMyTurn = gameState?.currentTurnUserId === user?.userId;
    const myPlayer = gameState?.players.find((p) => p.user_id === user?.userId);

    // Roll the dice
    const doRoll = useCallback(() => {
        if (!socket || !user || !game_id) return;

        socket.emit("roll_dice", { game_id, userId: user.userId }, (res: RollDiceResponse) => {
            if (res.success) {
                setDieAnim(true);
                setTimeout(() => setDieAnim(false), 350);
                if (res.diceValue !== undefined) {
                    setRollHistory((prev) => [res.diceValue as number, ...prev].slice(0, 5));
                }
            }
        });
    }, [socket, user, game_id]);

    // Move a token after rolling
    const doMove = useCallback((tokenIndex: number) => {
        if (!socket || !user || !game_id) return;
        socket.emit("move_token", { game_id, userId: user.userId, tokenIndex }, () => {});
    }, [socket, user, game_id]);

    // Send a chat message
    const doChat = useCallback(() => {
        if (!chatInput.trim() || !socket || !user || !game_id) return;
        socket.emit("send_chat", { game_id, userId: user.userId, text: chatInput }, () => {});
        setChatInput("");
    }, [chatInput, socket, user, game_id]);

    // Get the list of tokens for a given cell key, formatted for the Sq component
    function cellTokens(key: string) {
        const tokens: TokenInfo[] = tokenMap.get(key) ?? [];
        return tokens.map((t) => ({
            color: t.color,
            label: t.label,
            movable: t.movable,
            onClick: () => doMove(t.tokenIdx),
        }));
    }

    // Renders a main track square (absolute position 0-51)
    function TrackSquare(absPos: number) {
        let extraClass = "";
        if (absPos === 0) extraClass = "sq--start-red";
        else if (absPos === 13) extraClass = "sq--start-blue";
        else if (absPos === 26) extraClass = "sq--start-yellow";
        else if (absPos === 39) extraClass = "sq--start-green";
        else if (SAFE_ABS.has(absPos)) extraClass = "sq--safe";

        return (
            <Sq
                key={`track-${absPos}`}
                extra={extraClass}
                tokens={cellTokens(`track-${absPos}`)}
            />
        );
    }

    // Renders a home column square (the coloured lane leading to centre)
    function HomeColSquare(color: string, step: number) {
        return (
            <Sq
                key={`hc-${color}-${step}`}
                extra={`sq--home-${color}`}
                tokens={cellTokens(`hc-${color}-${step}`)}
            />
        );
    }

    // Renders a single yard slot (each player has 4 slots for their yard tokens)
    function YardSlot(color: string, slotIdx: number) {
        const allYardTokens = tokenMap.get(`yard-${color}`) ?? [];
        const token = allYardTokens[slotIdx];
        return (
            <div key={slotIdx} className="token-slot">
                {token && (
                    <Token
                        color={token.color}
                        label={token.label}
                        movable={token.movable}
                        onClick={() => doMove(token.tokenIdx)}
                    />
                )}
            </div>
        );
    }

    // Show loading screen while waiting for server response
    if (!gameState) {
        return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", color: "#a5d6a7", fontSize: 20 }}>
                Connecting to game…
            </div>
        );
    }

    const tokenMap = buildTokenMap(gameState, isMyTurn);
    const currentPlayer = gameState.players[gameState.currentTurnIndex];
    const canRoll = isMyTurn && !gameState.diceRolled && !gameState.isGameOver;

    return (
        <div className="game-page">

            {/* Victory screen overlay */}
            {victory && (
                <div className="victory-overlay">
                    <div className="victory-card">
                        <div className="vc-trophy">🏆</div>
                        <h2>Game Over!</h2>
                        <div className={`vc-winner color-${victory.standings[0]?.color}`}>
                            {victory.standings[0]?.username} wins!
                        </div>
                        <div className="vc-standings">
                            {victory.standings.map((s) => (
                                <div key={s.user_id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "3px 0" }}>
                                    <span className="s-rank">{s.rank}.</span>
                                    <span className={`p-dot dot-${s.color}`} style={{ display: "inline-block", width: 12, height: 12, borderRadius: "50%" }} />
                                    <span style={{ flex: 1 }}>{s.username}</span>
                                    <strong className={`color-${s.color}`}>+{s.coins} coins</strong>
                                </div>
                            ))}
                        </div>
                        <div className="vc-stats">
                            Duration: {Math.floor(victory.duration / 60)}m {victory.duration % 60}s
                        </div>
                        <div className="vc-actions">
                            <button className="btn btn-success" onClick={() => navigate("/newgame/lobby")}>
                                Play Again
                            </button>
                            <button className="btn btn-muted" onClick={() => navigate("/home")}>
                                Main Menu
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Top bar with room info, timer, and leave button */}
            <div className="game-topbar">
                <div className="game-topbar-info">
                    <div><span>Room: </span><strong>#{game_id?.slice(-6).toUpperCase()}</strong></div>
                    <div><span>Mode: </span><strong>Classic ({gameState.numPlayers}-player)</strong></div>
                    <div><span>Turn: </span><strong>{gameState.turnNumber}</strong></div>
                </div>
                <div className={`game-timer${timeLeft <= 5 ? " warning" : ""}`}>
                    {formatTime(timeLeft)}
                </div>
                <button
                    className="btn btn-danger"
                    onClick={() => {
                        socket?.emit("leave_game_room", { game_id, userId: user?.userId }, () => {});
                        navigate("/home");
                    }}
                >
                    ✕ Leave
                </button>
            </div>

            {/* Main layout: left sidebar | board | right sidebar */}
            <div className="game-layout">

                {/* LEFT SIDEBAR — dice + player list */}
                <aside>
                    <div className="panel">
                        <div className="panel-hd">
                            {isMyTurn ? "Your Turn – Roll Dice" : `${currentPlayer?.username}'s Turn`}
                        </div>
                        <div className="panel-bd">
                            <div className={`die-number${dieAnim ? " rolled" : ""}`}>
                                {gameState.diceValue ?? "?"}
                            </div>
                            <button className="roll-btn" disabled={!canRoll} onClick={doRoll}>
                                {canRoll
                                    ? "Roll!"
                                    : gameState.diceRolled && isMyTurn
                                        ? "Select Token"
                                        : "Waiting…"}
                            </button>
                            <div className="roll-hist">
                                Recent:&nbsp;
                                {rollHistory.map((v, i) => (
                                    <span key={i} className="rp">{v}</span>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="panel">
                        <div className="panel-hd">Players</div>
                        <div className="panel-bd">
                            {gameState.players.map((player, idx) => {
                                const onBoard = player.tokens.filter((t) => t >= 0 && t <= 50).length;
                                const inYard = player.tokens.filter((t) => t === -1).length;
                                const isActive = idx === gameState.currentTurnIndex;
                                return (
                                <div
                                    key={player.user_id}
                                    className={`player-card${isActive ? " active" : ""}${!player.isConnected ? " disconnected" : ""}`}
                                >
                                    {isActive && (
                                        <span className="active-badge">Your Turn</span>
                                    )}
                                    <div className="p-name">
                                        <div className={`p-dot dot-${player.color}`} />
                                        {player.username}
                                        {player.user_id === user?.userId ? " (You)" : ""}
                                        {!player.isConnected ? " 🔌" : ""}
                                    </div>
                                    <div className="p-stats">
                                        Board:{onBoard} | Yard:{inYard} | Fin:{player.tokensFinished}
                                    </div>
                                    <div className="prog-wrap">
                                        <div
                                            className={`prog-fill bg-${player.color}`}
                                            style={{ width: `${Math.round((player.tokensFinished / 4) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    </div>
                </aside>

                {/* BOARD */}
                <div className="board-area">
                    <div className="ludo-board">

                        {/* Top row: Red home yard | top track section | Blue home yard */}
                        <div className="board-row board-row--top">
                            <div className="home home--red">
                                <div className="yard">
                                    {[0, 1, 2, 3].map((i) => YardSlot("red", i))}
                                </div>
                            </div>

                            <div className="track-col track-col--top">
                                {TrackSquare(10)}{TrackSquare(11)}{TrackSquare(12)}
                                {TrackSquare(9)}{HomeColSquare("blue", 0)}{TrackSquare(13)}
                                {TrackSquare(8)}{HomeColSquare("blue", 1)}{TrackSquare(14)}
                                {TrackSquare(7)}{HomeColSquare("blue", 2)}{TrackSquare(15)}
                                {TrackSquare(6)}{HomeColSquare("blue", 3)}{TrackSquare(16)}
                                {TrackSquare(5)}{HomeColSquare("blue", 4)}{TrackSquare(17)}
                            </div>

                            <div className="home home--blue">
                                <div className="yard">
                                    {[0, 1, 2, 3].map((i) => YardSlot("blue", i))}
                                </div>
                            </div>
                        </div>

                        {/* Middle row: left track | centre star | right track */}
                        <div className="board-row board-row--mid">
                            <div className="track-col track-col--left">
                                {TrackSquare(51)}{TrackSquare(0)}{TrackSquare(1)}{TrackSquare(2)}{TrackSquare(3)}{TrackSquare(4)}
                                {TrackSquare(50)}{HomeColSquare("red", 0)}{HomeColSquare("red", 1)}{HomeColSquare("red", 2)}{HomeColSquare("red", 3)}{HomeColSquare("red", 4)}
                                {TrackSquare(49)}{TrackSquare(48)}{TrackSquare(47)}{TrackSquare(46)}{TrackSquare(45)}{TrackSquare(44)}
                            </div>

                            <div className="centre">
                                <div className="tri tri--top" />
                                <div className="tri tri--right" />
                                <div className="tri tri--bot" />
                                <div className="tri tri--left" />
                                <span className="centre-star">★</span>
                                <div className="centre-tokens">
                                    {(tokenMap.get("centre") ?? [] as TokenInfo[]).map((t: TokenInfo, i: number) => (
                                        <Token key={i} color={t.color} label={t.label} movable={false} />
                                    ))}
                                </div>
                            </div>

                            <div className="track-col track-col--right">
                                {TrackSquare(18)}{TrackSquare(19)}{TrackSquare(20)}{TrackSquare(21)}{TrackSquare(22)}{TrackSquare(23)}
                                {HomeColSquare("yellow", 4)}{HomeColSquare("yellow", 3)}{HomeColSquare("yellow", 2)}{HomeColSquare("yellow", 1)}{HomeColSquare("yellow", 0)}{TrackSquare(24)}
                                {TrackSquare(30)}{TrackSquare(29)}{TrackSquare(28)}{TrackSquare(27)}{TrackSquare(26)}{TrackSquare(25)}
                            </div>
                        </div>

                        {/* Bottom row: Green home yard | bottom track section | Yellow home yard */}
                        <div className="board-row board-row--bot">
                            <div className="home home--green">
                                <div className="yard">
                                    {[0, 1, 2, 3].map((i) => YardSlot("green", i))}
                                </div>
                            </div>

                            <div className="track-col track-col--bot">
                                {TrackSquare(43)}{HomeColSquare("green", 4)}{TrackSquare(31)}
                                {TrackSquare(42)}{HomeColSquare("green", 3)}{TrackSquare(32)}
                                {TrackSquare(41)}{HomeColSquare("green", 2)}{TrackSquare(33)}
                                {TrackSquare(40)}{HomeColSquare("green", 1)}{TrackSquare(34)}
                                {TrackSquare(39)}{HomeColSquare("green", 0)}{TrackSquare(35)}
                                {TrackSquare(38)}{TrackSquare(37)}{TrackSquare(36)}
                            </div>

                            <div className="home home--yellow">
                                <div className="yard">
                                    {[0, 1, 2, 3].map((i) => YardSlot("yellow", i))}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* RIGHT SIDEBAR — chat, game log, scores */}
                <aside>
                    <div className="panel">
                        <div className="panel-hd">Live Chat</div>
                        <div className="chat-window">
                            <div className="chat-messages">
                                {gameState.chatMessages.map((msg, i) => {
                                    const isMyMessage = msg.sender === user?.username;
                                    return (
                                        <div key={i} className={`chat-msg${msg.isSystem ? " sys" : isMyMessage ? " mine" : ""}`}>
                                            {!msg.isSystem && (
                                                <div className="msg-meta" style={isMyMessage ? { justifyContent: "flex-end" } : {}}>
                                                    {!isMyMessage && (
                                                        <span className={`msg-sender msg-sender-${msg.color}`}>{msg.sender}</span>
                                                    )}
                                                    <span className="msg-time">{msg.time}</span>
                                                    {isMyMessage && (
                                                        <span className={`msg-sender msg-sender-${msg.color}`}>{msg.sender}</span>
                                                    )}
                                                </div>
                                            )}
                                            <div className="msg-bubble">{msg.text}</div>
                                        </div>
                                    );
                                })}
                                <div ref={chatRef} />
                            </div>

                            {/* Quick emoji reactions */}
                            <div className="quick-react">
                                {["👏", "😂", "😱", "👍", "😬", "🎉"].map((emoji) => (
                                    <button
                                        key={emoji}
                                        className="qr-btn"
                                        onClick={() => socket?.emit("send_chat", { game_id, userId: user?.userId, text: emoji }, () => {})}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>

                            <div className="chat-input-row">
                                <input
                                    type="text"
                                    placeholder="Type a message…"
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && doChat()}
                                />
                                <button onClick={doChat}>Send</button>
                            </div>
                        </div>
                    </div>

                    <div className="panel">
                        <div className="panel-hd">Game Log</div>
                        <div className="game-log">
                            {gameState.gameLog.map((entry, i) => (
                                <div key={i} className={`log-entry ${entry.type}`}>
                                    <span className="log-time">{entry.time}</span>
                                    <div className={`log-dot log-dot-${entry.color === "system" ? "system" : entry.color}`} />
                                    <span className="log-text">{entry.text}</span>
                                </div>
                            ))}
                            <div ref={logRef} />
                        </div>
                    </div>

                    <div className="panel">
                        <div className="panel-hd">Scores &amp; Stats</div>
                        <div className="panel-bd">
                            <div className="score-grid">
                                <div className="score-cell">
                                    <div className="sc-label">Captures</div>
                                    <div className="sc-value" style={{ color: "#c62828" }}>{myPlayer?.captures ?? 0}</div>
                                </div>
                                <div className="score-cell">
                                    <div className="sc-label">Finished</div>
                                    <div className="sc-value" style={{ color: "#2e7d32" }}>{myPlayer?.tokensFinished ?? 0}</div>
                                </div>
                                <div className="score-cell">
                                    <div className="sc-label">Turns</div>
                                    <div className="sc-value">{myPlayer?.turnsTaken ?? 0}</div>
                                </div>
                                <div className="score-cell">
                                    <div className="sc-label">6s Rolled</div>
                                    <div className="sc-value" style={{ color: "#1565c0" }}>{myPlayer?.sixesRolled ?? 0}</div>
                                </div>
                            </div>

                            <div className="standings-title">Standings</div>
                            {gameState.players
                                .slice()
                                .sort((a, b) => b.tokensFinished - a.tokensFinished || b.captures - a.captures)
                                .map((player, i) => (
                                    <div key={player.user_id} className="standing-row">
                                        <span className="s-rank">{i + 1}.</span>
                                        <div className={`p-dot dot-${player.color}`} />
                                        <span style={{ flex: 1 }}>{player.username}</span>
                                        <strong className={`color-${player.color}`}>{player.tokensFinished}/4</strong>
                                    </div>
                                ))}
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}
