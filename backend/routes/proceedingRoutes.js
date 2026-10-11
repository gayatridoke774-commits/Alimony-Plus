import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import createProceeding from "../controllers/createProceedingController.js";
import getProceedings from "../controllers/getProceedingsController.js";
import getProceedingById from "../controllers/getProceedingByIdController.js";

const router = express.Router();

router.post("/", authMiddleware, createProceeding);
router.get("/case/:caseId", authMiddleware, getProceedings);
router.get("/:id", authMiddleware, getProceedingById);

export default router;