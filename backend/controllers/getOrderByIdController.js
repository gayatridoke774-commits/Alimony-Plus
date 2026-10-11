import db from "../config/db.js";

const getOrderById = async (req, res) => {
    try {
        const { id } = req.params;

        const order = await db.orm.public.Order
            .where((o) => o.id.eq(Number(id)))
            .first();

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        const proceeding = await db.orm.public.Proceeding
            .where((p) => p.id.eq(order.proceedingId))
            .first();

        const caseData = await db.orm.public.Case
            .where((c) => c.id.eq(proceeding.caseId))
            .first();

        if (!caseData || caseData.userId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }

        res.status(200).json({
            success: true,
            order
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            success: false,
            message: "Failed to get order"
        });
    }
};

export default getOrderById;