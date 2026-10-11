import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";
import calculatorController from "../controllers/calculatorController.js";

const router = express.Router();

router.post(
    "/run",
    authMiddleware,
    calculatorController
);

export default router;