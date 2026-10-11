import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

import db from "../config/db.js";
import { encryptFile } from "../utils/encryption.js";
import setRlsUser from "../utils/rlsContext.js";
import createAuditLog from "../utils/auditLog.js";

const uploadDocument = async (req, res) => {
    let storagePath = null;

    try {
        const { caseId, documentType } = req.body;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Document file is required"
            });
        }

        const numericCaseId = Number(caseId);

        if (!Number.isInteger(numericCaseId) || numericCaseId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid Case ID"
            });
        }

        const { encrypted, iv, authTag } = encryptFile(req.file.buffer);

        const fileName = `${crypto.randomUUID()}.enc`;

        const uploadDir = path.join(process.cwd(), "uploads");

        await fs.mkdir(uploadDir, { recursive: true });

        storagePath = path.join(uploadDir, fileName);

        const encryptedFile = Buffer.concat([
            iv,
            authTag,
            encrypted
        ]);

        await fs.writeFile(storagePath, encryptedFile);

        const document = await db.transaction(async (tx) => {
            await setRlsUser(tx, db, req.user.id);

            const caseData = await tx.orm.public.Case
                .where((c) => c.id.eq(numericCaseId))
                .first();

            if (!caseData) {
                throw new Error("CASE_NOT_FOUND");
            }

            if (caseData.userId !== req.user.id) {
                throw new Error("ACCESS_DENIED");
            }

            const newDocument = await tx.orm.public.Document.create({
                caseId: numericCaseId,
                fileName,
                originalName: req.file.originalname,
                mimeType: req.file.mimetype,
                fileSize: req.file.size,
                storagePath,
                documentType: documentType || null,
                uploadedBy: req.user.id
            });

            return newDocument;
        });

        // Create audit log
        await createAuditLog({
            userId: req.user.id,
            action: "DOCUMENT_UPLOADED",
            entityType: "Document",
            entityId: document.id,
            metadata: `caseId=${numericCaseId};documentType=${documentType || ""}`
        });

        res.status(201).json({
            success: true,
            message: "Document uploaded and encrypted successfully",
            document: {
                id: document.id,
                originalName: document.originalName,
                documentType: document.documentType,
                fileSize: document.fileSize,
                mimeType: document.mimeType,
                createdAt: document.createdAt
            }
        });

    } catch (error) {
        console.log(error);

        if (storagePath) {
            try {
                await fs.unlink(storagePath);
            } catch (fileError) {
                console.log("Encrypted file cleanup failed:", fileError);
            }
        }

        if (error.message === "CASE_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Case not found"
            });
        }

        if (error.message === "ACCESS_DENIED") {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }

        res.status(500).json({
            success: false,
            message: "Document upload failed"
        });
    }
};

export default uploadDocument;