const successResponse = (res, message, data = {}) => {
    return res.status(200).json({
        success: true,
        message,
        data,
    });
};

const errorResponse = (res, message, statusCode = 500, errors = []) => {
    return res.status(statusCode).json({
        success: false,
        message,
        errors,
    });
};

module.exports = { successResponse, errorResponse };
