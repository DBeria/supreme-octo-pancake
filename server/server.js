const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// Import route files
const courseRoutes = require('./routes/courses');
const userRoutes = require('./routes/users');
const authRoutes = require('./routes/auth');
const authorRoutes = require('./routes/authors');

dotenv.config();

connectDB();

const app = express();

// CORS configuration
const corsOptions = {
    origin: [
        'http://localhost:5173',
        'https://pocus-world-backend.onrender.com',
        'https://pocus-world.netlify.app' 
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.use(express.json());

// API Routes
app.use('/api/courses', courseRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/authors', authorRoutes);


// Serve frontend build in production
// The line 'const __dirname = path.resolve();' has been removed from here.
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '/client/dist')));
    
    app.get('*', (req, res) => 
        res.sendFile(path.resolve(__dirname, 'client', 'dist', 'index.html'))
    );
} else {
    app.get('/', (req, res) => {
        res.send('API is running...');
    });
}


// Custom error handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`));