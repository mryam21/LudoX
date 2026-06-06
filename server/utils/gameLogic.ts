/*
 * Ludo Game Logic — position encoding per player (relative coords):
 *   -1      = token is in yard (not yet on board)
 *   0-50    = main track (0 = player's own start square, going clockwise)
 *   51-55   = home column leading to centre
 *   56      = finished (reached centre)
 *
 * Absolute track positions: (relPos + colorOffset) % 52
 * Color offsets: red=0, blue=13, yellow=26, green=39
 */

// Offset for each color on the shared 52-square track
export const COLOR_OFFSETS: Record<string, number> = {
    red: 0,
    blue: 13,
    yellow: 26,
    green: 39,
};

// Clockwise Turns
export const COLOR_TURN_ORDER = ["red", "blue", "yellow", "green"];

// Safe squares positions: no capturing.
export const SAFE_ABSOLUTE = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

// Coins awarded per rank, keyed by total number of players
export const COIN_REWARDS: Record<number, number[]> = {
    2: [25, 0],
    3: [50, 25, 0],
    4: [100, 50, 25, 0],
};

// Roll a single six-sided die
export function rollDice(): number {
    return Math.floor(Math.random() * 6) + 1;
}

// Convert a player's relative position to the shared absolute track position
export function relToAbs(relPos: number, color: string): number {
    return (relPos + COLOR_OFFSETS[color]) % 52;
}

// Convert an absolute track position back to relative for a given color
export function absToRel(absPos: number, color: string): number {
    return (absPos - COLOR_OFFSETS[color] + 52) % 52;
}

// Returns the new relative position after a dice roll, or -2 if the move is not allowed
export function getNewPosition(currentRel: number, dice: number): number {
    if (currentRel === 56) return -2;          // already finished
    if (currentRel === -1) return dice === 6 ? 0 : -2;  // need a 6 to leave yard

    const newPos = currentRel + dice;
    return newPos > 56 ? -2 : newPos;          // can't overshoot the centre
}

// Returns the indices of tokens (0-3) that can legally move with this dice value
export function getMovableTokenIndices(tokens: number[], dice: number): number[] {
    const movable: number[] = [];
    for (let i = 0; i < 4; i++) {
        if (getNewPosition(tokens[i], dice) !== -2) {
            movable.push(i);
        }
    }
    return movable;
}

// Returns true if a token at this position cannot be captured
export function isSafeRelPos(relPos: number, color: string): boolean {
    if (relPos < 0 || relPos >= 51) return true;
    return SAFE_ABSOLUTE.has(relToAbs(relPos, color));
}

// Returns only the colors that are in this game, in standard Ludo board order
export function getTurnOrderColors(colors: string[]): string[] {
    return COLOR_TURN_ORDER.filter((c) => colors.includes(c));
}

// Pick a random token index that can legally move; returns -1 if none can
export function pickRandomToken(tokens: number[], dice: number): number {
    const movable = getMovableTokenIndices(tokens, dice);
    if (movable.length === 0) return -1;
    const randomIndex = Math.floor(Math.random() * movable.length);
    return movable[randomIndex];
}

// Returns current time as HH:MM string for log/chat timestamps
export function timestamp(): string {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
}

// Returns how many coins a player earns based on their finishing rank
export function coinsForRank(rank: number, totalPlayers: number): number {
    const table = COIN_REWARDS[totalPlayers];
    return table?.[rank - 1] ?? 0;
}
