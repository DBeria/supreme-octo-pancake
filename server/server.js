// File: server/server.js

const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db.js');
const path = require('path'); // Import the path module
const cors = require('cors');

// --- THIS IS THE FIX ---
// We create robust, absolute paths to the route files.
const __dirname = path.resolve();
const courseRoutes = require(path.join(__dirname, 'server', 'routes', 'courseRoutes.js'));
const userRoutes = require(path.join(__dirname, 'server', 'routes', 'userRoutes.js'));
const { notFound, errorHandler } = require(path.join(__dirname, 'server', 'middleware', 'errorMiddleware.js'));

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