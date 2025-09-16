// Handles requests for routes that don't exist (404 Not Found)
const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error); // Passes the error to the next middleware
};

// General error handler that catches all errors passed by `next(error)`
const errorHandler = (err, req, res, next) => {
    // If the status code is 200 (OK), set it to 500 (Internal Server Error) as a default
    let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    let message = err.message;

    // Specific check for Mongoose CastError (e.g., invalid ObjectId)
    if (err.name === 'CastError' && err.kind === 'ObjectId') {
        statusCode = 404;
        message = 'Resource not found';
    }

    res.status(statusCode).json({
        message: message,
        // Show the stack trace only if in development mode for security reasons
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
};

module.exports = { notFound, errorHandler };