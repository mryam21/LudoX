import express from "express";
import { login, signup, getMe, updateProfile } from "../controllers/authController.js";
const router = express.Router();
router.post("/login", login);
router.post("/signup", signup);
router.get("/me", getMe);
router.put("/update-profile", updateProfile);
export default router;
//# sourceMappingURL=authRoutes.js.map