import fs from "fs/promises";

import db from "../config/db.js";
import { decryptFile } from "../utils/encryption.js";
import setRlsUser from "../utils/rlsContext.js";

const downloadDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const numericDocumentId = Number(id);

        if (!Number.isInteger(numericDocumentId) || numericDocumentId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid Document ID"
            });
        }

        const document = await db.transaction(async (tx) => {
            await setRlsUser(tx, db, req.user.id);

            const documentData = await tx.orm.public.Document
                .where((d) => d.id.eq(numericDocumentId))
                .first();

            if (!documentData) {
                throw new Error("DOCUMENT_NOT_FOUND");
            }

            const caseData = await tx.orm.public.Case
                .where((c) => c.id.eq(documentData.caseId))
                .first();

            if (!caseData) {
                throw new Error("CASE_NOT_FOUND");
            }

            if (caseData.userId !== req.user.id) {
                throw new Error("ACCESS_DENIED");
            }

            return documentData;
        });

        const encryptedFile = await fs.readFile(
            document.storagePath
        );

        const iv = encryptedFile.subarray(0, 12);
        const authTag = encryptedFile.subarray(12, 28);
        const encrypted = encryptedFile.subarray(28);

        const decryptedFile = decryptFile(
            encrypted,
            iv,
            authTag
        );

        res.setHeader("Content-Type", document.mimeType);

        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${document.originalName}"`
        );

        res.send(decryptedFile);

    } catch (error) {
        console.log(error);

        if (error.message === "DOCUMENT_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Document not found"
            });
        }

        if (error.message === "CASE_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Related case not found"
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
            message: "Document download failed"
        });
    }
};

export default downloadDocument;