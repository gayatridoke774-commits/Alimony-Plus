import db from "../config/db.js";

const getOrders = async (req, res) => {
    try {
        const { proceedingId } = req.params;

        const proceeding = await db.orm.public.Proceeding
            .where((p) => p.id.eq(Number(proceedingId)))
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

        const orders = await db.orm.public.Order
            .where((o) => o.proceedingId.eq(Number(proceedingId)))
            .all();

        res.status(200).json({
            success: true,
            orders
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            success: false,
            message: "Failed to get orders"
        });
    }
};

export default getOrders;