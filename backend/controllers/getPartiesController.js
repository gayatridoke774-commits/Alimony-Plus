import db from "../config/db.js";

const getParties = async (req, res) => {
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

        const parties = await db.orm.public.Party
            .where((p) => p.caseId.eq(Number(caseId)))
            .all();

        res.status(200).json({
            success: true,
            parties
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            success: false,
            message: "Failed to get parties"
        });
    }
};

export default getParties;