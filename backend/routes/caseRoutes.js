import express from "express";
import createCase from "../controllers/caseController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import getCases from "../controllers/getCasesController.js";
import updateCase from "../controllers/updateCaseController.js";
import deleteCase from "../controllers/deleteCaseController.js";

import getCaseById from "../controllers/getCaseByIdController.js";

const router = express.Router();

router.post("/", authMiddleware, createCase);
router.get("/", authMiddleware, getCases);
router.get("/:id", authMiddleware, getCaseById);
router.put("/:id", authMiddleware, updateCase);
router.delete("/:id", authMiddleware, deleteCase);


export default router;