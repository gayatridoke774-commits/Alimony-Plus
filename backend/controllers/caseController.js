import db from "../config/db.js";

const createCase = async (req, res) => {
    try {
        const { title } = req.body;

        if (!title) {
            return res.status(400).json({
                success: false,
                message: "Case title is required"
            });
        }

        const newCase = await db.orm.public.Case.create({
            userId: req.user.id,
            title
        });

        res.status(201).json({
            success: true,
            message: "Case created successfully",
            case: newCase
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            success: false,
            message: "Case creation failed"
        });
    }
};

export default createCase;