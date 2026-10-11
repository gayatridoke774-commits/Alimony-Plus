import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import createPayment from "../controllers/createPaymentController.js";
import getPayments from "../controllers/getPaymentsController.js";
import getPaymentById from "../controllers/getPaymentByIdController.js";

const router = express.Router();

router.post("/", authMiddleware, createPayment);
router.get("/order/:orderId", authMiddleware, getPayments);
router.get("/:id", authMiddleware, getPaymentById);

export default router;