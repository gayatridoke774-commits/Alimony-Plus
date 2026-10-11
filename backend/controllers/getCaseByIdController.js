import db from "../config/db.js";

const getCaseById = async (req, res) => {
    try {
        const { id } = req.params;

        const caseData = await db.orm.public.Case
            .where((c) => c.id.eq(Number(id)))
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

        res.status(200).json({
            success: true,
            case: caseData
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            success: false,
            message: "Failed to get case"
        });
    }
};

export default getCaseById;