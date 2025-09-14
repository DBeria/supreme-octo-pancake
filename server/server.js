// server/server.js
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');

dotenv.config();

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.error('MongoDB connection error:', err));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/authors', require('./routes/authors'));

// --- ERROR HANDLING LOGIC ---
// This function handles requests to routes that don't exist (404 Not Found).
const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
};

// This function is the general error handler. It catches any errors that occur.
const errorHandler = (err, req, res, next) => {
    // Set the status code to 500 (Internal Server Error) if it's a normal 200 OK.
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode);
    // Send a JSON response with the error details.
    res.json({
        message: err.message,
        // Only show the detailed stack trace in development mode for security.
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
};

// --- Tell the app to USE the error handlers ---
// It's important that these are placed AFTER your API routes.
app.use(notFound);
app.use(errorHandler);
// ------------------------------------------

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));