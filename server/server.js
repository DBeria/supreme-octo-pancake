// server/server.js - FIXED

const express = require('express');
const dotenv = require('dotenv');
const Stripe = require('stripe');
const cors = require('cors');
const path = require('path');

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const connectDB = require('./config/db.js');

// Routes
const courseRoutes = require('./routes/courses.js');
const userRoutes = require('./routes/users.js');
const authRoutes = require('./routes/auth.js'); // <-- ADD THIS

// Error middlewares
const { notFound, errorHandler } = require('./middleware/errorMiddleware.js');

connectDB();

const app = express();

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/courses', courseRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes); // <-- MOUNT AUTH ROUTES

// Health check
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'UP', message: 'Backend is running.' });
});

app.get('/', (req, res) => {
    res.send('API is running...');
});

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
