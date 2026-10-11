import db from "../config/db.js";

const getProceedingById = async (req, res) => {
    try {
        const { id } = req.params;

        const proceeding = await db.orm.public.Proceeding
            .where((p) => p.id.eq(Number(id)))
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

        res.status(200).json({
            success: true,
            proceeding
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            success: false,
            message: "Failed to get proceeding"
        });
    }
};

export default getProceedingById;