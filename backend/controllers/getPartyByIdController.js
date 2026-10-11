import db from "../config/db.js";

const getPartyById = async (req, res) => {
    try {
        const { id } = req.params;

        const party = await db.orm.public.Party
            .where((p) => p.id.eq(Number(id)))
            .first();

        if (!party) {
            return res.status(404).json({
                success: false,
                message: "Party not found"
            });
        }

        const caseData = await db.orm.public.Case
            .where((c) => c.id.eq(party.caseId))
            .first();

        if (!caseData || caseData.userId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }

        res.status(200).json({
            success: true,
            party
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            success: false,
            message: "Failed to get party"
        });
    }
};

export default getPartyById;