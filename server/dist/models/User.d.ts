import mongoose from "mongoose";
export declare const User: mongoose.Model<{
    username: string;
    password: string;
    dob: NativeDate;
    coins: number;
    total_played: number;
    wins: number;
}, {}, {}, {}, mongoose.Document<unknown, {}, {
    username: string;
    password: string;
    dob: NativeDate;
    coins: number;
    total_played: number;
    wins: number;
}, {}, mongoose.DefaultSchemaOptions> & {
    username: string;
    password: string;
    dob: NativeDate;
    coins: number;
    total_played: number;
    wins: number;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any>, {}, {}, {}, {}, mongoose.DefaultSchemaOptions, {
    username: string;
    password: string;
    dob: NativeDate;
    coins: number;
    total_played: number;
    wins: number;
}, mongoose.Document<unknown, {}, mongoose.FlatRecord<{
    username: string;
    password: string;
    dob: NativeDate;
    coins: number;
    total_played: number;
    wins: number;
}>, {}, mongoose.DefaultSchemaOptions> & mongoose.FlatRecord<{
    username: string;
    password: string;
    dob: NativeDate;
    coins: number;
    total_played: number;
    wins: number;
}> & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>>;
//# sourceMappingURL=User.d.ts.map