import db from "../config/db.js";

const createAuditLog = async ({
    userId,
    action,
    entityType,
    entityId = null,
    metadata = null
}) => {
    try {
        await db.orm.public.AuditLog.create({
            userId,
            action,
            entityType,
            entityId,
            metadata
        });
    } catch (error) {
        console.log("Audit log creation failed:", error);
    }
};

export default createAuditLog;