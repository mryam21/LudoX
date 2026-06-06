import mongoose from "mongoose";
export declare const Game: mongoose.Model<{
    total_players: number;
    players: mongoose.Types.DocumentArray<{
        username?: string | null | undefined;
        user_id?: mongoose.Types.ObjectId | null | undefined;
        rank?: number | null | undefined;
        coins_earned?: number | null | undefined;
        color?: "red" | "blue" | "green" | "yellow" | null | undefined;
    }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, any, {
        username?: string | null | undefined;
        user_id?: mongoose.Types.ObjectId | null | undefined;
        rank?: number | null | undefined;
        coins_earned?: number | null | undefined;
        color?: "red" | "blue" | "green" | "yellow" | null | undefined;
    }> & {
        username?: string | null | undefined;
        user_id?: mongoose.Types.ObjectId | null | undefined;
        rank?: number | null | undefined;
        coins_earned?: number | null | undefined;
        color?: "red" | "blue" | "green" | "yellow" | null | undefined;
    }>;
    status: "waiting" | "playing" | "finished";
    started_at?: NativeDate | null | undefined;
    finished_at?: NativeDate | null | undefined;
}, {}, {}, {}, mongoose.Document<unknown, {}, {
    total_players: number;
    players: mongoose.Types.DocumentArray<{
        username?: string | null | undefined;
        user_id?: mongoose.Types.ObjectId | null | undefined;
        rank?: number | null | undefined;
        coins_earned?: number | null | undefined;
        color?: "red" | "blue" | "green" | "yellow" | null | undefined;
    }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, any, {
        username?: string | null | undefined;
        user_id?: mongoose.Types.ObjectId | null | undefined;
        rank?: number | null | undefined;
        coins_earned?: number | null | undefined;
        color?: "red" | "blue" | "green" | "yellow" | null | undefined;
    }> & {
        username?: string | null | undefined;
        user_id?: mongoose.Types.ObjectId | null | undefined;
        rank?: number | null | undefined;
        coins_earned?: number | null | undefined;
        color?: "red" | "blue" | "green" | "yellow" | null | undefined;
    }>;
    status: "waiting" | "playing" | "finished";
    started_at?: NativeDate | null | undefined;
    finished_at?: NativeDate | null | undefined;
}, {}, mongoose.DefaultSchemaOptions> & {
    total_players: number;
    players: mongoose.Types.DocumentArray<{
        username?: string | null | undefined;
        user_id?: mongoose.Types.ObjectId | null | undefined;
        rank?: number | null | undefined;
        coins_earned?: number | null | undefined;
        color?: "red" | "blue" | "green" | "yellow" | null | undefined;
    }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, any, {
        username?: string | null | undefined;
        user_id?: mongoose.Types.ObjectId | null | undefined;
        rank?: number | null | undefined;
        coins_earned?: number | null | undefined;
        color?: "red" | "blue" | "green" | "yellow" | null | undefined;
    }> & {
        username?: string | null | undefined;
        user_id?: mongoose.Types.ObjectId | null | undefined;
        rank?: number | null | undefined;
        coins_earned?: number | null | undefined;
        color?: "red" | "blue" | "green" | "yellow" | null | undefined;
    }>;
    status: "waiting" | "playing" | "finished";
    started_at?: NativeDate | null | undefined;
    finished_at?: NativeDate | null | undefined;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any>, {}, {}, {}, {}, mongoose.DefaultSchemaOptions, {
    total_players: number;
    players: mongoose.Types.DocumentArray<{
        username?: string | null | undefined;
        user_id?: mongoose.Types.ObjectId | null | undefined;
        rank?: number | null | undefined;
        coins_earned?: number | null | undefined;
        color?: "red" | "blue" | "green" | "yellow" | null | undefined;
    }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, any, {
        username?: string | null | undefined;
        user_id?: mongoose.Types.ObjectId | null | undefined;
        rank?: number | null | undefined;
        coins_earned?: number | null | undefined;
        color?: "red" | "blue" | "green" | "yellow" | null | undefined;
    }> & {
        username?: string | null | undefined;
        user_id?: mongoose.Types.ObjectId | null | undefined;
        rank?: number | null | undefined;
        coins_earned?: number | null | undefined;
        color?: "red" | "blue" | "green" | "yellow" | null | undefined;
    }>;
    status: "waiting" | "playing" | "finished";
    started_at?: NativeDate | null | undefined;
    finished_at?: NativeDate | null | undefined;
}, mongoose.Document<unknown, {}, mongoose.FlatRecord<{
    total_players: number;
    players: mongoose.Types.DocumentArray<{
        username?: string | null | undefined;
        user_id?: mongoose.Types.ObjectId | null | undefined;
        rank?: number | null | undefined;
        coins_earned?: number | null | undefined;
        color?: "red" | "blue" | "green" | "yellow" | null | undefined;
    }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, any, {
        username?: string | null | undefined;
        user_id?: mongoose.Types.ObjectId | null | undefined;
        rank?: number | null | undefined;
        coins_earned?: number | null | undefined;
        color?: "red" | "blue" | "green" | "yellow" | null | undefined;
    }> & {
        username?: string | null | undefined;
        user_id?: mongoose.Types.ObjectId | null | undefined;
        rank?: number | null | undefined;
        coins_earned?: number | null | undefined;
        color?: "red" | "blue" | "green" | "yellow" | null | undefined;
    }>;
    status: "waiting" | "playing" | "finished";
    started_at?: NativeDate | null | undefined;
    finished_at?: NativeDate | null | undefined;
}>, {}, mongoose.DefaultSchemaOptions> & mongoose.FlatRecord<{
    total_players: number;
    players: mongoose.Types.DocumentArray<{
        username?: string | null | undefined;
        user_id?: mongoose.Types.ObjectId | null | undefined;
        rank?: number | null | undefined;
        coins_earned?: number | null | undefined;
        color?: "red" | "blue" | "green" | "yellow" | null | undefined;
    }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, any, {
        username?: string | null | undefined;
        user_id?: mongoose.Types.ObjectId | null | undefined;
        rank?: number | null | undefined;
        coins_earned?: number | null | undefined;
        color?: "red" | "blue" | "green" | "yellow" | null | undefined;
    }> & {
        username?: string | null | undefined;
        user_id?: mongoose.Types.ObjectId | null | undefined;
        rank?: number | null | undefined;
        coins_earned?: number | null | undefined;
        color?: "red" | "blue" | "green" | "yellow" | null | undefined;
    }>;
    status: "waiting" | "playing" | "finished";
    started_at?: NativeDate | null | undefined;
    finished_at?: NativeDate | null | undefined;
}> & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>>;
//# sourceMappingURL=Game.d.ts.map