import express from "express";
import { getLeaderboard, getHistory } from "../controllers/statsController.js";
const router = express.Router();
router.get("/leaderboard", getLeaderboard);
router.get("/history", getHistory);
export default router;
//# sourceMappingURL=statsRoutes.js.map