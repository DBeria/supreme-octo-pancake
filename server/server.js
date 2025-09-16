const path = require('path');
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// Route files
const courseRoutes = require('./routes/courses');
const authRoutes = require('./routes/auth');
const authorRoutes = require('./routes/authors');
const userRoutes = require('./routes/users'); // Assuming you have this file

dotenv.config();
connectDB();

const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// CORS configuration to allow requests from your frontend
const corsOptions = {
    origin: [
        'http://localhost:5173',
        'https://pocus-world-backend.onrender.com',
        'https://pocus-world.netlify.app'
    ],
    credentials: true,
};
app.use(cors(corsOptions));

// Mount routers for all API endpoints
app.use('/api/courses', courseRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/authors', authorRoutes);
app.use('/api/users', userRoutes);

// --- Production Build Logic ---
// This part serves your React app when you are not in development
if (process.env.NODE_ENV === 'production') {
    const __dirname = path.resolve();
    app.use(express.static(path.join(__dirname, '/client/dist')));
    
    app.get('*', (req, res) => 
        res.sendFile(path.resolve(__dirname, 'client', 'dist', 'index.html'))
    );
} else {
    app.get('/', (req, res) => {
        res.send('API is running....');
    });
}

// --- Error Handling Middleware ---
// These must be the last pieces of middleware loaded
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`));