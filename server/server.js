// File: server/server.js

const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const courseRoutes = require('./routes/courseRoutes');
const userRoutes = require('./routes/userRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const path = require('path');
const cors = require('cors');

dotenv.config();

connectDB();

const app = express();

// Enable CORS for all routes, allowing your Netlify frontend to connect.
app.use(cors());

app.use(express.json());

// --- API Routes ---
// The server's only job is to handle these routes.
app.use('/api/courses', courseRoutes);
app.use('/api/users', userRoutes);

// --- THIS IS THE FIX ---
// The incorrect code block that tried to serve the frontend has been completely removed.
// Now, the server will not crash in a production environment.

// The root path now simply confirms the API is running.
app.get('/', (req, res) => {
    res.send('API is running...');
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5001;

app.listen(PORT, console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`));