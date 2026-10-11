import db from "../config/db.js";

const getCases = async (req, res) => {
    try {
        const cases = await db.orm.public.Case
            .where((c) => c.userId.eq(req.user.id))
            .all();

        res.status(200).json({
            success: true,
            cases
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            success: false,
            message: "Failed to get cases"
        });
    }
};

export default getCases;