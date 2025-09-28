// server/server.js - FIXED

const express = require('express');
const dotenv = require('dotenv'); // <--- Missing in your version
const Stripe = require('stripe');
const cors = require('cors');
const path = require('path');

dotenv.config(); // <--- Must be called BEFORE using process.env

// Initialize Stripe using environment variable
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY); // <--- Use your .env variable

const connectDB = require('./config/db.js');

// Routes
const courseRoutes = require('./routes/courses.js');
const userRoutes = require('./routes/users.js');

// Error middlewares
const { notFound, errorHandler } = require('./middleware/errorMiddleware.js');

connectDB(); // Connect to MongoDB

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API routes
app.use('/api/courses', courseRoutes);
app.use('/api/users', userRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'UP', message: 'Backend is running.' });
});

// Root endpoint
app.get('/', (req, res) => {
    res.send('API is running...');
});

// Error handlers
app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
