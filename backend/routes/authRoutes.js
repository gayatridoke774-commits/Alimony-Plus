import express from "express";
import registerUser from "../controllers/authController.js";
import loginUser from "../controllers/loginController.js";
import loginRateLimiter from "../middleware/loginRateLimiter.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginRateLimiter, loginUser);

export default router;