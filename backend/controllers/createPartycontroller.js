import db from "../config/db.js";

const createParty = async (req, res) => {
    try {
        const { caseId, name, role } = req.body;

        if (!caseId || !name || !role) {
            return res.status(400).json({
                success: false,
                message: "Case ID, name and role are required"
            });
        }

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

        const party = await db.orm.public.Party.create({
            caseId: Number(caseId),
            name,
            role
        });

        res.status(201).json({
            success: true,
            message: "Party created successfully",
            party
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            success: false,
            message: "Party creation failed"
        });
    }
};

export default createParty;