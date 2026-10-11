import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import createParty from "../controllers/createPartyController.js";
import getParties from "../controllers/getPartiesController.js";
import getPartyById from "../controllers/getPartyByIdController.js";

const router = express.Router();

router.post("/", authMiddleware, createParty);
router.get("/case/:caseId", authMiddleware, getParties);
router.get("/:id", authMiddleware, getPartyById);

export default router;