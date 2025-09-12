import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';
import path from 'path';

// Import your existing route files
import courseRoutes from './routes/courses.js';
import userRoutes from './routes/users.js';
import authRoutes from './routes/auth.js';
import authorRoutes from './routes/authors.js';

dotenv.config();

connectDB();

const app = express();

// CORS configuration - REMEMBER to add your Netlify URL
const corsOptions = {
    origin: [
        'http://localhost:5173', 
        'https://pocus-world-backend.onrender.com',
        'https://your-netlify-site-url.netlify.app' // Add your Netlify URL here
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.use(express.json());

// API Routes - This is the corrected section
app.use('/api/courses', courseRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/authors', authorRoutes);

// Serve frontend build in production
const __dirname = path.resolve();
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