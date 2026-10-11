import db from "../config/db.js";

const deleteCase = async (req, res) => {
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

        await db.orm.public.Case
            .where({ id: Number(id) })
            .delete();

        res.status(200).json({
            success: true,
            message: "Case deleted successfully"
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            success: false,
            message: "Case deletion failed"
        });
    }
};

export default deleteCase;