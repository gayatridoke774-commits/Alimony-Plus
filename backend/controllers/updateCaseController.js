import db from "../config/db.js";

const updateCase = async (req, res) => {
    try {
        const { id } = req.params;
        const { title } = req.body;

        if (!title) {
            return res.status(400).json({
                success: false,
                message: "Case title is required"
            });
        }

        const caseData = await db.orm.public.Case
            .where({ id: Number(id) })
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

        const updatedCase = await db.orm.public.Case
            .where({ id: Number(id) })
            .update({ title });

        res.status(200).json({
            success: true,
            message: "Case updated successfully",
            case: updatedCase
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            success: false,
            message: "Case update failed"
        });
    }
};

export default updateCase;