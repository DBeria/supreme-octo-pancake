// File: server/server.js

const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// THIS IS THE FIX: Added '.js' to the end of the file paths.
const courseRoutes = require('./routes/courseRoutes.js');
const userRoutes = require('./routes/userRoutes.js');

const { notFound, errorHandler } = require('./middleware/errorMiddleware.js');
const path = require('path');
const cors = require('cors');

dotenv.config();

connectDB();

const app = express();

// Enable CORS for all routes, allowing your Netlify frontend to connect.
app.use(cors());

app.use(express.json());

// --- API Routes ---
app.use('/api/courses', courseRoutes);
app.use('/api/users', userRoutes);

// The root path now simply confirms the API is running.
app.get('/', (req, res) => {
    res.send('API is running...');
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5001;

app.listen(PORT, console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`));