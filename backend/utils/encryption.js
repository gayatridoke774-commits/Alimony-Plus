import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

const getEncryptionKey = () => {
    const key = process.env.FILE_ENCRYPTION_KEY;

    console.log("Key length:", key?.length);
    console.log("Key bytes:", key ? Buffer.from(key, "hex").length : 0);

    if (!key) {
        throw new Error("FILE_ENCRYPTION_KEY is not configured");
    }

    return Buffer.from(key, "hex");
};

export const encryptFile = (buffer) => {
    const key = getEncryptionKey();

    const iv = crypto.randomBytes(12);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([
        cipher.update(buffer),
        cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    return {
        encrypted,
        iv,
        authTag
    };
};

export const decryptFile = (encrypted, iv, authTag) => {
    const key = getEncryptionKey();

    const decipher = crypto.createDecipheriv(
        ALGORITHM,
        key,
        iv
    );

    decipher.setAuthTag(authTag);

    return Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
    ]);
};