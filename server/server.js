// server/server.js - UPDATED AND FIXED

const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db.js');
const cors = require('cors');
const path = require('path');

// FIX: Corrected the path to match the actual filename 'courses.js'.
const courseRoutes = require('./routes/courses.js');
// FIX: Corrected the path to match the actual filename 'users.js'.
const userRoutes = require('./routes/users.js');
const { notFound, errorHandler } = require('./middleware/errorMiddleware.js');

dotenv.config();

connectDB();

const app = express();

app.use(cors());

app.use(express.json());

app.use('/api/courses', courseRoutes);
app.use('/api/users', userRoutes);

// ADD: Health check endpoint for Render/monitoring
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'UP', message: 'Backend is running.' });
});

app.get('/', (req, res) => {
    res.send('API is running...');
});

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5001;

app.listen(PORT, console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`));