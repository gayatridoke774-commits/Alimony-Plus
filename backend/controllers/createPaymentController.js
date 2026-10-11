import db from "../config/db.js";
import { Temporal } from "@js-temporal/polyfill";
import createAuditLog from "../utils/auditLog.js";

const allowedStatuses = ["RECEIVED", "PENDING", "FAILED"];

const createPayment = async (req, res) => {
    try {
        const {
            orderId,
            amount,
            paymentDate,
            status,
            reference,
            notes
        } = req.body;

        // Validate Order ID
        const numericOrderId = Number(orderId);

        if (
            !Number.isInteger(numericOrderId) ||
            numericOrderId <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid Order ID"
            });
        }

        // Validate amount
        const numericAmount = Number(amount);

        if (
            !Number.isFinite(numericAmount) ||
            numericAmount < 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Amount must be a valid non-negative number"
            });
        }

        // Validate payment date
        if (!paymentDate) {
            return res.status(400).json({
                success: false,
                message: "Payment date is required"
            });
        }

        let parsedPaymentDate;

        try {
            parsedPaymentDate = Temporal.Instant.from(
                `${paymentDate}T00:00:00Z`
            );
        } catch {
            return res.status(400).json({
                success: false,
                message: "Invalid payment date"
            });
        }

        // Validate payment status
        const paymentStatus = status || "RECEIVED";

        if (!allowedStatuses.includes(paymentStatus)) {
            return res.status(400).json({
                success: false,
                message: "Invalid payment status"
            });
        }

        // Find order
        const order = await db.orm.public.Order
            .where((o) => o.id.eq(numericOrderId))
            .first();

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        // Find related proceeding
        const proceeding = await db.orm.public.Proceeding
            .where((p) => p.id.eq(order.proceedingId))
            .first();

        if (!proceeding) {
            return res.status(404).json({
                success: false,
                message: "Related proceeding not found"
            });
        }

        // Verify case ownership
        const caseData = await db.orm.public.Case
            .where((c) => c.id.eq(proceeding.caseId))
            .first();

        if (!caseData || caseData.userId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }

        // Create payment
        const payment = await db.orm.public.Payment.create({
            orderId: numericOrderId,
            amount: numericAmount,
            paymentDate: parsedPaymentDate,
            status: paymentStatus,
            reference: reference || null,
            notes: notes || null
        });

        // Create audit log
        await createAuditLog({
            userId: req.user.id,
            action: "PAYMENT_CREATED",
            entityType: "Payment",
            entityId: payment.id,
            metadata: `orderId=${numericOrderId};amount=${numericAmount};status=${paymentStatus}`
        });

        res.status(201).json({
            success: true,
            message: "Payment created successfully",
            payment
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            success: false,
            message: "Payment creation failed"
        });
    }
};

export default createPayment;