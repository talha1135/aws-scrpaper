const { validationResult } = require('express-validator');

// Validation middleware for uploaded file
const validateFileUpload = [
    (req, res, next) => {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ errors: [{ msg: 'No file uploaded' }] });
        }
        // Check file size (limit: 10MB)
        if (file.size > 10 * 1024 * 1024) {
            return res.status(400).json({ errors: [{ msg: 'File size exceeds the 10MB limit' }] });
        }
        // Check file type
        if (file.mimetype !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
            return res.status(400).json({ errors: [{ msg: 'Invalid file type. Only .xlsx files are allowed' }] });
        }
        next();
    },
    // Check for validation errors
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

module.exports = { validateFileUpload };
