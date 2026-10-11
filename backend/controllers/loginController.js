import bcrypt from "bcrypt";
import db from "../config/db.js";
import jwt from "jsonwebtoken";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        if (!emailRegex.test(normalizedEmail)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email address"
            });
        }

        const user = await db.orm.public.User
            .where((u) => u.email.eq(normalizedEmail))
            .first();

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const isPasswordCorrect = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordCorrect) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            success: false,
            message: "Login failed"
        });
    }
};

export default loginUser;