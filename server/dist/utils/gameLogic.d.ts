export declare const COLOR_OFFSETS: Record<string, number>;
export declare const COLOR_TURN_ORDER: string[];
export declare const SAFE_ABSOLUTE: Set<number>;
export declare const COIN_REWARDS: Record<number, number[]>;
export declare function rollDice(): number;
export declare function relToAbs(relPos: number, color: string): number;
export declare function absToRel(absPos: number, color: string): number;
export declare function getNewPosition(currentRel: number, dice: number): number;
export declare function getMovableTokenIndices(tokens: number[], dice: number): number[];
export declare function isSafeRelPos(relPos: number, color: string): boolean;
export declare function getTurnOrderColors(colors: string[]): string[];
export declare function pickRandomToken(tokens: number[], dice: number): number;
export declare function timestamp(): string;
export declare function coinsForRank(rank: number, totalPlayers: number): number;
//# sourceMappingURL=gameLogic.d.ts.map