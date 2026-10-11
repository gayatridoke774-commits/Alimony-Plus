import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import createDependent from "../controllers/createDependentController.js";
import getDependents from "../controllers/getDependentsController.js";

const router = express.Router();

router.post("/", authMiddleware, createDependent);
router.get("/case/:caseId", authMiddleware, getDependents);

export default router;