import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Only PDF, JPG, PNG, DOC and DOCX files are allowed"), false);
    }
};

const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024
    },
    fileFilter
});

export default upload;