import db from "../config/db.js";

const createDependent = async (req, res) => {
    try {
        const { caseId, name, relation, age } = req.body;

        if (!caseId || !name) {
            return res.status(400).json({
                success: false,
                message: "Case ID and name are required"
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

        const dependent = await db.orm.public.Dependent.create({
            caseId: Number(caseId),
            name,
            relation: relation || null,
            age: age ? Number(age) : null
        });

        res.status(201).json({
            success: true,
            message: "Dependent created successfully",
            dependent
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            success: false,
            message: "Dependent creation failed"
        });
    }
};

export default createDependent;