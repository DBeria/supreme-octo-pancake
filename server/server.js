// File: server/server.js

const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const cors = require('cors');
const connectDB = require('./config/db.js');

// --- THIS IS THE FIX ---
// We use the built-in __dirname variable to create absolute paths
// to the required modules. This is the most reliable method for production.
const courseRoutes = require(path.join(__dirname, 'routes', 'courseRoutes.js'));
const userRoutes = require(path.join(__dirname, 'routes', 'userRoutes.js'));
const { notFound, errorHandler } = require(path.join(__dirname, 'middleware', 'errorMiddleware.js'));

dotenv.config();

connectDB();

const app = express();

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/courses', courseRoutes);
app.use('/api/users', userRoutes);

app.get('/', (req, res) => {
    res.send('API is running...');
});

// Error handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5001;

app.listen(PORT, console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`));