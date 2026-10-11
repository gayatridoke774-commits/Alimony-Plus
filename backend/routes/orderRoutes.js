import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import createOrder from "../controllers/createOrderController.js";
import getOrders from "../controllers/getOrdersController.js";
import getOrderById from "../controllers/getOrderByIdController.js";

const router = express.Router();

router.post("/", authMiddleware, createOrder);
router.get("/proceeding/:proceedingId", authMiddleware, getOrders);
router.get("/:id", authMiddleware, getOrderById);

export default router;