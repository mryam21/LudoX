import express from "express";
import { finishGame } from "../controllers/gameController.js";
const router = express.Router();
router.post("/finish", finishGame);
export default router;
//# sourceMappingURL=gameRoutes.js.map