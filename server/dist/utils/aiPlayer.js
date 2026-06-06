import { getMovableTokenIndices } from "./gameLogic.js";
// Picks which token the AI should move given the current board state.
// Prefers tokens that are already on the board over tokens still in the yard,
// and prefers tokens that are closer to finishing.
export function pickAIMove(tokens, diceValue) {
    const movable = getMovableTokenIndices(tokens, diceValue);
    if (movable.length === 0)
        return -1;
    // Score each movable token — higher is better
    let bestIdx = movable[0];
    let bestScore = -Infinity;
    for (const idx of movable) {
        const pos = tokens[idx];
        let score = 0;
        if (pos === -1) {
            // Token is in the yard — only movable if dice is 6, low priority
            score = 1;
        }
        else {
            // Prefer tokens further along the track
            score = pos + 10;
        }
        if (score > bestScore) {
            bestScore = score;
            bestIdx = idx;
        }
    }
    return bestIdx;
}
//# sourceMappingURL=aiPlayer.js.map