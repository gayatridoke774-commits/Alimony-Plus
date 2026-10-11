import bcrypt from "bcrypt";
import db from "../config/db.js";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email and password are required"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        if (!emailRegex.test(normalizedEmail)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email address"
            });
        }

        const existingUser = await db.orm.public.User.first({
            email: normalizedEmail
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "User already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await db.orm.public.User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword
        });

        res.status(201).json({
            success: true,
            message: "User registered successfully",
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
            message: "Registration failed"
        });
    }
};

export default registerUser;