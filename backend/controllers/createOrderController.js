import db from "../config/db.js";
import { Temporal } from "@js-temporal/polyfill";
import createAuditLog from "../utils/auditLog.js";

const createOrder = async (req, res) => {
    try {
        const {
            proceedingId,
            orderType,
            orderDate,
            amount,
            description
        } = req.body;

        const numericProceedingId = Number(proceedingId);

        if (!Number.isInteger(numericProceedingId) || numericProceedingId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid Proceeding ID"
            });
        }

        let numericAmount = null;

        if (amount !== undefined && amount !== null && amount !== "") {
            numericAmount = Number(amount);

            if (!Number.isFinite(numericAmount) || numericAmount < 0) {
                return res.status(400).json({
                    success: false,
                    message: "Amount must be a valid non-negative number"
                });
            }
        }

        let parsedOrderDate = null;

        if (orderDate !== undefined && orderDate !== null && orderDate !== "") {
            try {
                parsedOrderDate = Temporal.Instant.from(
                    `${orderDate}T00:00:00Z`
                );
            } catch {
                return res.status(400).json({
                    success: false,
                    message: "Invalid order date"
                });
            }
        }

        const proceeding = await db.orm.public.Proceeding
            .where((p) => p.id.eq(numericProceedingId))
            .first();

        if (!proceeding) {
            return res.status(404).json({
                success: false,
                message: "Proceeding not found"
            });
        }

        const caseData = await db.orm.public.Case
            .where((c) => c.id.eq(proceeding.caseId))
            .first();

        if (!caseData || caseData.userId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }

        const order = await db.orm.public.Order.create({
            proceedingId: numericProceedingId,
            orderType: orderType || null,
            orderDate: parsedOrderDate,
            amount: numericAmount,
            description: description || null
        });

        await createAuditLog({
            userId: req.user.id,
            action: "ORDER_CREATED",
            entityType: "Order",
            entityId: order.id,
            metadata: `proceedingId=${numericProceedingId};amount=${numericAmount};orderType=${orderType || ""}`
        });

        res.status(201).json({
            success: true,
            message: "Order created successfully",
            order
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            success: false,
            message: "Order creation failed"
        });
    }
};

export default createOrder;