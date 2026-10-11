import db from "../config/db.js";

const getProceedings = async (req, res) => {
    try {
        const { caseId } = req.params;

        const caseData = await db.orm.public.Case
            .where((c) => c.id.eq(Number(caseId)))
            .first();

        if (!caseData) {
            return res.status(404).json({
                success: false,
                message: "Case not found"
            });
        }

        if (caseData.userId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }

        const proceedings = await db.orm.public.Proceeding
            .where((p) => p.caseId.eq(Number(caseId)))
            .all();

        res.status(200).json({
            success: true,
            proceedings
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            success: false,
            message: "Failed to get proceedings"
        });
    }
};

export default getProceedings;